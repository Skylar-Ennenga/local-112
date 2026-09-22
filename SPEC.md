# IATSE Local 112 — Product Spec

**Status:** Draft 1 — built from a client outline, the existing public site, and lo-fi wireframes.
**Not yet reviewed by the client.** Every unresolved question has a recorded default in §9 so the build can proceed.

---

## 1. What this is

A replacement for iatselocal112.org, currently on Weebly. Two audiences:

1. **Public** — venues, promoters and prospective members. Needs to look credible and make the local hireable.
2. **Members** — card holders who sign in to reach documents, the roster, the calendar, and (phase 2) steward forms.

The local is IATSE Local 112, the Oklahoma City stagehands local. Roughly 186 members. Run by volunteer officers with turnover at election time.

### The one thing that justifies custom software

Everything in the member area except the roster could be done with Google Drive, and today it is. The roster is different: it is simultaneously the member list, the access-control list, and — if dispatch is ever built — the referral list. That is the reason this is an application and not a static site with Drive links.

Build implication: **the roster is never a document.** It is the central table, and every phase treats it that way.

---

## 2. Scope

### Phase 1 (this spec)

Public site · authentication · member portal · document library · admin roster management.

### Phase 2

Three steward forms (show report, incident report, referral hall infraction report) with submission storage, notification, and an officer-side inbox. These are the only part of the member area that is real software rather than content.

### Phase 3 — not committed

Referral hall dispatch. See §10. Phase 1's data model must not preclude it.

### Explicitly out of scope

Payments and dues collection (stays on Venmo). Payroll (UTP handles it). Anything the International owns.

---

## 3. Stack

| Concern                   | Choice                                    |
| ------------------------- | ----------------------------------------- |
| Framework                 | Next.js, App Router, TypeScript           |
| Styling                   | Tailwind                                  |
| Hosting                   | Vercel (`iad1`)                           |
| Database / auth / storage | Supabase (`us-east-1`)                    |
| Transactional email       | Resend                                    |
| Migrations                | Supabase CLI, files committed to the repo |

**Region is fixed.** Supabase projects cannot be transferred across regions, and this project transfers to the client at cutover.

Every environment-specific value is an env var. No domain, URL or from-address is hardcoded anywhere:

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
NEXT_PUBLIC_SITE_URL
SUPABASE_SERVICE_ROLE_KEY     # server only, never NEXT_PUBLIC_
RESEND_API_KEY                # server only
EMAIL_FROM
```

---

## 4. Domain model

### 4.1 `locals`

Single row for now. Exists so a second local is a migration rather than a rewrite.

```
id            uuid pk
name          text            -- "IATSE Local 112"
short_name    text            -- "Local 112"
founded_year  int             -- 1904; "years strong" is always computed, never stored
```

**Every other table carries `local_id`.** Non-negotiable, even while there is one row.

### 4.2 `members`

The spine of the system.

```
id             uuid pk
local_id       uuid fk -> locals
member_number  text not null           -- TEXT. Numbers are zero-padded; ints destroy "0455"
first_name     text not null
last_name      text not null
email          text                    -- nullable; unknown for most rows at launch
phone          text
joined_year    int
status         text not null default 'active'
auth_user_id   uuid unique fk -> auth.users   -- NULL = record exists, nobody has claimed it
created_at     timestamptz default now()
updated_at     timestamptz default now()

