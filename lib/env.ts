/**
 * Central access point for environment configuration.
 *
 * SPEC.md §3 requires that no domain, URL or from-address appears as a
 * literal anywhere in the codebase, so everything environment-specific is
 * read here and nowhere else.
 *
 * Note the literal `process.env.NEXT_PUBLIC_*` references below. Next.js
 * inlines these at build time by static substitution, so a dynamic lookup
 * such as `process.env[name]` would silently produce `undefined` in the
 * browser bundle. They must stay written out in full.
 */

function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(
      `Missing required environment variable: ${name}. ` +
        `Set it in .env.local for local development, and in the Vercel ` +
        `project settings for Preview and Production.`,
    );
  }
  return value;
}

export function supabaseUrl(): string {
  return required(
    "NEXT_PUBLIC_SUPABASE_URL",
    process.env.NEXT_PUBLIC_SUPABASE_URL,
  );
}

/**
 * The publishable (formerly "anon") key. Safe to expose to the browser —
 * row level security is what protects the data, not this key.
 */
export function supabaseAnonKey(): string {
  return required(
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

export function siteUrl(): string {
  return required("NEXT_PUBLIC_SITE_URL", process.env.NEXT_PUBLIC_SITE_URL);
}
