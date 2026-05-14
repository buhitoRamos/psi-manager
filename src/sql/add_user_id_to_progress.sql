-- ========================================
-- Agregar columna user_id a la tabla progress
-- Ejecutar en Supabase SQL Editor
-- ========================================

-- 1. Agregar columna user_id con foreign key a users(id)
ALTER TABLE public.progress
ADD COLUMN IF NOT EXISTS user_id bigint REFERENCES users(id) ON DELETE CASCADE;

-- 2. Actualizar registros existentes: asignar user_id basado en el paciente
-- (Esto asocia cada progreso al user_id del paciente correspondiente)
UPDATE public.progress p
SET user_id = pt.user_id
FROM patients pt
WHERE p.patient_id = pt.id
  AND p.user_id IS NULL;

-- 3. Agregar política RLS para filtrar por user_id
DROP POLICY IF EXISTS "Allow select for all" ON public.progress;
DROP POLICY IF EXISTS "Allow insert for all" ON public.progress;
DROP POLICY IF EXISTS "Allow update for all" ON public.progress;
DROP POLICY IF EXISTS "Allow delete for all" ON public.progress;

-- SELECT: cualquier usuario puede leer, pero la app filtra por user_id
CREATE POLICY "Allow select for all" ON public.progress
  FOR SELECT USING (true);

-- INSERT: cualquier usuario puede insertar
CREATE POLICY "Allow insert for all" ON public.progress
  FOR INSERT WITH CHECK (true);

-- UPDATE: cualquier usuario puede actualizar
CREATE POLICY "Allow update for all" ON public.progress
  FOR UPDATE USING (true) WITH CHECK (true);

-- DELETE: cualquier usuario puede eliminar
CREATE POLICY IF NOT EXISTS "Allow delete for all" ON public.progress
  FOR DELETE USING (true);