# IATSE Local 112 — Build Roadmap

Ticket-sized work items derived from `SPEC.md`. Each is one focused session.

**Conventions**

- `M#-##` is the ticket id. Use it as the branch name and PR title prefix.
- **Blocked by** must be closed first.
- **AC** = acceptance criteria. A ticket is done when all boxes pass, not when the code compiles.
- Where a ticket depends on an assumption, the `A#` from §9 of the spec is named. If the client contradicts it, reopen the ticket.

---

## M0 — Foundation

### M0-01 Repo scaffold ✅

`create-next-app`: TypeScript, Tailwind, App Router, ESLint. Private repo.

### M0-02 Vercel deploy ✅

Live at the project's `.vercel.app` URL.

### M0-03 Supabase project ✅

Dedicated org named for the local, one project inside it, **us-east-1**.

**AC** — verify region is `us-east-1` before any data exists. Recreating an empty project is minutes; migrating a populated one is not.

### M0-04 Environment variables

Blocked by: M0-02, M0-03

Set in Vercel across Production, Preview and Development, and in `.env.local`.

**AC**

- [ ] `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SITE_URL` set
- [ ] `.env*.local` is gitignored
- [ ] No URL, domain or from-address appears as a literal anywhere in the codebase

### M0-05 Supabase client + CLI

Blocked by: M0-04

Install `@supabase/supabase-js` and `@supabase/ssr`. Browser and server clients. `supabase init`, `supabase link`.

**AC**

- [ ] A deployed page reads from the database and renders the result
- [ ] `supabase/migrations/` exists and is committed
- [ ] No schema change is ever made by clicking in the dashboard

### M0-06 CUTOVER.md

Create the running handover checklist. One line per domain-shaped configuration.

**AC** — seeded with Supabase org/project, Vercel project, env vars.

---

## M1 — Data model

### M1-01 `locals` table + seed

Blocked by: M0-05

**AC**

- [ ] Table per spec §4.1, one row seeded
- [ ] `founded_year` = 1904
- [ ] RLS enabled in the same migration

### M1-02 `members` table

Blocked by: M1-01 · Assumes: A2, A3

**AC**

- [ ] Columns per spec §4.2
- [ ] `member_number` is `text`, not an integer type
- [ ] `first_name` / `last_name` separate
- [ ] `auth_user_id` nullable and unique
- [ ] Unique on `(local_id, member_number)`; partial unique on email where not null
- [ ] `status` defaults to `active`
- [ ] RLS enabled in the same migration
- [ ] `updated_at` trigger

### M1-03 `member_roles` table

Blocked by: M1-02 · Assumes: A4

**AC**

- [ ] Roles: `member`, `steward`, `officer`, `admin`
- [ ] A member can hold several
- [ ] A helper (`hasRole`) resolves roles from the member record, never from auth provider
- [ ] RLS enabled

### M1-04 `audit_log` table

Blocked by: M1-02

**AC**

- [ ] Append-only: RLS permits insert, forbids update and delete
- [ ] Officers can read

### M1-05 Seed fake members

Blocked by: M1-03

20 invented members. Mixed statuses. **Roughly two-thirds with no email**, mirroring A2.

**AC**

- [ ] Seed script committed, idempotent
- [ ] No real member data in the repo or the dev project

---

## M2 — Authentication

### M2-01 Sending domain + Resend

Blocked by: M0-06

Verify `mail.<test-domain>` in Resend. Add SPF, DKIM, DMARC.

**AC**

- [ ] Test send is received and passes SPF/DKIM
- [ ] Logged in `CUTOVER.md`

### M2-02 Custom SMTP in Supabase

Blocked by: M2-01

**Do this before writing auth code.** The built-in sender caps around 2 emails/hour and will present as a bug in your code.

**AC** — an auth email sends from the project's own domain and arrives.

### M2-03 Email OTP sign-in

Blocked by: M2-02, M1-02

**AC**

- [ ] Address on file → code → signed in
- [ ] Session resolves to the member record
- [ ] Session is long-lived; a member checking a rate sheet on a phone is not re-authing every visit
- [ ] Address not on file → redirected to claim, not an error
- [ ] Inactive member cannot sign in

