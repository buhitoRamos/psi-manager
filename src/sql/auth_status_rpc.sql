-- ========================================
-- CONFIGURACIÓN COMPLETA PARA auth_status
-- Ejecutar TODO en Supabase SQL Editor
-- ========================================

-- 1. Asegurar que la tabla auth_status existe
CREATE TABLE IF NOT EXISTS auth_status (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id bigint NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

-- 2. Habilitar RLS en la tabla
ALTER TABLE auth_status ENABLE ROW LEVEL SECURITY;

-- 3. Políticas RLS para permitir acceso completo con anon key
-- (La app usa la anon key para gestionar estados de usuario)

-- Permitir SELECT para todos
DROP POLICY IF EXISTS "Allow anon read auth_status" ON auth_status;
CREATE POLICY "Allow anon read auth_status" ON auth_status
  FOR SELECT
  USING (true);

-- Permitir INSERT para todos
DROP POLICY IF EXISTS "Allow anon insert auth_status" ON auth_status;
CREATE POLICY "Allow anon insert auth_status" ON auth_status
  FOR INSERT
  WITH CHECK (true);

-- Permitir UPDATE para todos
DROP POLICY IF EXISTS "Allow anon update auth_status" ON auth_status;
CREATE POLICY "Allow anon update auth_status" ON auth_status
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Permitir DELETE para todos
DROP POLICY IF EXISTS "Allow anon delete auth_status" ON auth_status;
CREATE POLICY "Allow anon delete auth_status" ON auth_status
  FOR DELETE
  USING (true);

-- ========================================
-- FUNCIONES RPC (SECURITY DEFINER - bypassean RLS)
-- ========================================

-- 4. Obtener el estado de un usuario
CREATE OR REPLACE FUNCTION get_auth_status(user_id_param bigint)
RETURNS TABLE(id bigint, user_id bigint, status boolean)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT id, user_id, status
  FROM auth_status
  WHERE user_id = user_id_param;
$$;

-- 5. Actualizar o crear el estado de un usuario (upsert)
CREATE OR REPLACE FUNCTION set_auth_status(user_id_param bigint, status_param boolean)
RETURNS TABLE(id bigint, user_id bigint, status boolean)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  existing_id bigint;
BEGIN
  SELECT id INTO existing_id FROM auth_status WHERE user_id = user_id_param;

  IF existing_id IS NOT NULL THEN
    UPDATE auth_status SET status = status_param WHERE user_id = user_id_param
    RETURNING auth_status.id, auth_status.user_id, auth_status.status INTO id, user_id, status;
  ELSE
    INSERT INTO auth_status (user_id, status) VALUES (user_id_param, status_param)
    RETURNING auth_status.id, auth_status.user_id, auth_status.status INTO id, user_id, status;
  END IF;

  RETURN NEXT;
END;
$$;

-- 6. Verificar si un usuario puede acceder
CREATE OR REPLACE FUNCTION can_user_access(user_id_param bigint)
RETURNS TABLE(can_access boolean)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT COALESCE(
    (SELECT status FROM auth_status WHERE user_id = user_id_param),
    true
  ) AS can_access;
$$;