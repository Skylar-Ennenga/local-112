-- The one local this deployment serves.
--
-- This row lives in a migration rather than supabase/seed.sql on purpose:
-- seed.sql runs only on a local `supabase db reset` and is never applied by
-- `supabase db push`, so a row placed there would be missing in production.
--
-- This file is also the ONE place a local-specific string belongs. SPEC.md §11
-- requires nothing local-specific in application code -- no hardcoded
-- "Local 112", no OKC strings -- because a second local is a separate Supabase
-- project running the same codebase with its own version of this file.
--
-- Idempotent: re-running it inserts nothing.

insert into public.locals (name, short_name, founded_year)
select 'IATSE Local 112', 'Local 112', 1904
where not exists (select 1 from public.locals);
