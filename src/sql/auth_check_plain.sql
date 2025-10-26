-- Temporary insecure RPC for testing: compares plaintext password (INSECURE).
-- Do NOT use in production. Use only to validate current data before migrating to hashed passwords.

create or replace function public.auth_check_plain(payload jsonb)
returns table(valid boolean, user_id bigint, user_name text)
language sql security definer as $$
  select (payload->> 'p' = pass) as valid,
         id as user_id,
         "user" as user_name
  from public.users
  where "user" = payload->> 'u'
  limit 1;
$$;

-- Also expose (u text, p text) signature
create or replace function public.auth_check_plain(u text, p text)
returns table(valid boolean, user_id bigint, user_name text)
language sql security definer as $$
  select (p = pass) as valid,
         id as user_id,
         "user" as user_name
  from public.users
  where "user" = u
  limit 1;
$$;
