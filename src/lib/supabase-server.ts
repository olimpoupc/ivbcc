import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(supabaseUrl, supabaseAnonKey, {
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
          // Server Components cannot always write cookies; middleware refreshes them.
        }
      },
    },
  });
}

// Anonymous client with NO cookies()/session. Use it for public reads (the root
// layout's site settings, home, /eventos, /noticias). Reading cookies() is a
// Next.js dynamic API: any route that touches it — including through the root
// layout — is rendered on every request and its `revalidate` is ignored, so
// nothing is ever cached (Vercel answers x-vercel-cache: MISS every time).
// Because there is no session, RLS treats the caller as a plain visitor even
// when an admin is signed in, so these pages never show drafts.
export function createSupabasePublicClient() {
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

// Bypasses RLS entirely — only for narrow, deliberate server-only reads where
// no authenticated-user policy can grant the right access (e.g. reading quiz
// correct-answer data to grade an attempt, or public certificate lookups).
// Never import this into client code or use it for anything a user's own
// session should already be able to do.
export function createSupabaseServiceRoleClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
