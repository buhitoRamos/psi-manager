-- Script simplificado para habilitar edición de pacientes via REST API
-- Ejecutar en el SQL Editor de Supabase

-- ========================================
-- OPCIÓN SIMPLE: USAR REST API DIRECTO
-- ========================================

-- 1. Habilitar permisos básicos para la tabla patients
GRANT SELECT, INSERT, UPDATE, DELETE ON patients TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON patients TO authenticated;

-- 2. Deshabilitar temporalmente RLS para testing (CUIDADO: solo para desarrollo)
ALTER TABLE patients DISABLE ROW LEVEL SECURITY;

-- 3. Verificar que la columna updated_at existe, si no, crearla
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'patients' AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE patients ADD COLUMN updated_at timestamptz DEFAULT NOW();
        UPDATE patients SET updated_at = created_at WHERE updated_at IS NULL;
    END IF;
END $$;

-- 4. Crear trigger para auto-actualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_patients_updated_at ON patients;
CREATE TRIGGER update_patients_updated_at
    BEFORE UPDATE ON patients
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- VERIFICACIÓN
-- ========================================

-- Verificar permisos
SELECT grantee, privilege_type 
FROM information_schema.role_table_grants 
WHERE table_name = 'patients' 
AND grantee IN ('anon', 'authenticated');

-- Verificar RLS status
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'patients';

-- Test: Ver algunos pacientes
SELECT id, name, last_name, user_id, created_at, updated_at 
FROM patients 
LIMIT 3;

SELECT 'Configuración básica completada. Tu API REST puede ahora hacer UPDATE a patients.' as status;

-- ========================================
-- NOTAS IMPORTANTES
-- ========================================

/*
ESTE SCRIPT DESHABILITA RLS TEMPORALMENTE PARA FACILITAR EL DESARROLLO.

EN PRODUCCIÓN, DEBERÍAS:
1. Habilitar RLS: ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
2. Crear políticas específicas para cada operación
3. Usar autenticación JWT adecuada

POLÍTICAS DE SEGURIDAD RECOMENDADAS PARA PRODUCCIÓN:

-- Política para usuarios autenticados
CREATE POLICY "Users can manage own patients" ON patients
    FOR ALL USING (auth.uid()::text = user_id::text);

-- Política más restrictiva por operación
CREATE POLICY "Users can view own patients" ON patients
    FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can update own patients" ON patients
    FOR UPDATE USING (auth.uid()::text = user_id::text)
    WITH CHECK (auth.uid()::text = user_id::text);
*/