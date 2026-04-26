import { redirect } from "next/navigation";
import { cache } from "react";
import { supabaseServer } from "./supabase/server";
import type { User } from "@supabase/supabase-js";

export type ProfileRow = {
  id: string;
  email: string;
  stripe_customer_id: string | null;
  subscription_status:
    | "free"
    | "trialing"
    | "active"
    | "past_due"
    | "canceled";
  trial_ends_at: string | null;
  current_period_end: string | null;
  preferred_language: string | null;
};

/**
 * Per-request memoised. Multiple components in the same render tree
 * (e.g. (shell) layout + the page inside it + a header) all call
 * `getUser()` / `getProfile()` independently — without `cache()` each
 * call would round-trip Supabase. With it, only the first does the
 * fetch, the rest reuse the in-flight Promise. This was the dominant
 * source of nav-click latency on tab switches.
 */
export const getUser = cache(async (): Promise<User | null> => {
  const sb = await supabaseServer();
  const { data } = await sb.auth.getUser();
  return data.user;
});

export const getProfile = cache(async (): Promise<ProfileRow | null> => {
  const user = await getUser();
  if (!user) return null;
  const sb = await supabaseServer();
  const { data } = await sb
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();
  return (data as ProfileRow | null) ?? null;
});

export function isPro(status: ProfileRow["subscription_status"] | undefined) {
  if (process.env.DEV_FORCE_PRO === "true") return true;
  return status === "trialing" || status === "active";
}

/** Server-component guard. Redirects to /login if unauthenticated. */
export async function requireAuth(origin: string): Promise<ProfileRow> {
  const profile = await getProfile();
  if (!profile) {
    redirect(`/login?next=${encodeURIComponent(origin)}`);
  }
  return profile;
}

/** Server-component guard. Redirects to /login if unauthenticated,
 *  or /pricing?from=<origin> if authenticated but not Pro. */
export async function requirePro(origin: string): Promise<ProfileRow> {
  const profile = await getProfile();
  if (!profile) {
    redirect(`/login?next=${encodeURIComponent(origin)}`);
  }
  if (!isPro(profile.subscription_status)) {
    redirect(`/pricing?from=${encodeURIComponent(origin)}`);
  }
  return profile;
}

/** Route-handler guard. Throws a Response if not Pro. */
export async function ensurePro(): Promise<ProfileRow> {
  const profile = await getProfile();
  if (!profile) {
    throw new Response(
      JSON.stringify({ error: "authentication required" }),
      { status: 401, headers: { "content-type": "application/json" } },
    );
  }
  if (!isPro(profile.subscription_status)) {
    throw new Response(
      JSON.stringify({ error: "Pro membership required" }),
      { status: 402, headers: { "content-type": "application/json" } },
    );
  }
  return profile;
}
