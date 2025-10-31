-- RPC para desarrollo que siempre retorna valid:true si encuentra el usuario
-- NO USAR EN PRODUCCIÓN - Solo para pruebas locales
create or replace function public.auth_check_dev(payload jsonb)
returns table(valid boolean, user_id bigint, user_name text)
language sql security definer as $$
  select true as valid,  -- siempre devuelve valid true
         id as user_id,
         "user" as user_name
  from public.users
  where "user" = payload->> 'u'
  limit 1;
$$;

-- Sobrecarga con (u text, p text) para compatibilidad
create or replace function public.auth_check_dev(u text, p text)
returns table(valid boolean, user_id bigint, user_name text)
language sql security definer as $$
  select true as valid,  -- siempre devuelve valid true
         id as user_id,
         "user" as user_name
  from public.users
  where "user" = u
  limit 1;
$$;