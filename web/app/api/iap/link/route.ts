import { NextResponse } from "next/server";
import { userFromRequest } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import {
  getAppStoreVerifier,
  isAppStoreConfigured,
} from "@/lib/app-store";

export const runtime = "nodejs";
export const maxDuration = 30;

type LinkBody = {
  originalTransactionId?: string;
  jwsRepresentation?: string;
};

/** POST /api/iap/link
 *
 *  Called by the iOS app immediately after a successful StoreKit 2 purchase
 *  (and after Transaction.updates fires for renewals). Verifies the JWS
 *  using Apple's signed transaction format, then writes
 *  `app_store_original_transaction_id` to the signed-in user's profile so
 *  later App Store Server Notifications can find the right row.
 *
 *  When the App Store env vars aren't set yet, we 200 with `linked=false`
 *  so the client treats it as a no-op (lets us ship the iOS purchase flow
 *  before the production keys land). */
export async function POST(request: Request) {
  const user = await userFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: "not authenticated" }, { status: 401 });
  }

  let body: LinkBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  if (!body.originalTransactionId || !body.jwsRepresentation) {
    return NextResponse.json({ error: "missing fields" }, { status: 400 });
  }

  if (!isAppStoreConfigured()) {
    console.warn("[/api/iap/link] App Store env not configured — skipping verify");
    return NextResponse.json({ linked: false, reason: "not_configured" });
  }

  let originalTransactionId: string;
  try {
    const verifier = getAppStoreVerifier();
    const decoded = await verifier.verifyAndDecodeTransaction(
      body.jwsRepresentation,
    );
    if (decoded.revocationDate) {
      return NextResponse.json(
        { error: "transaction revoked" }, { status: 400 },
      );
    }
    originalTransactionId =
      decoded.originalTransactionId ?? body.originalTransactionId;
  } catch (e) {
    console.error("[/api/iap/link] JWS verification failed", e);
    return NextResponse.json(
      { error: "verification failed" }, { status: 400 },
    );
  }

  const sb = supabaseAdmin();
  const { error } = await sb
    .from("profiles")
    .update({
      app_store_original_transaction_id: originalTransactionId,
      subscription_status: "active",
    })
    .eq("id", user.id);

  if (error) {
    console.error("[/api/iap/link] profile update failed", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ linked: true });
}
