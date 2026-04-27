import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { supabaseAdmin } from "./admin";

/** Server-side Supabase client that reads/writes auth session cookies.
 *  Use in Server Components, Route Handlers, and Server Actions. */
export async function supabaseServer(): Promise<SupabaseClient> {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // `setAll` is called from a Server Component — cookie writes
            // are only possible in Route Handlers / Actions. Safe to ignore
            // here; the proxy will refresh sessions on the next request.
          }
        },
      },
    },
  );
}

/** Resolve the authenticated user from either the session cookie (web) or
 *  an `Authorization: Bearer <jwt>` header (native iOS app). Returns null
 *  when neither path yields a valid user. Route handlers should call this
 *  instead of `supabaseServer().auth.getUser()` so the same endpoint can
 *  serve both clients. Writes still go through `supabaseAdmin()` as before. */
export async function userFromRequest(req: Request): Promise<User | null> {
  const cookieClient = await supabaseServer();
  const { data: cookieAuth } = await cookieClient.auth.getUser();
  if (cookieAuth.user) return cookieAuth.user;

  const header = req.headers.get("authorization");
  if (header && header.toLowerCase().startsWith("bearer ")) {
    const jwt = header.slice(7).trim();
    if (jwt) {
      const { data } = await supabaseAdmin().auth.getUser(jwt);
      if (data.user) return data.user;
    }
  }

  return null;
}
