-- Script solo para crear las funciones RPC que faltan
-- Ejecutar en consola SQL de Supabase

-- Función RPC para crear una nueva cita
CREATE OR REPLACE FUNCTION create_appointment(
  patient_id_param BIGINT,
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
DECLARE
  new_appointment_id BIGINT;
BEGIN
  -- Verificar que el paciente pertenece al usuario
  IF NOT EXISTS (SELECT 1 FROM patients WHERE patients.id = patient_id_param AND patients.user_id = user_id_param) THEN
    RAISE EXCEPTION 'Patient does not belong to user';
  END IF;

  -- Insertar la nueva cita
  INSERT INTO appointments (patient_id, user_id, date, frequency, status, amount, observation)
  VALUES (patient_id_param, user_id_param, date_param, frequency_param, status_param, amount_param, observation_param)
  RETURNING appointments.id INTO new_appointment_id;

  -- Retornar la cita creada
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
  WHERE a.id = new_appointment_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función RPC para obtener citas de un usuario específico
CREATE OR REPLACE FUNCTION get_appointments_by_user_id(user_id_param BIGINT)
RETURNS TABLE(
  id BIGINT,
  patient_id BIGINT,
  patient_name TEXT,
  patient_last_name TEXT,
  date TIMESTAMPTZ,
  frequency TEXT,
  status TEXT,
  amount DECIMAL(10,2),
  observation TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    a.id,
    a.patient_id,
    p.name as patient_name,
    p.last_name as patient_last_name,
    a.date,
    a.frequency,
    a.status,
    a.amount,
    a.observation,
    a.created_at,
    a.updated_at
  FROM appointments a
  JOIN patients p ON a.patient_id = p.id
  WHERE a.user_id = user_id_param
  ORDER BY a.date DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función RPC para obtener citas de un paciente específico
CREATE OR REPLACE FUNCTION get_appointments_by_patient_id(patient_id_param BIGINT, user_id_param BIGINT)
RETURNS TABLE(
  id BIGINT,
  patient_id BIGINT,
  date TIMESTAMPTZ,
  frequency TEXT,
  status TEXT,
  amount DECIMAL(10,2),
  observation TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    a.id,
    a.patient_id,
    a.date,
    a.frequency,
    a.status,
    a.amount,
    a.observation,
    a.created_at,
    a.updated_at
  FROM appointments a
  JOIN patients p ON a.patient_id = p.id
  WHERE a.patient_id = patient_id_param 
    AND a.user_id = user_id_param
    AND p.user_id = user_id_param
  ORDER BY a.date DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;