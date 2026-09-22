import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { supabaseAnonKey, supabaseUrl } from "@/lib/env";

/**
 * Supabase client for use in Server Components, Server Actions and Route
 * Handlers.
 *
 * Must be created per request — never hoisted to a module-level singleton,
 * because it closes over that request's cookies.
 *
 * `cookies()` is asynchronous in Next.js 16, hence the await.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(supabaseUrl(), supabaseAnonKey(), {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Server Components cannot set cookies. This is safe to ignore
          // provided a proxy (see M2-05) refreshes sessions, which is where
          // the write actually lands.
        }
      },
    },
  });
}
