-- ========================================
-- SCRIPT BÁSICO - SOLO LOS RPC QUE USAS ACTUALMENTE
-- Ejecutar en Supabase SQL Editor
-- ========================================

-- ELIMINAR FUNCIONES EXISTENTES (si existen)
DROP FUNCTION IF EXISTS auth_check_secure(text, text);
DROP FUNCTION IF EXISTS get_patients_by_user_id(bigint);
DROP FUNCTION IF EXISTS delete_patient_by_id(bigint, bigint);

-- 1. FUNCIÓN DE AUTENTICACIÓN (la que ya usas)
CREATE OR REPLACE FUNCTION auth_check_secure(
    email_param text,
    password_param text
)
RETURNS TABLE(
    success boolean,
    user_id bigint,
    message text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_record RECORD;
BEGIN
    -- Buscar el usuario por email
    SELECT id, password INTO user_record
    FROM users 
    WHERE email = email_param;
    
    -- Si no existe el usuario
    IF NOT FOUND THEN
        RETURN QUERY SELECT false, NULL::bigint, 'Usuario no encontrado'::text;
        RETURN;
    END IF;
    
    -- Verificar contraseña
    IF user_record.password = password_param THEN
        RETURN QUERY SELECT true, user_record.id, 'Autenticación exitosa'::text;
    ELSE
        RETURN QUERY SELECT false, NULL::bigint, 'Contraseña incorrecta'::text;
    END IF;
END;
$$;

-- 2. FUNCIÓN PARA OBTENER PACIENTES (la que ya usas)
CREATE OR REPLACE FUNCTION get_patients_by_user_id(user_id_param bigint)
RETURNS TABLE(
    id bigint,
    created_at timestamptz,
    name text,
    last_name text,
    tel text,
    email text,
    dir text,
    age bigint,
    finish timestamptz,
    health_insurance text,
    reason text,
    user_id bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.created_at,
        p.name,
        p.last_name,
        p.tel,
        p.email,
        p.dir,
        p.age,
        p.finish,
        p.health_insurance,
        p.reason,
        p.user_id
    FROM patients p
    WHERE p.user_id = user_id_param
    ORDER BY p.created_at DESC;
END;
$$;

-- OTORGAR PERMISOS
GRANT EXECUTE ON FUNCTION auth_check_secure(text, text) TO anon;
GRANT EXECUTE ON FUNCTION auth_check_secure(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION get_patients_by_user_id(bigint) TO anon;
GRANT EXECUTE ON FUNCTION get_patients_by_user_id(bigint) TO authenticated;

-- 3. FUNCIÓN PARA ELIMINAR PACIENTE (nueva)
CREATE OR REPLACE FUNCTION delete_patient_by_id(
    patient_id_param bigint,
    user_id_param bigint
)
RETURNS TABLE(
    success boolean,
    message text,
    deleted_id bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    patient_exists boolean;
    deleted_patient_id bigint;
BEGIN
    -- Verificar que el paciente existe y pertenece al usuario
    SELECT EXISTS(
        SELECT 1 FROM patients 
        WHERE id = patient_id_param 
        AND user_id = user_id_param
    ) INTO patient_exists;
    
    IF NOT patient_exists THEN
        RETURN QUERY SELECT false, 'Paciente no encontrado o no pertenece al usuario'::text, NULL::bigint;
        RETURN;
    END IF;
    
    -- Eliminar el paciente
    DELETE FROM patients 
    WHERE id = patient_id_param 
    AND user_id = user_id_param
    RETURNING id INTO deleted_patient_id;
    
    -- Verificar que se eliminó
    IF deleted_patient_id IS NOT NULL THEN
        RETURN QUERY SELECT true, 'Paciente eliminado exitosamente'::text, deleted_patient_id;
    ELSE
        RETURN QUERY SELECT false, 'Error al eliminar el paciente'::text, NULL::bigint;
    END IF;
END;
$$;

-- OTORGAR PERMISOS PARA DELETE
GRANT EXECUTE ON FUNCTION delete_patient_by_id(bigint, bigint) TO anon;
GRANT EXECUTE ON FUNCTION delete_patient_by_id(bigint, bigint) TO authenticated;

-- DOCUMENTACIÓN
COMMENT ON FUNCTION auth_check_secure(text, text) IS 'Verifica credenciales de usuario';
COMMENT ON FUNCTION get_patients_by_user_id(bigint) IS 'Obtiene pacientes de un usuario específico';
COMMENT ON FUNCTION delete_patient_by_id(bigint, bigint) IS 'Elimina un paciente verificando que pertenezca al usuario';