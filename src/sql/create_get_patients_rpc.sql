-- Crear función RPC para obtener pacientes por user_id
-- Ejecutar en Supabase SQL Editor

-- Función para obtener pacientes por user_id
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
SECURITY DEFINER -- Ejecuta con permisos del creador de la función
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
        p.health_insurance,
        p.reason,
        p.finish,
        p.age,
        p.user_id
    FROM patients p
    WHERE p.user_id = user_id_param
    ORDER BY p.created_at DESC;
END;
$$;

-- Otorgar permisos para ejecutar la función
GRANT EXECUTE ON FUNCTION get_patients_by_user_id(bigint) TO anon;
GRANT EXECUTE ON FUNCTION get_patients_by_user_id(bigint) TO authenticated;

-- Comentario para documentación
COMMENT ON FUNCTION get_patients_by_user_id(bigint) IS 'Obtiene todos los pacientes de un usuario específico usando su user_id';