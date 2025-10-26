-- Secure auth_check using pgcrypto's crypt() to compare password hashes.
-- Requirements:
-- 1) Your `users.pass` column must store password hashes produced by crypt(), e.g.
--    select crypt('plain-password', gen_salt('bf'));
-- 2) The pgcrypto extension must be enabled in your DB.

-- Enable pgcrypto extension (run once as a DB superuser)
create extension if not exists pgcrypto;

-- Main implementation: accept a single JSONB payload. PostgREST reliably
-- matches a function that accepts jsonb when a JSON body is sent to /rpc.
-- Drop any previous conflicting overloads to avoid PostgREST ambiguity or
-- mismatched return-type errors. This is safe to run repeatedly.
drop function if exists public.auth_check_secure(jsonb) cascade;
drop function if exists public.auth_check_secure(json) cascade;
drop function if exists public.auth_check_secure(text, text) cascade;
drop function if exists public.auth_check(jsonb) cascade;
drop function if exists public.auth_check(json) cascade;
drop function if exists public.auth_check(text, text) cascade;

-- Main implementation: accept a single JSONB payload. We return user_id as
-- integer to match the common `users.id` definition. If your `users.id` is
-- bigint, replace `integer` with `bigint` and `id::integer` with `id::bigint`.
create or replace function public.auth_check_secure(payload jsonb)
returns table(valid boolean, user_id integer, user_name text)
language sql security definer as $$
  select (crypt(payload->> 'p', pass) = pass) as valid,
         id::integer as user_id,
         "user" as user_name
  from public.users
  where "user" = payload->> 'u'
  limit 1;
$$;

-- Convenience overload: accept JSON (casts to jsonb and calls the jsonb version).
-- Usage: POST to /rest/v1/rpc/auth_check_secure with body {"u":"cc","p":"xx"}
-- Or test directly in SQL:
-- select * from public.auth_check_secure('{"u":"cc","p":"xx"}'::jsonb);
-- NOTE: Avoid providing both json and jsonb overloads for the same function name
-- because PostgREST can become ambiguous when choosing the best candidate.
-- We expose only the jsonb implementation above and provide a backward
-- compatible `auth_check` wrapper below.

-- Backwards-compatible wrapper so clients calling `/rpc/auth_check` keep working.
create or replace function public.auth_check(payload jsonb)
returns table(valid boolean, user_id integer, user_name text)
language sql security definer as $$
  select * from public.auth_check_secure(payload);
$$;

-- Also expose (u text, p text) signatures so PostgREST can match when the client
-- sends a JSON body with keys {"u":"..","p":".."} (common case).
create or replace function public.auth_check(u text, p text)
returns table(valid boolean, user_id integer, user_name text)
language sql security definer as $$
  select (crypt(p, pass) = pass) as valid,
         id::integer as user_id,
         "user" as user_name
  from public.users
  where "user" = u
  limit 1;
$$;

-- Provide a (u text, p text) wrapper for auth_check_secure that delegates to the jsonb implementation.
create or replace function public.auth_check_secure(u text, p text)
returns table(valid boolean, user_id integer, user_name text)
language sql security definer as $$
  select * from public.auth_check_secure(json_build_object('u', u, 'p', p)::jsonb);
$$;
