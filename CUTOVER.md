# Cutover checklist

Running handover record. **One line every time something domain-shaped is
configured.** SPEC.md §8 — infrastructure transfers to the client at cutover,
and this file is the difference between a clean handover and an archaeology
project.

No secrets in this file. Record _what_ was configured and _where_, never the
value.

---

## Ownership target

Everything below transfers to the role address **`admin@iatselocal112.org`**,
never to an individual. Committee chairs rotate; a personal Gmail as account
owner is the same lock-out risk as leaving it with the developer, just
delayed.

| Thing                  | Owner                                      | Status         |
| ---------------------- | ------------------------------------------ | -------------- |
| Domain, DNS            | Client, always                             | Not started    |
| Supabase org + project | Transfers at cutover                       | Developer-held |
| Vercel project         | Transfers at cutover                       | Developer-held |
| Resend account         | Transfers at cutover                       | Not started    |
| Source code            | Developer; client gets a perpetual licence | —              |

---

## Configured so far

| Date       | What              | Where                      | Notes                                              |
| ---------- | ----------------- | -------------------------- | -------------------------------------------------- |
| 2026-09-22 | GitHub repository | `Skylar-Ennenga/local-112` | `develop` is the integration branch; PRs target it |
| 2026-09-22 | CI pipeline       | GitHub Actions             | Lint, format, types, tests, build, audit           |
| 2026-09-22 | Vercel project    | Vercel                     | Auto-deploys; posts a check on every PR            |
| 2026-09-22 | Supabase project  | Supabase, **`us-east-1`**  | Region verified before any data existed            |
| 2026-09-22 | Supabase CLI      | `supabase/` committed      | Migrations are the only way schema changes         |

---

## Environment variables

Set in Vercel across **Production, Preview and Development**, and in
`.env.local` for local work. No value appears as a literal in the codebase —
everything is read through `lib/env.ts`.

| Variable                        | Scope           | Set in Vercel | Set locally |
| ------------------------------- | --------------- | ------------- | ----------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | Public          | ☐             | ☑           |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public          | ☐             | ☑           |
| `NEXT_PUBLIC_SITE_URL`          | Public          | ☐             | ☐           |
| `SUPABASE_SERVICE_ROLE_KEY`     | **Server only** | ☐             | ☐           |
| `RESEND_API_KEY`                | **Server only** | ☐             | ☐           |
| `EMAIL_FROM`                    | Server only     | ☐             | ☐           |

> `SUPABASE_SERVICE_ROLE_KEY` and `RESEND_API_KEY` must never carry the
> `NEXT_PUBLIC_` prefix. That prefix inlines the value into the browser
> bundle.

The same public values are also needed as **GitHub repository secrets** so CI
builds against real configuration. Until they exist, the workflow falls back
to placeholders.

---

## Email

Sending domain is a **subdomain** (`mail.<domain>`) so the local's existing
Google Workspace mail is untouched.

| Item                                 | Status |
| ------------------------------------ | ------ |
| Resend account                       | ☐      |
| `mail.<test-domain>` verified        | ☐      |
| SPF record                           | ☐      |
| DKIM record                          | ☐      |
| DMARC record                         | ☐      |
| Test send received, passes SPF/DKIM  | ☐      |
| Supabase Auth pointed at custom SMTP | ☐      |

> **Custom SMTP must be configured before any auth code is written.**
> Supabase's built-in sender caps at roughly 2 emails/hour and will present
> as a bug in your code.

---

## Production cutover (M7)

Nothing here is ticked until the project transfers. **All data is fake until
M7-04.**

- [ ] Supabase org and Vercel account created under `admin@iatselocal112.org`
- [ ] Billing on the client's card
- [ ] Supabase project transferred — URL, keys, database, storage intact
- [ ] Vercel project transferred
- [ ] Custom domain added on Vercel; DNS added by the client
- [ ] `mail.iatselocal112.org` verified in Resend; SPF/DKIM/DMARC live
- [ ] `EMAIL_FROM` and `NEXT_PUBLIC_SITE_URL` updated
- [ ] Supabase Site URL and redirect URLs updated
- [ ] Google OAuth authorised origins updated
- [ ] Real roster imported via the reconcile flow; counts verified with the
      Financial Secretary
- [ ] Officers trained on the admin — nobody should open Supabase to do their job
- [ ] Old site content archived

> Supabase project transfer preserves URL, API keys, database, storage and
> edge functions, so there is no environment-variable churn on transfer.

---

## Applying migrations

Schema changes are **never** made by clicking in the Supabase dashboard.
Every change is a migration file committed to `supabase/migrations/`, so the
repository is the complete record of how the schema got to its current state.

Migrations are **authored in the repo and applied by the project owner**
against Supabase. A migration is ready to apply once its pull request has
merged into `develop`.

| Migration                          | Applied | Notes                                |
| ---------------------------------- | ------- | ------------------------------------ |
| `20260926140000_create_locals.sql` | ☐       | `locals` table + RLS (public read)   |
| `20260926140100_seed_local.sql`    | ☐       | The one local this deployment serves |

After applying, regenerate the database types so application code is typed
against the real schema:

```bash
npm run types
```
