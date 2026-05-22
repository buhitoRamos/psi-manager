-- Hacer la columna age nullable en patients
-- Permite crear pacientes sin edad obligatoria
ALTER TABLE patients ALTER COLUMN age DROP NOT NULL;

COMMENT ON COLUMN patients.age IS 'Edad del paciente. Puede ser NULL si no se informa';