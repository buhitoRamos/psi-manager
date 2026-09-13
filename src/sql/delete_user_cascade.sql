-- ========================================
-- FUNCIÓN RPC PARA ELIMINAR USUARIO EN CASCADA
-- Ejecutar en Supabase SQL Editor
-- ========================================
-- Elimina un usuario y todos sus datos relacionados (pacientes, turnos,
-- pagos, contribuciones, progreso y estado de acceso) saltándose el RLS
-- gracias a SECURITY DEFINER.

CREATE OR REPLACE FUNCTION delete_user_cascade(user_id_param bigint)
RETURNS TABLE(success boolean, message text)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_exists boolean;
BEGIN
  -- Verificar que el usuario existe
  SELECT EXISTS(SELECT 1 FROM users WHERE id = user_id_param) INTO user_exists;

  IF NOT user_exists THEN
    RETURN QUERY SELECT false, 'Usuario no encontrado'::text;
    RETURN;
  END IF;

  -- Eliminar en cascada todas las tablas relacionadas.
  -- (Las FK con ON DELETE CASCADE ya lo harían, pero lo hacemos explícito
  -- para cubrir tablas sin FK o con ON DELETE SET NULL.)
  DELETE FROM appointments   WHERE user_id = user_id_param;
  DELETE FROM contributions  WHERE user_id = user_id_param;
  DELETE FROM progress       WHERE user_id = user_id_param;
  DELETE FROM admin_payments WHERE user_id = user_id_param;
  DELETE FROM auth_status    WHERE user_id = user_id_param;
  DELETE FROM patients       WHERE user_id = user_id_param;

  -- Finalmente eliminar el usuario
  DELETE FROM users WHERE id = user_id_param;

  RETURN QUERY SELECT true, 'Usuario eliminado correctamente'::text;
END;
$$;

-- Otorgar permisos para ejecutar la función
GRANT EXECUTE ON FUNCTION delete_user_cascade(bigint) TO anon;
GRANT EXECUTE ON FUNCTION delete_user_cascade(bigint) TO authenticated;

COMMENT ON FUNCTION delete_user_cascade(bigint) IS
  'Elimina un usuario y todos sus datos relacionados en cascada (bypassea RLS)';
