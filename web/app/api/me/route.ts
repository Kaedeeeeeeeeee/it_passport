import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { userFromRequest } from "@/lib/supabase/server";

/** GET /api/me — single round-trip the iOS app uses after sign-in to learn
 *  who the user is, what their entitlement looks like, and which payment
 *  rail (Stripe / App Store / neither) owns it. Auth via cookie or Bearer. */
export async function GET(request: Request) {
  const user = await userFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: "not authenticated" }, { status: 401 });
  }

  const { data, error } = await supabaseAdmin()
    .from("profiles")
    .select(
      "id, email, subscription_status, trial_ends_at, current_period_end, preferred_language, stripe_customer_id, app_store_original_transaction_id",
    )
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "profile not found" }, { status: 404 });
  }

  return NextResponse.json({
    id: data.id,
    email: data.email,
    subscriptionStatus: data.subscription_status,
    trialEndsAt: data.trial_ends_at,
    currentPeriodEnd: data.current_period_end,
    preferredLanguage: data.preferred_language,
    hasStripeLink: !!data.stripe_customer_id,
    hasAppStoreLink: !!data.app_store_original_transaction_id,
  });
}
