-- ========================================
-- SCRIPT PARA AGREGAR FUNCIÓN RPC DELETE PATIENT
-- Ejecutar en Supabase SQL Editor
-- ========================================

-- Función RPC para eliminar un paciente por ID y user_id (seguridad)
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

-- Otorgar permisos para ejecutar la función
GRANT EXECUTE ON FUNCTION delete_patient_by_id(bigint, bigint) TO anon;
GRANT EXECUTE ON FUNCTION delete_patient_by_id(bigint, bigint) TO authenticated;

-- Documentación
COMMENT ON FUNCTION delete_patient_by_id(bigint, bigint) IS 'Elimina un paciente verificando que pertenezca al usuario';

-- ========================================
-- INSTRUCCIONES DE USO
-- ========================================

/*
CÓMO USAR EL ENDPOINT DELETE:

Opción 1 - RPC (Recomendado):
POST /rest/v1/rpc/delete_patient_by_id
Body: {
  "patient_id_param": 5,
  "user_id_param": 1
}

Opción 2 - REST directo (el que ya usas):
DELETE /rest/v1/patients?id=eq.5&user_id=eq.1

La función RPC es más segura porque:
- Verifica explícitamente la pertenencia del paciente al usuario
- Devuelve información estructurada sobre el resultado
- Mejor manejo de errores

IMPORTANTE:
- Ambos métodos requieren que las políticas RLS permitan DELETE
- La función RPC usa SECURITY DEFINER para ejecutarse con permisos elevados
- Siempre verifica que user_id coincida para seguridad
*/