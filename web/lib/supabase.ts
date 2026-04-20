import { createClient, type SupabaseClient } from "@supabase/supabase-js";

function env(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var ${name}`);
  return v;
}

let adminClient: SupabaseClient | null = null;

/** Server-only client using the service-role key. Bypasses RLS.
 *  Do NOT import from client components. */
export function supabaseAdmin(): SupabaseClient {
  if (!adminClient) {
    adminClient = createClient(
      env("NEXT_PUBLIC_SUPABASE_URL"),
      env("SUPABASE_SERVICE_ROLE_KEY"),
      { auth: { persistSession: false } },
    );
  }
  return adminClient;
}

/** Anonymous client — OK to expose. Subject to RLS policies. */
export function supabaseAnon(): SupabaseClient {
  return createClient(
    env("NEXT_PUBLIC_SUPABASE_URL"),
    env("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
  );
}
