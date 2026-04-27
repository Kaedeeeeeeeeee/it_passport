import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import {
  NotificationTypeV2,
  Subtype,
} from "@apple/app-store-server-library";
import {
  getAppStoreVerifier,
  isAppStoreConfigured,
} from "@/lib/app-store";
import type { ProfileRow } from "@/lib/auth";

export const runtime = "nodejs";
export const maxDuration = 30;

type SubscriptionStatus = ProfileRow["subscription_status"];

/** Map App Store notification types onto our profiles.subscription_status
 *  enum. Mirrors the structure of `mapStripeStatus` in the Stripe webhook
 *  for symmetry. */
function mapNotificationType(
  type: NotificationTypeV2,
  subtype?: Subtype,
): SubscriptionStatus | null {
  switch (type) {
    case NotificationTypeV2.SUBSCRIBED:
    case NotificationTypeV2.DID_RENEW:
      return "active";
    case NotificationTypeV2.OFFER_REDEEMED:
      return "active";
    case NotificationTypeV2.GRACE_PERIOD_EXPIRED:
    case NotificationTypeV2.DID_FAIL_TO_RENEW:
      return subtype === Subtype.GRACE_PERIOD ? "active" : "past_due";
    case NotificationTypeV2.EXPIRED:
    case NotificationTypeV2.REFUND:
    case NotificationTypeV2.REVOKE:
      return "canceled";
    case NotificationTypeV2.DID_CHANGE_RENEWAL_STATUS:
      // Not a status change — auto-renew toggle. Keep current state.
      return null;
    default:
      return null;
  }
}

/** POST /api/webhooks/app-store
 *
 *  Receives App Store Server Notifications V2. Apple posts a single field
 *  `signedPayload` (a JWS) which we verify and decode. The decoded payload
 *  contains a `data.signedTransactionInfo` (also JWS) we further decode to
 *  find the originalTransactionId and use it to look up the right profile. */
export async function POST(request: Request) {
  if (!isAppStoreConfigured()) {
    console.warn("[/api/webhooks/app-store] env not configured");
    return NextResponse.json({ ok: false, reason: "not_configured" }, { status: 503 });
  }

  let body: { signedPayload?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }
  if (!body.signedPayload) {
    return NextResponse.json({ error: "missing signedPayload" }, { status: 400 });
  }

  let originalTransactionId: string | undefined;
  let mapped: SubscriptionStatus | null = null;
  let expiresAt: Date | null = null;

  try {
    const verifier = getAppStoreVerifier();
    const decoded = await verifier.verifyAndDecodeNotification(body.signedPayload);

    mapped = mapNotificationType(
      decoded.notificationType as NotificationTypeV2,
      decoded.subtype as Subtype | undefined,
    );

    const txnJWS = decoded.data?.signedTransactionInfo;
    if (txnJWS) {
      const txn = await verifier.verifyAndDecodeTransaction(txnJWS);
      originalTransactionId = txn.originalTransactionId;
      if (txn.expiresDate) {
        expiresAt = new Date(txn.expiresDate);
      }
    }
  } catch (e) {
    console.error("[/api/webhooks/app-store] verify failed", e);
    return NextResponse.json(
      { error: "verification failed" }, { status: 400 },
    );
  }

  if (!originalTransactionId) {
    // Some notifications (e.g. CONSUMPTION_REQUEST) don't include a txn —
    // ack and ignore.
    return NextResponse.json({ ok: true, ignored: true });
  }

  // Look up the linked profile and update.
  const sb = supabaseAdmin();
  const update: Record<string, string | null> = {};
  if (mapped) update.subscription_status = mapped;
  if (expiresAt) update.current_period_end = expiresAt.toISOString();

  if (Object.keys(update).length > 0) {
    const { error } = await sb
      .from("profiles")
      .update(update)
      .eq("app_store_original_transaction_id", originalTransactionId);
    if (error) {
      console.error("[/api/webhooks/app-store] update failed", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  return NextResponse.json({ received: true });
}
