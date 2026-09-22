-- Connectivity check for the deployed application.
--
-- M0-05 requires that a deployed page reads from the database and renders
-- the result, but no domain tables exist yet -- `locals` arrives in M1-01.
-- This function proves the whole chain end to end: migration applied via
-- the CLI, deployed app, PostgREST, and grants.
--
-- Safe to drop once the home page reads real data from `locals`.

create or replace function public.health_check()
returns timestamptz
language sql
stable
security invoker
set search_path = ''
as $$
  select now();
$$;

comment on function public.health_check() is
  'Returns the database clock. Verifies connectivity from the deployed app. Added in M0-05; removable once locals is readable.';

revoke execute on function public.health_check() from public;
grant execute on function public.health_check() to anon, authenticated;
