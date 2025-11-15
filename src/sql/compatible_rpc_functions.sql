-- Script alternativo para funciones RPC que trabajan con autenticación personalizada
-- Ejecutar en consola SQL de Supabase

-- Función para eliminar turnos pendientes por paciente (versión compatible)
CREATE OR REPLACE FUNCTION delete_pending_appointments_by_patient_v2(
  patient_id_param BIGINT,
  user_id_param BIGINT
)
RETURNS TABLE(
  deleted_count INTEGER,
  deleted_ids BIGINT[]
) AS $$
DECLARE
  deleted_appointment_ids BIGINT[];
  total_deleted INTEGER;
BEGIN
  -- Verificar que el usuario tenga acceso al paciente
  IF NOT EXISTS (
    SELECT 1 FROM patients 
    WHERE patients.id = patient_id_param 
    AND patients.user_id = user_id_param
  ) THEN
    RAISE EXCEPTION 'No tienes acceso a este paciente o el paciente no existe';
  END IF;

  -- Eliminar solo turnos pendientes del paciente especificado
  WITH deleted_rows AS (
    DELETE FROM appointments 
    WHERE patient_id = patient_id_param 
      AND user_id = user_id_param
      AND status = 'en_espera'
    RETURNING id
  )
  SELECT array_agg(id) INTO deleted_appointment_ids FROM deleted_rows;

  -- Contar cuántos se eliminaron
  total_deleted := COALESCE(array_length(deleted_appointment_ids, 1), 0);

  RETURN QUERY SELECT total_deleted, COALESCE(deleted_appointment_ids, ARRAY[]::BIGINT[]);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permission for the new function
GRANT EXECUTE ON FUNCTION delete_pending_appointments_by_patient_v2 TO anon;
GRANT EXECUTE ON FUNCTION delete_pending_appointments_by_patient_v2 TO authenticated;

-- Función para crear turnos recurrentes (versión compatible)
CREATE OR REPLACE FUNCTION create_recurring_appointments_v2(
  patient_id_param BIGINT,
  user_id_param BIGINT,
  start_date_param TIMESTAMPTZ,
  frequency_param TEXT,
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
  created_at TIMESTAMPTZ
) AS $$
DECLARE
  current_appointment_date TIMESTAMPTZ;
  end_date TIMESTAMPTZ;
  increment_days INTEGER;
  appointment_count INTEGER := 0;
  max_appointments INTEGER := 52; -- Máximo de turnos por año
  new_appointment_id BIGINT;
  appointment_date_temp TIMESTAMPTZ;
BEGIN
  -- Verificar que el usuario tenga acceso al paciente
  IF NOT EXISTS (
    SELECT 1 FROM patients 
    WHERE patients.id = patient_id_param AND patients.user_id = user_id_param
  ) THEN
    RAISE EXCEPTION 'No tienes acceso a este paciente';
  END IF;

  -- Si es único, crear solo un turno
  IF frequency_param = 'unica' THEN
    INSERT INTO appointments (patient_id, user_id, date, frequency, status, amount, observation)
    VALUES (patient_id_param, user_id_param, start_date_param, frequency_param, status_param, amount_param, observation_param)
    RETURNING appointments.id INTO new_appointment_id;
    
    RETURN QUERY SELECT 
      new_appointment_id,
      patient_id_param,
      user_id_param,
      start_date_param,
      frequency_param,
      status_param,
      amount_param,
      observation_param,
      NOW();
    RETURN;
  END IF;

  -- Configurar parámetros según frecuencia
  current_appointment_date := start_date_param;
  end_date := start_date_param + INTERVAL '1 year';

  CASE frequency_param
    WHEN 'semanal' THEN
      increment_days := 7;
    WHEN 'quincenal' THEN
      increment_days := 14;
    WHEN 'mensual' THEN
      increment_days := 30;
    ELSE
      RAISE EXCEPTION 'Frecuencia no válida: %', frequency_param;
  END CASE;

  -- Crear turnos recurrentes
  WHILE current_appointment_date <= end_date AND appointment_count < max_appointments LOOP
    INSERT INTO appointments (patient_id, user_id, date, frequency, status, amount, observation)
    VALUES (
      patient_id_param, 
      user_id_param, 
      current_appointment_date, 
      frequency_param, 
      status_param, 
      amount_param, 
      CASE 
        WHEN observation_param IS NOT NULL THEN observation_param || ' (Turno ' || frequency_param || ')'
        ELSE 'Turno ' || frequency_param
      END
    )
    RETURNING appointments.id INTO new_appointment_id;

    -- Retornar información del turno creado
    appointment_date_temp := current_appointment_date;
    
    RETURN QUERY SELECT 
      new_appointment_id,
      patient_id_param,
      user_id_param,
      appointment_date_temp,
      frequency_param,
      status_param,
      amount_param,
      CASE 
        WHEN observation_param IS NOT NULL THEN observation_param || ' (Turno ' || frequency_param || ')'
        ELSE 'Turno ' || frequency_param
      END,
      NOW();

    appointment_count := appointment_count + 1;

    -- Calcular próxima fecha
    IF frequency_param = 'mensual' THEN
      current_appointment_date := current_appointment_date + INTERVAL '1 month';
    ELSE
      current_appointment_date := current_appointment_date + (increment_days || ' days')::INTERVAL;
    END IF;
  END LOOP;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION create_recurring_appointments_v2 TO anon;
GRANT EXECUTE ON FUNCTION create_recurring_appointments_v2 TO authenticated;

-- Configurar RLS pero permitiendo acceso con anon key
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Políticas más permisivas para trabajar con autenticación personalizada
DROP POLICY IF EXISTS "allow_anon_patients" ON patients;
CREATE POLICY "allow_anon_patients" ON patients
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "allow_anon_appointments" ON appointments;
CREATE POLICY "allow_anon_appointments" ON appointments
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "allow_anon_payments" ON payments;
CREATE POLICY "allow_anon_payments" ON payments
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- Mensajes de confirmación
DO $$
BEGIN
    RAISE NOTICE '✅ Funciones RPC compatibles creadas (versión v2).';
    RAISE NOTICE '✅ Políticas RLS configuradas para autenticación personalizada.';
    RAISE NOTICE 'ℹ️  Eliminar turnos: SELECT * FROM delete_pending_appointments_by_patient_v2(patient_id, user_id);';
    RAISE NOTICE 'ℹ️  Crear turnos: SELECT * FROM create_recurring_appointments_v2(patient_id, user_id, start_date, frequency);';
END $$;