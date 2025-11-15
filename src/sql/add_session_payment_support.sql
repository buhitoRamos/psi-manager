-- Script para agregar soporte de pago de sesiones
-- Ejecutar en consola SQL de Supabase

-- Agregar columna appointment_id a la tabla contributions para vincular pagos con turnos específicos
ALTER TABLE contributions 
ADD COLUMN IF NOT EXISTS appointment_id BIGINT REFERENCES appointments(id) ON DELETE SET NULL;

-- Crear índice para mejorar el rendimiento de consultas por appointment_id
CREATE INDEX IF NOT EXISTS idx_contributions_appointment_id ON contributions(appointment_id);

-- Agregar columnas adicionales para mejorar la gestión de pagos de sesiones
ALTER TABLE contributions 
ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'efectivo',
ADD COLUMN IF NOT EXISTS payment_date TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Función RPC actualizada para crear pagos con soporte para appointment_id
CREATE OR REPLACE FUNCTION create_payment_with_appointment(
  patient_id_param BIGINT,
  user_id_param BIGINT,
  amount_param DECIMAL(10,2),
  payment_method_param TEXT DEFAULT 'sesion',
  notes_param TEXT DEFAULT NULL,
  appointment_id_param BIGINT DEFAULT NULL
)
RETURNS TABLE(
  id BIGINT,
  created_at TIMESTAMPTZ,
  patient_id BIGINT,
  user_id BIGINT,
  payment DECIMAL(10,2),
  payment_method TEXT,
  notes TEXT,
  appointment_id BIGINT
) AS $$
DECLARE
  new_payment_id BIGINT;
BEGIN
  -- Verificar que el usuario tenga acceso al paciente
  IF NOT EXISTS (
    SELECT 1 FROM patients p
    WHERE p.id = patient_id_param AND p.user_id = user_id_param
  ) THEN
    RAISE EXCEPTION 'No tienes acceso a este paciente';
  END IF;

  -- Si se proporciona appointment_id, verificar que el turno pertenezca al usuario
  IF appointment_id_param IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM appointments a
      WHERE a.id = appointment_id_param AND a.user_id = user_id_param AND a.patient_id = patient_id_param
    ) THEN
      RAISE EXCEPTION 'No tienes acceso a este turno';
    END IF;
  END IF;

  -- Crear el pago
  INSERT INTO contributions (
    patient_id, 
    user_id, 
    payment, 
    payment_method,
    payment_date,
    contribution_ob,
    appointment_id
  )
  VALUES (
    patient_id_param, 
    user_id_param, 
    amount_param,
    payment_method_param,
    NOW(),
    notes_param,
    appointment_id_param
  )
  RETURNING contributions.id INTO new_payment_id;

  -- Retornar la información del pago creado
  RETURN QUERY 
  SELECT 
    new_payment_id,
    NOW(),
    patient_id_param,
    user_id_param,
    amount_param,
    payment_method_param,
    notes_param,
    appointment_id_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para obtener pagos vinculados a turnos específicos
CREATE OR REPLACE FUNCTION get_session_payments_by_user(user_id_param BIGINT)
RETURNS TABLE(
  id BIGINT,
  created_at TIMESTAMPTZ,
  patient_id BIGINT,
  user_id BIGINT,
  payment DECIMAL(10,2),
  payment_method TEXT,
  notes TEXT,
  appointment_id BIGINT,
  patient_name TEXT,
  patient_last_name TEXT,
  appointment_date TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.created_at,
    c.patient_id,
    c.user_id,
    c.payment,
    COALESCE(c.payment_method, 'efectivo') as payment_method,
    COALESCE(c.contribution_ob, c.notes) as notes,
    c.appointment_id,
    p.name,
    p.last_name,
    a.date as appointment_date
  FROM contributions c
  JOIN patients p ON c.patient_id = p.id
  LEFT JOIN appointments a ON c.appointment_id = a.id
  WHERE c.user_id = user_id_param
  ORDER BY c.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grants para las nuevas funciones
GRANT EXECUTE ON FUNCTION create_payment_with_appointment TO authenticated;
GRANT EXECUTE ON FUNCTION get_session_payments_by_user TO authenticated;

-- Mensaje de confirmación
DO $$
BEGIN
    RAISE NOTICE '✅ Soporte para pago de sesiones agregado correctamente.';
    RAISE NOTICE '✅ Tabla contributions actualizada con appointment_id.';
    RAISE NOTICE '✅ Funciones create_payment_with_appointment y get_session_payments_by_user creadas.';
    RAISE NOTICE 'ℹ️  Para crear pago de sesión: SELECT * FROM create_payment_with_appointment(patient_id, user_id, amount, payment_method, notes, appointment_id);';
    RAISE NOTICE 'ℹ️  Para obtener pagos de sesiones: SELECT * FROM get_session_payments_by_user(user_id);';
END $$;