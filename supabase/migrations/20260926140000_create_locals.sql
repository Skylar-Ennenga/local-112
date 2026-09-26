-- locals -- the root of every other table.
--
-- SPEC.md §4.1. One row for now. The table exists so that a second local is a
-- migration rather than a rewrite, and so every other table can carry local_id
-- from day one (§11) instead of having it retrofitted.
--
-- Note what is NOT here: nothing derived. founded_year is stored; years in
-- existence is always computed from it (lib/years.ts). The site this replaces
-- hardcoded "118 years" and has been wrong since 2022.

create table public.locals (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  short_name   text not null,
  founded_year integer not null,

  constraint locals_name_not_blank
    check (length(trim(name)) > 0),
  constraint locals_short_name_not_blank
    check (length(trim(short_name)) > 0),
  -- Catches a transposed or truncated year on import, not a precise range.
  constraint locals_founded_year_plausible
    check (founded_year between 1800 and 2200)
);

comment on table public.locals is
  'One row per IATSE local. Multi-instance, not multi-tenant: each local gets a separate Supabase project (SPEC.md §11).';
comment on column public.locals.founded_year is
  'Year the local was chartered. Years in existence is always computed from this and never stored.';

-- Row level security, enabled in the same migration that creates the table
-- (SPEC.md §4.9). Retrofitting it means auditing every query already written.
alter table public.locals enable row level security;

-- Anonymous read is deliberate. The local's name and charter year appear on the
-- public home page in the identity strip (SPEC.md §6), which is served to
-- people who are not signed in. There is nothing sensitive in this table.
create policy "locals are readable by everyone"
  on public.locals
  for select
  to anon, authenticated
  using (true);

-- No insert, update or delete policy exists, so row level security denies all
-- three to anon and authenticated regardless of table grants. Changing the
-- local's name or charter year is a migration, not a feature.