### M2-04 Claim flow

Blocked by: M2-03 · Assumes: A2

Spec §5.2. **Expected to be the highest-traffic screen at launch.**

**AC**

- [ ] Inputs: first name, last name, member number, email
- [ ] Match strict on member number, generous on name (case-insensitive, trimmed)
- [ ] Match + unclaimed → attach email and `auth_user_id`, sign in immediately, no human
- [ ] Match + already claimed → officer queue, no second identity attached
- [ ] Email already on another record → rejected
- [ ] No match → input captured, officers notified, member told it has been sent
- [ ] Copy never instructs the member to contact anyone
- [ ] Every outcome written to `audit_log`

### M2-05 Route protection

Blocked by: M2-03

**AC**

- [ ] Signed-out user typing a portal URL is redirected
- [ ] Non-steward cannot reach steward routes
- [ ] Non-officer cannot reach admin routes
- [ ] Verified against the deployed site, not just locally

### M2-06 Google OAuth

Blocked by: M2-03 · Assumes: A6

Additive. Email OTP must work first.

**AC**

- [ ] Google sign-in resolves to the same member record as OTP for the same address
- [ ] No duplicate account is created
- [ ] Roles are unaffected by which method was used

---

## M3 — Admin

Built **before** the member portal. The client needs to click real data early, and problems found now are cheap.

### M3-01 Roster list

Blocked by: M2-05

**AC**

- [ ] Table: name, member number, joined, email, status
- [ ] Unclaimed records visibly marked — officers can see who has not signed in
- [ ] Search by name or number; filter active / inactive / all
- [ ] Years in union computed, never stored

### M3-02 Add member

Blocked by: M3-01

**AC**

- [ ] Fields: name, member number, join year, optional email
- [ ] Optional "email them a sign-in link now"
- [ ] Duplicate member number rejected
- [ ] Written to `audit_log`

### M3-03 Edit / deactivate

Blocked by: M3-01 · Assumes: A3

**AC**

- [ ] Status change available; **no delete anywhere in the UI**
- [ ] Deactivating removes from roster views and blocks sign-in
- [ ] Record and history survive
- [ ] Written to `audit_log`

### M3-04 Claim exception queue

Blocked by: M2-04

**AC**

- [ ] Failed claims listed with what the member submitted and why it failed
- [ ] Approve attaches the email; deny notifies the member
- [ ] Written to `audit_log`

### M3-05 Import reconcile

Blocked by: M3-03 · Assumes: A2

Spec §6. The ticket that protects the roster.

**AC**

- [ ] Accepts CSV/XLSX; tolerates "Last, First" and "First Last"
- [ ] Preview shows new / changed / missing / unchanged counts, each reviewable
- [ ] **Nothing is written until confirmed**
- [ ] Missing members are left alone by default; marking inactive is opt-in
- [ ] An import never clears an existing email or `auth_user_id`
- [ ] Tested against a deliberately messy file — inconsistent names, blank emails, zero-padded numbers
- [ ] Written to `audit_log`

---

## M4 — Documents

### M4-01 Private bucket + `documents` table

Blocked by: M2-05

**AC**

- [ ] Bucket is private
- [ ] Access via short-expiry signed URLs only
- [ ] A signed-out user with a copied URL is denied after expiry
- [ ] RLS enforces `visibility`

### M4-02 Officer upload

Blocked by: M4-01, M3-01

**AC** — upload with title, category, visibility; replace and remove; written to `audit_log`.

### M4-03 Member browse

Blocked by: M4-02

**AC** — list by category, search by title, newest first, download works on mobile.

---

## M5 — Member portal

### M5-01 Portal shell

Blocked by: M2-05

**AC**

- [ ] Nav, session, sign-out
- [ ] Steward section renders **only** for the steward role — a plain member must not see it
- [ ] Usable at phone width

### M5-02 Portal home

Blocked by: M5-01

**AC** — next event and current newsletter above the fold; quick links below. A landing page, not a list of links.

### M5-03 Member list

Blocked by: M5-01

**AC** — active members only, search, years computed, no phone numbers unless A5 says otherwise.

