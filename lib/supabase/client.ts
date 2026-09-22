import { createBrowserClient } from "@supabase/ssr";

import { supabaseAnonKey, supabaseUrl } from "@/lib/env";

/**
 * Supabase client for use in Client Components.
 *
 * Safe to call repeatedly — `createBrowserClient` returns the same
 * underlying instance for a given set of arguments.
 */
export function createClient() {
  return createBrowserClient(supabaseUrl(), supabaseAnonKey());
}
