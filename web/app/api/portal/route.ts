import { NextResponse } from "next/server";
import { getProfile } from "@/lib/auth";
import { getStripe } from "@/lib/stripe";

export const runtime = "nodejs";
export const maxDuration = 30;

function siteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}

export async function POST() {
  const profile = await getProfile();
  if (!profile) {
    return NextResponse.json({ error: "auth required" }, { status: 401 });
  }
  if (!profile.stripe_customer_id) {
    return NextResponse.json(
      { error: "no Stripe customer on file" },
      { status: 400 },
    );
  }

  try {
    const stripe = getStripe();
    const session = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: `${siteUrl()}/account`,
    });
    // The account page submits a plain HTML form to this endpoint, so we
    // respond with a 303 redirect to the portal URL rather than JSON.
    return NextResponse.redirect(session.url, 303);
  } catch (e) {
    console.error("[api/portal] stripe error", e);
    const message = (e as Error).message ?? "unknown error";
    return NextResponse.json(
      { error: `Stripe error: ${message}` },
      { status: 502 },
    );
  }
}
