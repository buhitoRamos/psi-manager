-- SQL to create an auth_check RPC that accepts a single JSON payload.
-- This matches PostgREST's expectation for rpc calls with a single unnamed json/jsonb parameter.
-- WARNING: This example compares plaintext passwords; use only for testing.

create or replace function public.auth_check(payload json)
returns table(valid boolean, user_id int, user_name text) as $$
begin
  return query
  select (pass = payload->> 'p') as valid, id, "user" from public.users where "user" = payload->> 'u' limit 1;
end;
$$ language plpgsql security definer;

-- To install:
-- 1) Open your Supabase project -> SQL editor
-- 2) Paste this SQL and run it
-- 3) Test via the RPC endpoint or from your app
