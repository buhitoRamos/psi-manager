-- SQL para crear la tabla progress y exponerla vía REST en Supabase

create table if not exists public.progress (
  id serial primary key,
  created_at timestamp with time zone default now(),
  dx_presumptive text,
  dx_psychiatric text,
  dx_semesterly text,
  dx_annual text,
  patient_id integer references patients(id) on delete set null,
  medication text
);

-- Permitir acceso a la API REST (lectura y escritura)
-- Asegúrate de tener habilitado Row Level Security (RLS) y define las policies necesarias

-- Habilitar RLS
alter table public.progress enable row level security;

-- Eliminar policies si ya existen para evitar errores de duplicado

drop policy if exists "Allow select for authenticated users" on public.progress;
drop policy if exists "Allow insert for authenticated users" on public.progress;
drop policy if exists "Allow update for authenticated users" on public.progress;
drop policy if exists "Allow delete for authenticated users" on public.progress;
drop policy if exists "Allow select for all" on public.progress;

-- Policy para permitir SELECT a cualquier usuario (debug, no recomendado en producción)
create policy "Allow select for all" on public.progress
  for select
  using (true);

-- Exponer la tabla en la API REST
-- (Esto es automático en Supabase si la tabla está en el schema public y tienes policies)

-- Si necesitas exponer funciones personalizadas, crea las RPCs aquí

-- Listo para usar desde la API REST de Supabase
