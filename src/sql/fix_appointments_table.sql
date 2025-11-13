-- Script alternativo para agregar user_id a la tabla appointments existente
-- Usar este script si ya tienes la tabla appointments sin la columna user_id

-- Verificar si la tabla appointments existe y agregar user_id si no existe
DO $$
BEGIN
    -- Verificar si la columna user_id existe
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'appointments' 
        AND column_name = 'user_id'
    ) THEN
        -- Agregar la columna user_id
        ALTER TABLE appointments ADD COLUMN user_id BIGINT;
        
        -- Agregar la restricción de foreign key
        ALTER TABLE appointments ADD CONSTRAINT fk_appointments_user_id 
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
        
        -- Hacer la columna NOT NULL después de agregar datos
        -- Por ahora la dejamos nullable para poder agregar datos
        RAISE NOTICE 'Columna user_id agregada a la tabla appointments';
    ELSE
        RAISE NOTICE 'La columna user_id ya existe en la tabla appointments';
    END IF;
END $$;

-- Si necesitas poblar la columna user_id con datos existentes, 
-- puedes ejecutar algo como esto (ajusta según tus necesidades):
-- UPDATE appointments SET user_id = (
--     SELECT user_id FROM patients WHERE patients.id = appointments.patient_id
-- ) WHERE user_id IS NULL;

-- Luego hacer la columna NOT NULL:
-- ALTER TABLE appointments ALTER COLUMN user_id SET NOT NULL;