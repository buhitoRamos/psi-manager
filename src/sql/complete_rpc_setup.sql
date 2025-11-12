-- ========================================
-- SCRIPT COMPLETO PARA CONFIGURAR TODOS LOS RPC ENDPOINTS
-- Ejecutar en Supabase SQL Editor (Dashboard > SQL Editor)
-- Fecha: 12 de noviembre de 2025
-- ========================================

-- 1. FUNCIÓN PARA AUTENTICACIÓN SEGURA
-- Verifica credenciales y devuelve información del usuario
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
    stored_password text;
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
    
    -- Verificar contraseña (aquí deberías usar bcrypt o similar en producción)
    IF user_record.password = password_param THEN
        RETURN QUERY SELECT true, user_record.id, 'Autenticación exitosa'::text;
    ELSE
        RETURN QUERY SELECT false, NULL::bigint, 'Contraseña incorrecta'::text;
    END IF;
END;
$$;

-- 2. FUNCIÓN PARA OBTENER PACIENTES POR USER_ID
CREATE OR REPLACE FUNCTION get_patients_by_user_id(user_id_param bigint)
RETURNS TABLE(
    id bigint,
    created_at timestamptz,
    name varchar,
    last_name varchar,
    tel varchar,
    email varchar,
    dir text,
    age bigint,
    finish timestamptz,
    health_insurance varchar,
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

-- 3. FUNCIÓN PARA CREAR PACIENTE (alternativa al INSERT directo)
CREATE OR REPLACE FUNCTION create_patient(
    name_param varchar,
    last_name_param varchar DEFAULT NULL,
    tel_param varchar DEFAULT NULL,
    email_param varchar DEFAULT NULL,
    dir_param text DEFAULT NULL,
    age_param bigint DEFAULT NULL,
    health_insurance_param varchar DEFAULT NULL,
    reason_param text DEFAULT NULL,
    user_id_param bigint
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
    finish timestamptz,
    health_insurance varchar,
    reason text,
    user_id bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    new_patient_id bigint;
BEGIN
    INSERT INTO patients (
        name, 
        last_name, 
        tel, 
        email, 
        dir, 
        age, 
        health_insurance, 
        reason, 
        user_id
    )
    VALUES (
        name_param,
        last_name_param,
        tel_param,
        email_param,
        dir_param,
        age_param,
        health_insurance_param,
        reason_param,
        user_id_param
    )
    RETURNING patients.id INTO new_patient_id;
    
    -- Devolver el paciente recién creado
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
    WHERE p.id = new_patient_id;
END;
$$;

-- 4. FUNCIÓN PARA ACTUALIZAR PACIENTE (alternativa al UPDATE directo)
CREATE OR REPLACE FUNCTION update_patient_by_id(
    patient_id_param bigint,
    name_param varchar DEFAULT NULL,
    last_name_param varchar DEFAULT NULL,
    tel_param varchar DEFAULT NULL,
    email_param varchar DEFAULT NULL,
    dir_param text DEFAULT NULL,
    age_param bigint DEFAULT NULL,
    health_insurance_param varchar DEFAULT NULL,
    reason_param text DEFAULT NULL,
    user_id_param bigint -- Para verificar que el paciente pertenece al usuario
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
    finish timestamptz,
    health_insurance varchar,
    reason text,
    user_id bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Actualizar solo si el paciente pertenece al usuario
    UPDATE patients 
    SET 
        name = COALESCE(name_param, patients.name),
        last_name = COALESCE(last_name_param, patients.last_name),
        tel = COALESCE(tel_param, patients.tel),
        email = COALESCE(email_param, patients.email),
        dir = COALESCE(dir_param, patients.dir),
        age = COALESCE(age_param, patients.age),
        health_insurance = COALESCE(health_insurance_param, patients.health_insurance),
        reason = COALESCE(reason_param, patients.reason)
    WHERE patients.id = patient_id_param 
    AND patients.user_id = user_id_param;
    
    -- Verificar que se actualizó algo
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Paciente no encontrado o no pertenece al usuario';
    END IF;
    
    -- Devolver el paciente actualizado
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
    WHERE p.id = patient_id_param;
END;
$$;

-- ========================================
-- OTORGAR PERMISOS A LOS ROLES
-- ========================================

-- Permisos para auth_check_secure
GRANT EXECUTE ON FUNCTION auth_check_secure(text, text) TO anon;
GRANT EXECUTE ON FUNCTION auth_check_secure(text, text) TO authenticated;

-- Permisos para get_patients_by_user_id
GRANT EXECUTE ON FUNCTION get_patients_by_user_id(bigint) TO anon;
GRANT EXECUTE ON FUNCTION get_patients_by_user_id(bigint) TO authenticated;

-- Permisos para create_patient
GRANT EXECUTE ON FUNCTION create_patient(varchar, varchar, varchar, varchar, text, bigint, varchar, text, bigint) TO anon;
GRANT EXECUTE ON FUNCTION create_patient(varchar, varchar, varchar, varchar, text, bigint, varchar, text, bigint) TO authenticated;

-- Permisos para update_patient_by_id
GRANT EXECUTE ON FUNCTION update_patient_by_id(bigint, varchar, varchar, varchar, varchar, text, bigint, varchar, text, bigint) TO anon;
GRANT EXECUTE ON FUNCTION update_patient_by_id(bigint, varchar, varchar, varchar, varchar, text, bigint, varchar, text, bigint) TO authenticated;

-- ========================================
-- COMENTARIOS PARA DOCUMENTACIÓN
-- ========================================

COMMENT ON FUNCTION auth_check_secure(text, text) IS 'Verifica credenciales de usuario y devuelve información de autenticación';
COMMENT ON FUNCTION get_patients_by_user_id(bigint) IS 'Obtiene todos los pacientes de un usuario específico';
COMMENT ON FUNCTION create_patient(varchar, varchar, varchar, varchar, text, bigint, varchar, text, bigint) IS 'Crea un nuevo paciente y devuelve sus datos';
COMMENT ON FUNCTION update_patient_by_id(bigint, varchar, varchar, varchar, varchar, text, bigint, varchar, text, bigint) IS 'Actualiza un paciente existente si pertenece al usuario';

-- ========================================
-- INSTRUCCIONES DE USO
-- ========================================

/*
CÓMO USAR ESTOS ENDPOINTS:

1. Para autenticación:
   POST /rest/v1/rpc/auth_check_secure
   Body: {"email_param": "user@example.com", "password_param": "password123"}

2. Para obtener pacientes:
   POST /rest/v1/rpc/get_patients_by_user_id
   Body: {"user_id_param": 1}

3. Para crear paciente:
   POST /rest/v1/rpc/create_patient
   Body: {
     "name_param": "Juan",
     "last_name_param": "Pérez",
     "tel_param": "123456789",
     "email_param": "juan@example.com",
     "user_id_param": 1
   }

4. Para actualizar paciente:
   POST /rest/v1/rpc/update_patient_by_id
   Body: {
     "patient_id_param": 5,
     "name_param": "Juan Carlos",
     "last_name_param": "Pérez García",
     "user_id_param": 1
   }

IMPORTANTE: 
- Todas las funciones usan SECURITY DEFINER para ejecutarse con permisos elevados
- Las funciones de pacientes verifican que pertenezcan al usuario correcto
- Los parámetros opcionales se pueden omitir en las llamadas RPC
*/