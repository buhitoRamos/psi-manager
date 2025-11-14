-- Función RPC para crear turnos recurrentes
-- Ejecutar en consola SQL de Supabase

CREATE OR REPLACE FUNCTION create_recurring_appointments(
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
      increment_days := 30; -- Se ajustará mes a mes para mantener el día del mes
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
      -- Para mensual, mantener el mismo día del mes
      current_appointment_date := current_appointment_date + INTERVAL '1 month';
      
      -- Si el día no existe en el nuevo mes (ej: 31 enero -> 31 febrero)
      -- PostgreSQL automáticamente ajusta al último día del mes
    ELSE
      -- Para semanal y quincenal, simplemente agregar días
      current_appointment_date := current_appointment_date + (increment_days || ' days')::INTERVAL;
    END IF;
  END LOOP;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para eliminar turnos recurrentes por frecuencia y paciente
CREATE OR REPLACE FUNCTION delete_recurring_appointments(
  patient_id_param BIGINT,
  user_id_param BIGINT,
  start_date_param TIMESTAMPTZ,
  frequency_param TEXT
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
    WHERE patients.id = patient_id_param AND patients.user_id = user_id_param
  ) THEN
    RAISE EXCEPTION 'No tienes acceso a este paciente';
  END IF;

  -- Eliminar turnos que coincidan con los criterios
  -- Solo eliminar turnos futuros en estado 'en_espera' para evitar eliminar turnos ya realizados
  DELETE FROM appointments 
  WHERE appointments.patient_id = patient_id_param 
    AND appointments.user_id = user_id_param
    AND appointments.frequency = frequency_param
    AND appointments.date >= start_date_param
    AND appointments.status = 'en_espera'
  RETURNING appointments.id INTO deleted_appointment_ids;

  GET DIAGNOSTICS total_deleted = ROW_COUNT;

  RETURN QUERY SELECT total_deleted, deleted_appointment_ids;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para eliminar turnos recurrentes específicos por rango de fechas
CREATE OR REPLACE FUNCTION delete_appointments_by_date_range(
  patient_id_param BIGINT,
  user_id_param BIGINT,
  start_date_param TIMESTAMPTZ,
  end_date_param TIMESTAMPTZ
)
RETURNS TABLE(
  deleted_count INTEGER
) AS $$
DECLARE
  total_deleted INTEGER;
BEGIN
  -- Verificar que el usuario tenga acceso al paciente
  IF NOT EXISTS (
    SELECT 1 FROM patients 
    WHERE patients.id = patient_id_param AND patients.user_id = user_id_param
  ) THEN
    RAISE EXCEPTION 'No tienes acceso a este paciente';
  END IF;

  -- Eliminar turnos en el rango de fechas especificado
  -- Solo eliminar turnos en estado 'en_espera' para evitar eliminar turnos ya realizados
  DELETE FROM appointments 
  WHERE appointments.patient_id = patient_id_param 
    AND appointments.user_id = user_id_param
    AND appointments.date >= start_date_param
    AND appointments.date <= end_date_param
    AND appointments.status = 'en_espera';

  GET DIAGNOSTICS total_deleted = ROW_COUNT;

  RETURN QUERY SELECT total_deleted;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Mensajes de confirmación
DO $$
BEGIN
    RAISE NOTICE '✅ Funciones para gestionar turnos recurrentes creadas correctamente.';
    RAISE NOTICE 'ℹ️  Crear: SELECT * FROM create_recurring_appointments(patient_id, user_id, start_date, frequency, status, amount, observation);';
    RAISE NOTICE 'ℹ️  Eliminar por frecuencia: SELECT * FROM delete_recurring_appointments(patient_id, user_id, start_date, frequency);';
    RAISE NOTICE 'ℹ️  Eliminar por rango: SELECT * FROM delete_appointments_by_date_range(patient_id, user_id, start_date, end_date);';
    RAISE NOTICE 'ℹ️  Frecuencias válidas: unica, semanal, quincenal, mensual';
END $$;