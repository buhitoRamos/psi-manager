-- Script de diagnóstico y solución para tabla patients
-- Ejecutar en Supabase SQL Editor

-- 1. Verificar si RLS está habilitado en la tabla patients
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'patients';

-- 2. Verificar las políticas existentes en la tabla patients
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'patients';

-- 3. Contar total de registros en patients (esto debería funcionar como superuser)
SELECT COUNT(*) as total_patients FROM patients;

-- 4. Ver algunos registros de ejemplo
SELECT id, name, last_name, user_id, created_at 
FROM patients 
LIMIT 5;

-- 5. SOLUCIÓN: Deshabilitar RLS temporalmente para testing
-- CUIDADO: Esto permite acceso completo a todos los datos
ALTER TABLE patients DISABLE ROW LEVEL SECURITY;

-- 6. Alternativamente, crear una política permisiva para testing
-- (Ejecutar solo si decides mantener RLS habilitado)
/*
-- Eliminar políticas existentes si las hay
DROP POLICY IF EXISTS "Allow all access for testing" ON patients;

-- Crear política que permita todo acceso (solo para testing)
CREATE POLICY "Allow all access for testing" ON patients
    FOR ALL
    USING (true)
    WITH CHECK (true);
*/

-- 7. Verificar permisos de la tabla para el rol anon
SELECT grantee, privilege_type 
FROM information_schema.role_table_grants 
WHERE table_name = 'patients' AND grantee = 'anon';

-- 8. Si no hay permisos para anon, otorgarlos
GRANT SELECT ON patients TO anon;
GRANT SELECT ON patients TO authenticated;

-- 9. Verificar nuevamente después de los cambios
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'patients';