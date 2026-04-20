import { createClient, type SupabaseClient } from "@supabase/supabase-js";

function env(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var ${name}`);
  return v;
}

let cached: SupabaseClient | null = null;

/** Server-only client using the service-role key. Bypasses RLS.
 *  Use only in route handlers / server components that need elevated
 *  writes (AI cache, Stripe webhook, internal data sync). */
export function supabaseAdmin(): SupabaseClient {
  if (!cached) {
    cached = createClient(
      env("NEXT_PUBLIC_SUPABASE_URL"),
      env("SUPABASE_SERVICE_ROLE_KEY"),
      { auth: { persistSession: false } },
    );
  }
  return cached;
}
