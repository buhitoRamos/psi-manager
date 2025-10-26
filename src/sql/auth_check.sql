-- SQL to create a simple auth_check RPC in Supabase.
-- WARNING: This implementation compares plaintext passwords. Use only for testing.
-- For production, store hashed passwords and compare with pgcrypto's crypt() or perform check server-side.

create or replace function public.auth_check(u text, p text)
returns table(valid boolean, user_id int, user_name text) as $$
begin
  return query
  select (pass = p) as valid, id, "user" from public.users where "user" = u limit 1;
end;
$$ language plpgsql security definer;

-- To create the function:
-- 1) Open Supabase project -> SQL editor
-- 2) Paste this SQL and run
-- 3) Ensure RLS/policies allow rpc execution by anon role or adjust policy accordingly
