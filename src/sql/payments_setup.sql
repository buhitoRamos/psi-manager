-- Script SQL para configurar la tabla de pagos (contributions) en Supabase
-- Ejecutar en consola SQL de Supabase si es necesario

-- Verificar que la tabla contributions exista y tenga la estructura correcta
-- (basado en los datos que proporcionaste)

-- Si la tabla no existe, crearla:
CREATE TABLE IF NOT EXISTS contributions (
    id BIGSERIAL PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    patient_id BIGINT REFERENCES patients(id) ON DELETE CASCADE,
    user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
    contribution_ob TEXT,
    payment DECIMAL(10,2) NOT NULL
);

-- Índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_contributions_patient_id ON contributions(patient_id);
CREATE INDEX IF NOT EXISTS idx_contributions_user_id ON contributions(user_id);
CREATE INDEX IF NOT EXISTS idx_contributions_created_at ON contributions(created_at DESC);

-- Habilitar RLS (Row Level Security)
ALTER TABLE contributions ENABLE ROW LEVEL SECURITY;

-- Eliminar políticas existentes si existen
DROP POLICY IF EXISTS "Users can view own contributions" ON contributions;
DROP POLICY IF EXISTS "Users can insert own contributions" ON contributions;
DROP POLICY IF EXISTS "Users can update own contributions" ON contributions;
DROP POLICY IF EXISTS "Users can delete own contributions" ON contributions;

-- Como usamos autenticación personalizada sin Supabase Auth, 
-- vamos a deshabilitar RLS temporalmente o usar políticas permisivas
-- para que funcione con nuestra API REST directa

-- Opción 1: Deshabilitar RLS (más simple para desarrollo)
ALTER TABLE contributions DISABLE ROW LEVEL SECURITY;

-- Opción 2: Si quieres mantener RLS, usar políticas permisivas
-- (descomenta las siguientes líneas y comenta la línea DISABLE de arriba)

-- CREATE POLICY "Enable all operations for anon users" ON contributions
--     FOR ALL USING (true) WITH CHECK (true);

-- Función RPC para obtener pagos con información del paciente
CREATE OR REPLACE FUNCTION get_payments_with_patient_info(user_id_param BIGINT)
RETURNS TABLE(
  id BIGINT,
  created_at TIMESTAMPTZ,
  patient_id BIGINT,
  user_id BIGINT,
  contribution_ob TEXT,
  payment DECIMAL(10,2),
  patient_name TEXT,
  patient_last_name TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.created_at,
    c.patient_id,
    c.user_id,
    c.contribution_ob,
    c.payment,
    p.name,
    p.last_name
  FROM contributions c
  JOIN patients p ON c.patient_id = p.id
  WHERE c.user_id = user_id_param
  ORDER BY c.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Mensaje de confirmación
DO $$
BEGIN
    RAISE NOTICE '✅ Tabla contributions configurada correctamente para gestión de pagos.';
END $$;