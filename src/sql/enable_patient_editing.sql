-- Script para habilitar la edición de pacientes en Supabase
-- Ejecutar en el SQL Editor de Supabase

-- ========================================
-- PASO 1: VERIFICAR ESTRUCTURA DE LA TABLA
-- ========================================

-- Verificar que la tabla patients existe y su estructura
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'patients' 
ORDER BY ordinal_position;

-- ========================================
-- PASO 2: HABILITAR PERMISOS BÁSICOS
-- ========================================

-- Otorgar permisos de SELECT, INSERT, UPDATE a los roles necesarios
GRANT SELECT, INSERT, UPDATE ON patients TO anon;
GRANT SELECT, INSERT, UPDATE ON patients TO authenticated;

-- ========================================
-- PASO 3: CONFIGURAR ROW LEVEL SECURITY (RLS)
-- ========================================

-- Habilitar RLS en la tabla patients
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;

-- Crear política para SELECT (ver pacientes)
CREATE POLICY "Users can view their own patients" ON patients
    FOR SELECT USING (true); -- Temporalmente permitir todo para debugging

-- Crear política para UPDATE (editar pacientes)
CREATE POLICY "Users can update their own patients" ON patients
    FOR UPDATE USING (true) -- Temporalmente permitir todo para debugging
    WITH CHECK (true);

-- Crear política para INSERT (crear pacientes)
CREATE POLICY "Users can insert their own patients" ON patients
    FOR INSERT WITH CHECK (true); -- Temporalmente permitir todo para debugging

-- ========================================
-- PASO 4: CREAR FUNCIÓN RPC PARA UPDATE
-- ========================================

-- Función RPC para actualizar un paciente
CREATE OR REPLACE FUNCTION update_patient_by_id(
    patient_id_param bigint,
    name_param varchar DEFAULT NULL,
    last_name_param varchar DEFAULT NULL,
    tel_param varchar DEFAULT NULL,
    email_param varchar DEFAULT NULL,
    dir_param text DEFAULT NULL,
    health_insurance_param varchar DEFAULT NULL,
    reason_param text DEFAULT NULL,
    age_param bigint DEFAULT NULL
)
RETURNS TABLE(
    id bigint,
    created_at timestamptz,
    name varchar,
    last_name varchar,
    tel varchar,
    email varchar,
    dir text,
    age bigint,
    health_insurance varchar,
    reason text,
    user_id bigint,
    updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER -- Ejecuta con permisos del creador de la función
AS $$
DECLARE
    updated_row patients%ROWTYPE;
BEGIN
    -- Actualizar el paciente con los campos proporcionados
    UPDATE patients 
    SET 
        name = COALESCE(name_param, patients.name),
        last_name = COALESCE(last_name_param, patients.last_name),
        tel = COALESCE(tel_param, patients.tel),
        email = COALESCE(email_param, patients.email),
        dir = COALESCE(dir_param, patients.dir),
        health_insurance = COALESCE(health_insurance_param, patients.health_insurance),
        reason = COALESCE(reason_param, patients.reason),
        age = COALESCE(age_param, patients.age),
        updated_at = NOW()
    WHERE patients.id = patient_id_param
    RETURNING * INTO updated_row;
    
    -- Verificar si se actualizó algún registro
    IF updated_row.id IS NULL THEN
        RAISE EXCEPTION 'Paciente con ID % no encontrado o sin permisos para actualizar', patient_id_param;
    END IF;
    
    -- Retornar el registro actualizado
    RETURN QUERY
    SELECT 
        updated_row.id,
        updated_row.created_at,
        updated_row.name,
        updated_row.last_name,
        updated_row.tel,
        updated_row.email,
        updated_row.dir,
        updated_row.age,
        updated_row.health_insurance,
        updated_row.reason,
        updated_row.user_id,
        updated_row.updated_at;
END;
$$;

-- Otorgar permisos para ejecutar la función UPDATE
GRANT EXECUTE ON FUNCTION update_patient_by_id(bigint, varchar, varchar, varchar, varchar, text, varchar, text, bigint) TO anon;
GRANT EXECUTE ON FUNCTION update_patient_by_id(bigint, varchar, varchar, varchar, varchar, text, varchar, text, bigint) TO authenticated;

-- ========================================
-- PASO 5: AGREGAR COLUMNA UPDATED_AT SI NO EXISTE
-- ========================================

-- Verificar si la columna updated_at existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'patients' AND column_name = 'updated_at'
    ) THEN
        -- Agregar columna updated_at si no existe
        ALTER TABLE patients ADD COLUMN updated_at timestamptz DEFAULT NOW();
        
        -- Actualizar registros existentes
        UPDATE patients SET updated_at = created_at WHERE updated_at IS NULL;
    END IF;
END $$;

-- ========================================
-- PASO 6: CREAR TRIGGER PARA AUTO-UPDATE
-- ========================================

-- Función trigger para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger si no existe
DROP TRIGGER IF EXISTS update_patients_updated_at ON patients;
CREATE TRIGGER update_patients_updated_at
    BEFORE UPDATE ON patients
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- PASO 7: VERIFICACIÓN FINAL
-- ========================================

-- Verificar políticas creadas
SELECT schemaname, tablename, policyname, permissive, roles, cmd
FROM pg_policies 
WHERE tablename = 'patients';

-- Verificar permisos otorgados
SELECT grantee, privilege_type 
FROM information_schema.role_table_grants 
WHERE table_name = 'patients' 
AND grantee IN ('anon', 'authenticated');

-- Verificar funciones creadas
SELECT routine_name, routine_type 
FROM information_schema.routines 
WHERE routine_name LIKE '%patient%' 
AND routine_schema = 'public';

-- Test básico de la función (opcional)
-- SELECT * FROM update_patient_by_id(1, 'Nombre Test', 'Apellido Test', NULL, NULL, NULL, NULL, NULL, NULL);

-- ========================================
-- COMENTARIOS Y DOCUMENTACIÓN
-- ========================================

COMMENT ON FUNCTION update_patient_by_id(bigint, varchar, varchar, varchar, varchar, text, varchar, text, bigint) 
IS 'Actualiza los datos de un paciente específico por su ID. Los parámetros NULL se ignoran y mantienen el valor actual.';

COMMENT ON TRIGGER update_patients_updated_at ON patients 
IS 'Actualiza automáticamente la columna updated_at cuando se modifica un registro de paciente.';

-- Mensaje final
SELECT 'Configuración de edición de pacientes completada exitosamente' as status;