### M5-04 Officers page

Blocked by: M5-01

**AC** — driven by `officer_positions`; current office holders only.

### M5-05 Calendar + `.ics`

Blocked by: M5-01 · Assumes: A10

**AC**

- [ ] Month view plus upcoming list
- [ ] "Add to my phone" serves a valid `.ics` subscription feed
- [ ] Feed verified in Apple Calendar and Google Calendar
- [ ] Copy sets expectations: phones refresh on their own schedule, sometimes hours
- [ ] **The feed URL cannot authenticate.** Either the feed is public, or this ticket stops and A10 gets answered

---

## M6 — Public site

Last because copy arrives late and it is the least risky part.

### M6-01 Layout

**AC** — nav with Member Login, footer, mobile, no "register then email us" anywhere.

### M6-02 Home

Blocked by: M6-01 · Assumes: A11, A13, A18

**AC** — hero, identity strip with **computed** years, news, three-up, training links, BA card, In Memory Of strip.

### M6-03 What We Do · History · In Memory Of

Blocked by: M6-01 · Assumes: A20

**AC** — existing copy carried over; In Memory Of confirmed with the client before launch.

### M6-04 Officers (public)

Blocked by: M6-01 · Assumes: A12

**AC** — role and email only; no personal cell numbers; BA reachable without signing in.

### M6-05 Contact form

Blocked by: M6-01 · Assumes: A14

**AC**

- [ ] Stored in the database **and** notification sent — not email only
- [ ] Officer-side inbox
- [ ] Spam protection
- [ ] Dues, UTP payroll and BA details carried over from the current site

### M6-06 Posts

Blocked by: M6-02 · Assumes: A13

**AC** — officer composes, publishes, `members_only` toggle; one tool feeds public and portal.

> **Check A13 before building.** The current site's last post was July 2020. If nobody will write, delete this ticket and keep the newsletter as a PDF.

---

## M7 — Cutover

### M7-01 Client accounts

**AC** — Supabase org and Vercel account under `admin@iatselocal112.org`; billing on the client's card; not an individual's personal address.

### M7-02 Transfer infrastructure

Blocked by: M7-01

**AC** — Supabase project transferred (URL, keys, storage intact); Vercel project transferred; developer retains access only as long as the client wants support.

### M7-03 Production domain

Blocked by: M7-02

**AC**

- [ ] Custom domain on Vercel; DNS added by the client
- [ ] `mail.iatselocal112.org` verified in Resend; SPF/DKIM/DMARC live
- [ ] `EMAIL_FROM` and `NEXT_PUBLIC_SITE_URL` updated
- [ ] Supabase Site URL and redirect URLs updated
- [ ] Google OAuth origins updated
- [ ] Every line of `CUTOVER.md` ticked

### M7-04 Load the real roster

Blocked by: M7-02, M3-05

**The real roster enters the client's infrastructure, never the developer's.** Until this ticket, all data is fake.

**AC** — imported via the reconcile flow; counts verified with the Financial Secretary.

### M7-05 Launch

Blocked by: M7-03, M7-04

**AC**

- [ ] Officers trained on the admin — no one should ever open Supabase to do their job
- [ ] A plan exists for getting ~186 members to claim records (A8: assume most have never signed in)
- [ ] Old site content archived

---

## M8 — Steward forms (phase 2)

Not started until members are signing in. These are the only real software in the member area.

### M8-01 Submissions schema

Blocked by: M7-05 · Assumes: A9

**AC** — one table per form type or a shared table with typed payloads; `submitted_by`, `submitted_at`, immutable once submitted; RLS restricts reads per A9.

### M8-02 Show report

### M8-03 Incident report

### M8-04 Referral hall infraction report

### M8-05 Officer inbox

### M8-06 Steward contact list

> **A9 must be answered before M8-03 and M8-04.** Incident and infraction reports are grievance material. Who may read them and how long they are kept is a Business Agent decision, not a design one.

---

## Not on this roadmap

**Dispatch.** See `SPEC.md` §10. Do not begin until the Referral Hall Policy and Hiring Hall Policy have been read — those documents are the spec, and they arrive as part of M4.