unique (local_id, member_number)
unique (local_id, email) where email is not null
```

Design notes:

- **Names are split.** The source spreadsheet will mix "Burton, Peter" and "Peter Burton". Claim matching needs last name on its own.
- **`auth_user_id` nullable is the whole access design.** Null means a card holder who has not signed in yet.
- **Years in the union is computed** from `joined_year`. Never stored. The current site has a hardcoded "118 years" that has been wrong since 2022.

### 4.3 `member_roles`

Separate table. A person can hold several.

```
id         uuid pk
member_id  uuid fk -> members
role       text    -- 'member' | 'steward' | 'officer' | 'admin'
unique (member_id, role)
```

**Roles are never derived from how someone signed in.** Officers are members too; Google vs. email OTP must produce the same account.

### 4.4 `officer_positions`

Offices rotate; people don't.

```
id           uuid pk
local_id     uuid fk
member_id    uuid fk -> members
title        text        -- 'President', 'Business Agent', ...
email_alias  text        -- 'president@iatselocal112.org'
sort_order   int
is_public    boolean default true
started_at   date
ended_at     date        -- null = current
```

Attribution follows the person, not the office. An audit entry must read "Callie Appleyard" not "the President".

### 4.5 `documents`

```
id           uuid pk
local_id     uuid fk
title        text
category     text        -- 'bylaws' | 'referral_policy' | 'rates_cba' | 'minutes' | 'newsletter' | 'utp_forms'
storage_path text
visibility   text        -- 'member' | 'steward' | 'public'
uploaded_by  uuid fk -> members
created_at   timestamptz
```

Files live in a **private** Supabase bucket, served via short-expiry signed URLs. Never a public bucket URL — that recreates the shareable-Drive-link problem this replaces.

### 4.6 `posts`

```
id            uuid pk
local_id      uuid fk
title         text
body          text
members_only  boolean default false
published_at  timestamptz
author_id     uuid fk -> members
```

One table feeds the public news block and the member portal.

### 4.7 `events`

```
id          uuid pk
local_id    uuid fk
title       text
starts_at   timestamptz
ends_at     timestamptz
location    text
visibility  text   -- 'public' | 'member'
```

Published as an `.ics` feed for phone subscription.

### 4.8 `audit_log`

Append-only. Never updated, never deleted.

```
id          uuid pk
local_id    uuid fk
actor_id    uuid fk -> members
action      text
entity      text
entity_id   uuid
detail      jsonb
created_at  timestamptz default now()
```

Phase 1 uses it for roster edits, claims and document uploads. Phase 3 depends on it existing and being trustworthy.

### 4.9 RLS

**Enabled in the same migration that creates each table.** Retrofitting means auditing every query already written.

- Members read their own record and the active roster of their local
- Officers/admins write the roster
- Documents readable per `visibility` and role
- `audit_log` — insert only, read by officers

---

## 5. Access control

### 5.1 Sign-in

One page, two methods, one resulting account:

- **Continue with Google** — OAuth
- **Email me a code** — six-digit OTP

Either way, the address is looked up in `members.email`. Identity resolves to a member record, never to a login method.

### 5.2 Claim flow

Runs when an address is not on file. This is expected to be the **most-used screen at launch**, because the source roster probably has few emails.

Member supplies **name + member number**. These are facts the local already holds about them.

> The email is the **output** of the match, not an input to it. If we had their email, the lookup at step one would have found them.

Resolution:

| Case                            | Behaviour                                                        |
| ------------------------------- | ---------------------------------------------------------------- |
| Match, `auth_user_id` null      | Attach email + auth user. **In immediately, no human.**          |
| Match, already claimed          | Route to officer queue. Do not attach a second identity.         |
| Email already on another record | Reject. One email, one member.                                   |
| No match                        | Capture input, notify officers, tell the member it has been sent |

Never tell a member to "reach out." That is the friction being removed.

Matching: strict on `member_number`, generous on name — case-insensitive, trim, last name sufficient.

**Known weakness:** name + number is not a secret, and sequential numbers are guessable. Acceptable while the gated content is bylaws PDFs. **Not acceptable once the roster carries phone numbers and referral positions, or if dispatch ships.** Revisit before phase 3.

### 5.3 Revocation

Setting `status` to anything inactive removes a member from the roster view and blocks sign-in. Records are **never deleted** — show reports, and later dispatch history, reference them, and the site has an In Memory Of page.

---

## 6. Screens

### Public

Home · What We Do · Officers · History · In Memory Of · Contact

Carried over from the existing site and **absent from the client outline** — retained deliberately, not by oversight: What We Do (the only hire-us path), History, In Memory Of, Contact.

Home: nav with Member Login · hero · identity strip (computed years) · news · three-up (Hire Us / Join / Contact) · training links · Business Agent card · In Memory Of strip · footer.

The current site's "register, then email us, then wait" block is removed.

### Member portal

Home · Calendar · Documents · Member List · Officers
Steward section (role-gated): Contact List · Show Report · Incident Report · Infraction Report · UTP Forms

### Admin

Roster (search, filter, edit, add, deactivate) · Import reconcile · Claim exceptions · Documents · Posts · Events

### Import reconcile

An import **never overwrites blindly**. It parses, shows a diff — new / changed / missing / unchanged — and waits for confirmation. Members absent from an uploaded file are **left alone by default**; the likely explanation is a partial export, not that fourteen people left the union.

This guards the real failure: someone re-uploads last year's spreadsheet and wipes the emails members have claimed.

---

## 7. Email

| Purpose                                            | Path                            |
| -------------------------------------------------- | ------------------------------- |
| OTP / magic links                                  | Supabase Auth → **custom SMTP** |
| Contact form, claim notifications, sign-in invites | Resend via server action        |

**Configure custom SMTP before writing any auth code.** Supabase's built-in sender caps around 2 emails/hour and will look like a bug in your code.

Sending domain is a subdomain (`mail.<domain>`) with SPF, DKIM and DMARC, so the local's existing Google Workspace mail is untouched.

Contact submissions are **stored and then notified**, not emailed only. Email alone means a message disappears when someone deletes it and nobody can tell whether it was answered.

---

## 8. Ownership

| Thing                  | Owner                                      |
| ---------------------- | ------------------------------------------ |
| Domain, DNS            | Client, always                             |
| Supabase org + project | Transfers to client at cutover             |
| Vercel project         | Transfers to client at cutover             |
| Resend account         | Transfers to client                        |
| Source code            | Developer; client gets a perpetual licence |

Infrastructure transfers to the **role address** `admin@iatselocal112.org`, never to an individual. Committee chairs rotate; a personal Gmail as account owner is the same lock-out risk as leaving it with the developer, just delayed.

Supabase project transfer preserves URL, API keys, database, storage and edge functions — no env churn.

`CUTOVER.md` gets a line every time something domain-shaped is configured.

---

## 9. Assumptions register

**These are defaults, not answers.** Each is what the build proceeds on until the client says otherwise. Each notes what changes if the assumption is wrong.

| #   | Question                                | Assumed                                                                                                    | If wrong                                                                                                                      |
| --- | --------------------------------------- | ---------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| A1  | Is dispatch ever real?                  | Not in phase 1, but the roster is modelled to support it                                                   | If never: the member area could have been Drive links. If soon: bring classifications and list position forward               |
| A2  | Roster source and format                | CSV/XLSX from the Financial Secretary. Name, member number, join year reliable; **email sparse or absent** | If emails are complete, the claim flow becomes an edge case instead of the main path                                          |
| A3  | Member statuses                         | `active`, `withdrawn`, `transferred`, `retired`, `deceased`                                                | Rename per bylaws; cheap now, migration later                                                                                 |
| A4  | Is steward standing or per-show?        | **Standing** — a role flag an admin sets                                                                   | Per-show means modelling job assignments; significantly larger                                                                |
| A5  | Is the steward area gated from members? | Yes, role-gated, but it is a section not a separate portal                                                 | If open to all members, drop the gate; the contact list is the sensitive part                                                 |
| A6  | Officer accounts                        | Individuals sign in as themselves; office is a role that rotates                                           | If only role mailboxes exist, Google SSO is unusable for officers and attribution is lost                                     |
| A7  | Contents of Card Holders Only           | Nothing beyond what the outline lists                                                                      | Unknown content may add screens                                                                                               |
| A8  | Current member access                   | **Most members have never signed in.** Launch is onboarding a whole local, not migrating sessions          | If most are active today, launch comms shrink                                                                                 |
| A9  | Incident/infraction report access       | BA and President only; retained indefinitely                                                               | Grievance material — a BA decision, not a design one                                                                          |
| A10 | Calendar ownership                      | **The site owns it** and publishes `.ics`. Union meetings, board, training only                            | If the dispatcher's calendar is the source, consume a feed instead. If it holds work calls, that is dispatch and out of scope |
| A11 | Public site audience                    | Both, with Hire Us prominent                                                                               | If employers are primary, Hire Us moves above news                                                                            |
| A12 | Officers public or gated?               | **Public**, role + email only, no personal cell numbers                                                    | Client outline put them behind login; venues need the BA                                                                      |
| A13 | News                                    | Simple post system, `members_only` toggle                                                                  | Last post on the current site was July 2020. If nobody writes, drop `posts` and keep the newsletter as a PDF                  |
| A14 | Contact form destination                | Stored, plus notification to `ba@`                                                                         | Trivial to redirect                                                                                                           |
| A15 | Naming                                  | "Steward", not "Dispatch" — Dispatch is a named officer                                                    | Rename before it reaches the UI                                                                                               |
| A16 | Logo                                    | Vector unavailable; placeholder until supplied                                                             | Needs horizontal lockup, square mark, light-on-dark variant                                                                   |
| A17 | Board of Trustees                       | Omitted from the outline by accident; schema supports it                                                   | Bylaws usually require trustees                                                                                               |
| A18 | Hero photography                        | None exists; placeholder                                                                                   | If no photos are available the home page needs a different treatment                                                          |
| A19 | Training links                          | The current four carry over as-is                                                                          | Confirm still current                                                                                                         |
| A20 | In Memory Of                            | Current seven names are complete                                                                           | Page says "updating soon". Getting this wrong is the one that actually stings                                                 |

### Content the client must supply

Roster file (redacted sample first — **do not accept real member data before the project transfers**) · logo vector · crew photos · home page copy · bylaws, referral policy, rate sheets, CBAs, minutes, newsletters.

---

## 10. Phase 3 note — dispatch

Not being built. Recorded so phase 1 doesn't foreclose it.

A referral hall dispatch system needs: `calls` with per-classification positions, member `classifications` (many-to-many), `certifications` with expiry that auto-disqualify, list position, `offers` and `assignments`, a scheduler for offer timeouts, atomic accept to prevent over-dispatch, and an append-only audit trail.

Three things worth carrying forward now:

1. **The ordering rules are in the Referral Hall Policy and Hiring Hall Policy** — both already on the phase 1 document list. Those PDFs are the spec for the engine. Read before designing.
2. **Accept/decline links must not be bare GETs.** Mail scanners follow links automatically and would dispatch members who never saw the message. Signed single-use token → detail page → POST.
3. **SMS, not email.** Stagehands aren't checking inbox during a load-out. That means phone numbers on the roster, which is another reason it can't be a spreadsheet.

Ordering is bylaws-governed and carries duty-of-fair-representation exposure. The audit trail is the product, not hygiene.

---

## 11. Multi-tenancy

Other locals may want this. **Do not build multi-tenant.** Build multi-instance: same codebase, separate Supabase project and Vercel deploy per local. Separate databases make a cross-local data leak structurally impossible rather than a policy you hope you wrote right.

Two disciplines, both nearly free, that keep the option open:

- `local_id` on every table from day one
- Nothing local-specific in code — no hardcoded "Local 112", no OKC strings; titles, classifications and categories are rows

The sellable product is not a dispatch engine, it is a **configurable ruleset**, and that abstraction can't be designed before one concrete version exists and shows where it strains.
