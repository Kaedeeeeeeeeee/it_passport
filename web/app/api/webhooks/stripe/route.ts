import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe";
import type { ProfileRow } from "@/lib/auth";

export const runtime = "nodejs";
export const maxDuration = 30;

type SubscriptionStatus = ProfileRow["subscription_status"];

/**
 * Map Stripe subscription statuses onto the enum we store on `profiles`.
 *
 * Stripe statuses:  incomplete | incomplete_expired | trialing | active |
 *                   past_due  | canceled            | unpaid   | paused
 *
 * - `trialing` and `active` mean Pro is unlocked.
 * - `past_due` and `unpaid` block fresh entitlement but keep the customer
 *   record around so we can prompt to update payment.
 * - `canceled`, `incomplete_expired` reflect a terminated subscription.
 * - `incomplete` and `paused` map back to free until a successful payment.
 */
function mapStripeStatus(s: Stripe.Subscription.Status): SubscriptionStatus {
  switch (s) {
    case "active":
      return "active";
    case "trialing":
      return "trialing";
    case "past_due":
    case "unpaid":
      return "past_due";
    case "canceled":
    case "incomplete_expired":
      return "canceled";
    case "incomplete":
    case "paused":
    default:
      return "free";
  }
}

function epochToIso(epoch: number | null | undefined): string | null {
  if (!epoch || typeof epoch !== "number") return null;
  return new Date(epoch * 1000).toISOString();
}

function customerIdOf(
  customer: string | Stripe.Customer | Stripe.DeletedCustomer | null,
): string | null {
  if (!customer) return null;
  return typeof customer === "string" ? customer : customer.id;
}

/**
 * Stripe's TS types occasionally diverge from the runtime payload depending
 * on the API version pinned by the SDK. `current_period_end` and
 * `trial_end` live on the `Subscription` object at runtime — but we read
 * them defensively to stay version-tolerant.
 */
function readSubscriptionPeriodEnd(sub: Stripe.Subscription): number | null {
  const value = (sub as unknown as { current_period_end?: unknown })
    .current_period_end;
  return typeof value === "number" ? value : null;
}

function readSubscriptionTrialEnd(sub: Stripe.Subscription): number | null {
  const value = (sub as unknown as { trial_end?: unknown }).trial_end;
  return typeof value === "number" ? value : null;
}

async function handleCheckoutCompleted(
  session: Stripe.Checkout.Session,
): Promise<void> {
  const customerId = customerIdOf(session.customer);
  const userId = session.client_reference_id;
  if (!customerId || !userId) {
    console.error("[stripe webhook] checkout.session.completed missing data", {
      hasCustomer: !!customerId,
      hasUserId: !!userId,
    });
    return;
  }
  const sb = supabaseAdmin();
  await sb
    .from("profiles")
    .update({ stripe_customer_id: customerId })
    .eq("id", userId);
}

async function handleSubscriptionUpsert(
  sub: Stripe.Subscription,
): Promise<void> {
  const customerId = customerIdOf(sub.customer);
  if (!customerId) return;

  const status = mapStripeStatus(sub.status);
  const currentPeriodEnd = epochToIso(readSubscriptionPeriodEnd(sub));
  const trialEndsAt = epochToIso(readSubscriptionTrialEnd(sub));

  const sb = supabaseAdmin();
  await sb
    .from("profiles")
    .update({
      subscription_status: status,
      current_period_end: currentPeriodEnd,
      trial_ends_at: trialEndsAt,
    })
    .eq("stripe_customer_id", customerId);
}

async function handleSubscriptionDeleted(
  sub: Stripe.Subscription,
): Promise<void> {
  const customerId = customerIdOf(sub.customer);
  if (!customerId) return;
  const sb = supabaseAdmin();
  await sb
    .from("profiles")
    .update({ subscription_status: "canceled" })
    .eq("stripe_customer_id", customerId);
}

async function handleInvoicePaymentFailed(
  invoice: Stripe.Invoice,
): Promise<void> {
  const customerId = customerIdOf(invoice.customer);
  if (!customerId) return;
  const sb = supabaseAdmin();
  await sb
    .from("profiles")
    .update({ subscription_status: "past_due" })
    .eq("stripe_customer_id", customerId);
}

export async function POST(req: Request) {
  const sig = req.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!sig || !secret) {
    return NextResponse.json(
      { error: "missing signature or webhook secret" },
      { status: 400 },
    );
  }

  // Raw body is required for signature verification — must not pre-parse.
  const rawBody = await req.text();

  let event: Stripe.Event;
  try {
    const stripe = getStripe();
    event = stripe.webhooks.constructEvent(rawBody, sig, secret);
  } catch (e) {
    console.error("[stripe webhook] signature verification failed", e);
    return NextResponse.json(
      { error: `signature verification failed` },
      { status: 400 },
    );
  }

  // Process the event. Bugs on our side return 200 so Stripe doesn't retry
  // forever — they're surfaced via `console.error` instead.
  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(
          event.data.object as Stripe.Checkout.Session,
        );
        break;
      case "customer.subscription.created":
      case "customer.subscription.updated":
        await handleSubscriptionUpsert(
          event.data.object as Stripe.Subscription,
        );
        break;
      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(
          event.data.object as Stripe.Subscription,
        );
        break;
      case "invoice.payment_failed":
        await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
        break;
      default:
        // Ignore unhandled event types; Stripe sends many we don't care
        // about (e.g. `charge.*`, `payment_intent.*`).
        break;
    }
  } catch (e) {
    console.error(`[stripe webhook] failed to handle ${event.type}`, e);
  }

  return NextResponse.json({ received: true });
}
