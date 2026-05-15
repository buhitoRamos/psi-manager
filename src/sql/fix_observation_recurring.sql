-- ============================================================
-- FIX: Observaciones solo en el primer turno recurrente
-- ============================================================
-- Problema: Al crear turnos recurrentes, la observación se copiaba
-- a TODOS los turnos. La observación solo debe guardarse en el 
-- PRIMER turno (consulta inicial), los recurrentes deben tener NULL.
--
-- Este script:
-- 1. Reemplaza la función create_recurring_appointments con la versión corregida
-- 2. Limpia las observaciones duplicadas en los datos existentes
-- ============================================================

-- PASO 1: Eliminar TODAS las versiones existentes de la función
DROP FUNCTION IF EXISTS create_recurring_appointments(BIGINT, BIGINT, TIMESTAMPTZ, TEXT, TEXT, DECIMAL, TEXT) CASCADE;
DROP FUNCTION IF EXISTS create_recurring_appointments(BIGINT, BIGINT, TIMESTAMPTZ, TEXT, TEXT, DECIMAL, TEXT, BOOLEAN) CASCADE;
DROP FUNCTION IF EXISTS create_recurring_appointments_v2 CASCADE;
DROP FUNCTION IF EXISTS create_recurring_appointments CASCADE;

-- PASO 2: Crear la función corregida
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
  max_appointments INTEGER := 52;
  new_appointment_id BIGINT;
  appointment_date_temp TIMESTAMPTZ;
  existing_deleted_count INTEGER := 0;
  current_observation TEXT;
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
      AND a.frequency IN ('semanal', 'quincenal', 'mensual');
    
    GET DIAGNOSTICS existing_deleted_count = ROW_COUNT;
    
    RAISE NOTICE 'Eliminados % turnos recurrentes existentes', existing_deleted_count;
  END IF;

  -- Si es único, crear solo un turno (con observación completa)
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
    -- FIX: Solo asignar la observación al PRIMER turno (appointment_count = 0)
    -- Los turnos recurrentes posteriores NO llevan observación
    IF appointment_count = 0 THEN
      current_observation := observation_param;
    ELSE
      current_observation := NULL;
    END IF;

    INSERT INTO appointments (patient_id, user_id, date, frequency, status, amount, observation)
    VALUES (
      patient_id_param, 
      user_id_param, 
      current_appointment_date, 
      frequency_param, 
      status_param, 
      amount_param, 
      current_observation
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
      current_observation,
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

-- Grant permissions
GRANT EXECUTE ON FUNCTION create_recurring_appointments TO authenticated;
GRANT EXECUTE ON FUNCTION create_recurring_appointments TO anon;

-- ============================================================
-- PASO 3: Limpiar observaciones duplicadas en datos existentes
-- ============================================================
-- Para cada paciente con turnos recurrentes, mantener la observación
-- solo en el primer turno (el de fecha más antigua) y limpiar los demás.
-- 
-- IMPORTANTE: Esto solo limpia las observaciones que fueron copiadas
-- a todos los turnos recurrentes. Las observaciones individuales 
-- (agregadas manualmente a un turno específico) NO se tocan.
-- ============================================================

-- Primero, identificar los turnos recurrentes que tienen la misma observación
-- que el primer turno del mismo paciente y frecuencia
WITH first_appointment AS (
  SELECT 
    a.patient_id,
    a.user_id,
    a.frequency,
    a.observation AS first_observation,
    MIN(a.id) AS first_appointment_id
  FROM appointments a
  WHERE a.frequency IN ('semanal', 'quincenal', 'mensual')
    AND a.observation IS NOT NULL
  GROUP BY a.patient_id, a.user_id, a.frequency, a.observation
)
UPDATE appointments a
SET observation = NULL
FROM first_appointment fa
WHERE a.patient_id = fa.patient_id
  AND a.user_id = fa.user_id
  AND a.frequency = fa.frequency
  AND a.observation = fa.first_observation
  AND a.id != fa.first_appointment_id;

-- Verificar: mostrar cuántos turnos recurrentes aún tienen observación
-- (deberían ser solo los primeros turnos de cada grupo)
-- SELECT patient_id, frequency, COUNT(*) as with_observation 
-- FROM appointments 
-- WHERE observation IS NOT NULL AND frequency IN ('semanal', 'quincenal', 'mensual')
-- GROUP BY patient_id, frequency;