-- PASO 1: Ejecutar este script primero para limpiar funciones duplicadas
-- Ejecutar en consola SQL de Supabase

-- Eliminar todas las versiones existentes de las funciones con todos los posibles argumentos
DROP FUNCTION IF EXISTS create_recurring_appointments(BIGINT, BIGINT, TIMESTAMPTZ, TEXT, TEXT, DECIMAL, TEXT) CASCADE;
DROP FUNCTION IF EXISTS create_recurring_appointments(BIGINT, BIGINT, TIMESTAMPTZ, TEXT, TEXT, DECIMAL, TEXT, BOOLEAN) CASCADE;
DROP FUNCTION IF EXISTS create_recurring_appointments_v2 CASCADE;
DROP FUNCTION IF EXISTS delete_recurring_appointments CASCADE;
DROP FUNCTION IF EXISTS delete_appointments_by_date_range CASCADE;
DROP FUNCTION IF EXISTS delete_pending_appointments_by_patient_v2 CASCADE;

-- También eliminar cualquier otra versión que pueda existir
DROP FUNCTION IF EXISTS create_recurring_appointments CASCADE;

-- Función RPC para crear turnos recurrentes (compatible con autenticación personalizada)
CREATE OR REPLACE FUNCTION create_recurring_appointments(
  patient_id_param BIGINT,
  user_id_param BIGINT,
  start_date_param TIMESTAMPTZ,
  frequency_param TEXT,
  status_param TEXT DEFAULT 'en_espera',
  amount_param DECIMAL(10,2) DEFAULT 0,
  observation_param TEXT DEFAULT NULL,
  clear_existing BOOLEAN DEFAULT FALSE
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
  deleted_count INTEGER
) AS $$
DECLARE
  current_appointment_date TIMESTAMPTZ;
  end_date TIMESTAMPTZ;
  increment_days INTEGER;
  appointment_count INTEGER := 0;
  max_appointments INTEGER := 52; -- Máximo de turnos por año
  new_appointment_id BIGINT;
  appointment_date_temp TIMESTAMPTZ;
  existing_deleted_count INTEGER := 0;
BEGIN
  -- Verificar que el usuario tenga acceso al paciente
  IF NOT EXISTS (
    SELECT 1 FROM patients p
    WHERE p.id = patient_id_param AND p.user_id = user_id_param
  ) THEN
    RAISE EXCEPTION 'No tienes acceso a este paciente';
  END IF;

  -- Si se solicita, eliminar turnos recurrentes existentes pendientes del paciente
  IF clear_existing THEN
    DELETE FROM appointments a
    WHERE a.patient_id = patient_id_param 
      AND a.user_id = user_id_param 
      AND a.status = 'en_espera'
      AND a.date >= start_date_param
      AND a.frequency IN ('semanal', 'quincenal', 'mensual'); -- No eliminar únicos
    
    GET DIAGNOSTICS existing_deleted_count = ROW_COUNT;
    
    RAISE NOTICE 'Eliminados % turnos recurrentes existentes', existing_deleted_count;
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
      NOW(),
      existing_deleted_count;
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
      NOW(),
      existing_deleted_count;

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

-- Función para eliminar turnos pendientes por paciente (compatible con autenticación personalizada)
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
    SELECT 1 FROM patients p
    WHERE p.id = patient_id_param 
    AND p.user_id = user_id_param
  ) THEN
    RAISE EXCEPTION 'No tienes acceso a este paciente o el paciente no existe';
  END IF;

  -- Eliminar solo turnos pendientes del paciente especificado
  WITH deleted_rows AS (
    DELETE FROM appointments a
    WHERE a.patient_id = patient_id_param 
      AND a.user_id = user_id_param
      AND a.status = 'en_espera'
    RETURNING a.id
  )
  SELECT array_agg(id) INTO deleted_appointment_ids FROM deleted_rows;

  -- Contar cuántos se eliminaron
  total_deleted := COALESCE(array_length(deleted_appointment_ids, 1), 0);

  RETURN QUERY SELECT total_deleted, COALESCE(deleted_appointment_ids, ARRAY[]::BIGINT[]);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION create_recurring_appointments TO authenticated;
GRANT EXECUTE ON FUNCTION delete_pending_appointments_by_patient_v2 TO anon;
GRANT EXECUTE ON FUNCTION delete_pending_appointments_by_patient_v2 TO authenticated;

-- Configurar RLS para trabajar con autenticación personalizada
ALTER TABLE IF EXISTS patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS payments ENABLE ROW LEVEL SECURITY;

-- Políticas permisivas para autenticación personalizada
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
    RAISE NOTICE '✅ Funciones limpiadas y recreadas correctamente.';
    RAISE NOTICE '✅ create_recurring_appointments con parámetro clear_existing disponible.';
    RAISE NOTICE '✅ delete_pending_appointments_by_patient_v2 disponible.';
    RAISE NOTICE '✅ Políticas RLS configuradas para autenticación personalizada.';
    RAISE NOTICE 'ℹ️  Crear turnos: SELECT * FROM create_recurring_appointments(patient_id, user_id, start_date, frequency, status, amount, observation, clear_existing);';
    RAISE NOTICE 'ℹ️  Eliminar turnos pendientes: SELECT * FROM delete_pending_appointments_by_patient_v2(patient_id, user_id);';
END $$;