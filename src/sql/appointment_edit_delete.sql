-- Funciones adicionales para editar y eliminar turnos
-- Ejecutar en consola SQL de Supabase

-- Función RPC para actualizar una cita existente
CREATE OR REPLACE FUNCTION update_appointment(
  appointment_id_param BIGINT,
  user_id_param BIGINT,
  date_param TIMESTAMPTZ,
  frequency_param TEXT DEFAULT 'unica',
  status_param TEXT DEFAULT 'en_espera',
  amount_param DECIMAL(10,2) DEFAULT 0,
  observation_param TEXT DEFAULT NULL
)
RETURNS TABLE(
  id BIGINT,
  patient_id BIGINT,
  user_id BIGINT,
  date TIMESTAMPTZ,
  frequency TEXT,
  status TEXT,
  amount DECIMAL(10,2),
  observation TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
) AS $$
BEGIN
  -- Verificar que la cita pertenece al usuario
  IF NOT EXISTS (SELECT 1 FROM appointments WHERE appointments.id = appointment_id_param AND appointments.user_id = user_id_param) THEN
    RAISE EXCEPTION 'Appointment does not belong to user';
  END IF;

  -- Actualizar la cita
  UPDATE appointments 
  SET 
    date = date_param,
    frequency = frequency_param,
    status = status_param,
    amount = amount_param,
    observation = observation_param,
    updated_at = NOW()
  WHERE appointments.id = appointment_id_param 
    AND appointments.user_id = user_id_param;

  -- Retornar la cita actualizada
  RETURN QUERY
  SELECT 
    a.id,
    a.patient_id,
    a.user_id,
    a.date,
    a.frequency,
    a.status,
    a.amount,
    a.observation,
    a.created_at,
    a.updated_at
  FROM appointments a
  WHERE a.id = appointment_id_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función RPC para eliminar una cita
CREATE OR REPLACE FUNCTION delete_appointment(
  appointment_id_param BIGINT,
  user_id_param BIGINT
)
RETURNS BOOLEAN AS $$
BEGIN
  -- Verificar que la cita pertenece al usuario
  IF NOT EXISTS (SELECT 1 FROM appointments WHERE appointments.id = appointment_id_param AND appointments.user_id = user_id_param) THEN
    RAISE EXCEPTION 'Appointment does not belong to user';
  END IF;

  -- Eliminar la cita
  DELETE FROM appointments 
  WHERE appointments.id = appointment_id_param 
    AND appointments.user_id = user_id_param;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Mensaje de confirmación
DO $$
BEGIN
    RAISE NOTICE '✅ Funciones para editar y eliminar turnos creadas correctamente.';
END $$;