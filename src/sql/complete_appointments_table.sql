-- Script para completar la tabla appointments existente
-- Ejecutar en la consola SQL de Supabase
-- ESTE SCRIPT NO ELIMINA LA TABLA, SOLO AGREGA LO QUE FALTA

-- Agregar columna status si no existe
DO $$
BEGIN
    -- Verificar si la columna status existe
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'appointments' 
        AND column_name = 'status'
    ) THEN
        -- Agregar la columna status
        ALTER TABLE appointments ADD COLUMN status TEXT DEFAULT 'en_espera';
        
        -- Agregar el constraint para validar valores
        ALTER TABLE appointments ADD CONSTRAINT check_appointment_status 
        CHECK (status IN ('en_espera', 'finalizado', 'cancelado'));
        
        RAISE NOTICE 'Columna status agregada a la tabla appointments';
    ELSE
        RAISE NOTICE 'La columna status ya existe en la tabla appointments';
    END IF;
END $$;

-- Crear índices si no existen
CREATE INDEX IF NOT EXISTS idx_appointments_patient_id ON appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_user_id ON appointments(user_id);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(date);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);

-- Habilitar RLS si no está habilitado
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_tables 
        WHERE tablename = 'appointments' 
        AND rowsecurity = true
    ) THEN
        ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
        RAISE NOTICE 'RLS habilitado para appointments';
    ELSE
        RAISE NOTICE 'RLS ya está habilitado para appointments';
    END IF;
END $$;

-- Crear política si no existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'appointments' 
        AND policyname = 'Allow all operations for authenticated users'
    ) THEN
        CREATE POLICY "Allow all operations for authenticated users" ON appointments
        FOR ALL USING (true) WITH CHECK (true);
        RAISE NOTICE 'Política creada para appointments';
    ELSE
        RAISE NOTICE 'Política ya existe para appointments';
    END IF;
END $$;

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger para actualizar updated_at cuando se modifica un registro
DROP TRIGGER IF EXISTS update_appointments_updated_at ON appointments;
CREATE TRIGGER update_appointments_updated_at
    BEFORE UPDATE ON appointments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

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

-- Comentarios para documentación
COMMENT ON TABLE appointments IS 'Tabla para almacenar las citas/turnos de los pacientes';
COMMENT ON COLUMN appointments.frequency IS 'Frecuencia de la cita: unica, semanal, quincenal, mensual';
COMMENT ON COLUMN appointments.status IS 'Estado de la cita: en_espera, finalizado, cancelado';
COMMENT ON COLUMN appointments.amount IS 'Monto de la sesión';
COMMENT ON COLUMN appointments.observation IS 'Observaciones e informes psicológicos de la sesión';

-- Mensaje final
DO $$
BEGIN
    RAISE NOTICE '✅ Script completado. La tabla appointments está lista con todas las columnas y funciones RPC.';
END $$;