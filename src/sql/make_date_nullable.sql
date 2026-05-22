-- Hacer la columna date nullable en appointments
-- Permite crear turnos sin fecha definida
ALTER TABLE appointments ALTER COLUMN date DROP NOT NULL;

COMMENT ON COLUMN appointments.date IS 'Fecha y hora del turno. Puede ser NULL para turnos sin fecha definida';