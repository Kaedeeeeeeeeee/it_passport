import { NextResponse } from "next/server";
import { getProfile } from "@/lib/auth";
import { getStripe } from "@/lib/stripe";

export const runtime = "nodejs";
export const maxDuration = 30;

type Body = {
  plan?: "monthly" | "annual";
};

function siteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}

function resolvePriceId(plan: "monthly" | "annual"): string | null {
  if (plan === "annual") {
    const annual = process.env.STRIPE_PRICE_ID_ANNUAL;
    if (annual && annual.length > 0) return annual;
    // Fall through to monthly if annual isn't configured.
  }
  return process.env.STRIPE_PRICE_ID ?? null;
}

export async function POST(req: Request) {
  const profile = await getProfile();
  if (!profile) {
    return NextResponse.json({ error: "auth required" }, { status: 401 });
  }
  if (
    profile.subscription_status === "active" ||
    profile.subscription_status === "trialing"
  ) {
    return NextResponse.json({ error: "already subscribed" }, { status: 400 });
  }

  let plan: "monthly" | "annual" = "monthly";
  // Body is optional — accept empty/non-JSON requests as the default plan.
  try {
    const text = await req.text();
    if (text.trim().length > 0) {
      const body = JSON.parse(text) as Body;
      if (body.plan === "annual" || body.plan === "monthly") {
        plan = body.plan;
      } else if (body.plan !== undefined) {
        return NextResponse.json(
          { error: "invalid plan; expected 'monthly' or 'annual'" },
          { status: 400 },
        );
      }
    }
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }

  const priceId = resolvePriceId(plan);
  if (!priceId) {
    return NextResponse.json(
      { error: "Stripe price not configured" },
      { status: 500 },
    );
  }

  const base = siteUrl();
  try {
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      // Reuse the customer record if we already have one on file.
      customer: profile.stripe_customer_id ?? undefined,
      // Otherwise prefill the email so Stripe can dedupe on its side.
      customer_email: profile.stripe_customer_id ? undefined : profile.email,
      // The webhook uses this to map the new Stripe customer back to our
      // profiles row.
      client_reference_id: profile.id,
      success_url: `${base}/account?checkout=success`,
      cancel_url: `${base}/pricing?checkout=cancel`,
      allow_promotion_codes: true,
      // 3-day free trial — disclosed in /legal (特商法表記). Applied per
      // session rather than per price so existing customers who churn and
      // resubscribe also get it. Default `payment_method_collection: "always"`
      // means we still collect a card up-front and auto-charge on day 4.
      subscription_data: {
        trial_period_days: 3,
        metadata: { source: "passnote.app" },
      },
      // The charge's credit-card statement descriptor comes from the
      // product (set via `stripe products update <id> --statement-descriptor`),
      // not per-session — Stripe Checkout in subscription mode doesn't
      // accept payment_intent_data overrides.
    });
    if (!session.url) {
      return NextResponse.json(
        { error: "Stripe did not return a checkout URL" },
        { status: 502 },
      );
    }
    return NextResponse.json({ url: session.url });
  } catch (e) {
    const message = (e as Error).message ?? "unknown error";
    console.error("[api/checkout] stripe error", e);
    return NextResponse.json(
      { error: `Stripe error: ${message}` },
      { status: 502 },
    );
  }
}
