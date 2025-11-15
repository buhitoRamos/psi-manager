-- Script para limpiar y recrear funciones RPC
-- Ejecutar en consola SQL de Supabase para resolver conflictos de funciones duplicadas

-- Eliminar todas las versiones existentes de las funciones con todos los posibles argumentos
DROP FUNCTION IF EXISTS create_recurring_appointments(BIGINT, BIGINT, TIMESTAMPTZ, TEXT, TEXT, DECIMAL, TEXT) CASCADE;
DROP FUNCTION IF EXISTS create_recurring_appointments(BIGINT, BIGINT, TIMESTAMPTZ, TEXT, TEXT, DECIMAL, TEXT, BOOLEAN) CASCADE;
DROP FUNCTION IF EXISTS create_recurring_appointments_v2 CASCADE;
DROP FUNCTION IF EXISTS delete_recurring_appointments CASCADE;
DROP FUNCTION IF EXISTS delete_appointments_by_date_range CASCADE;
DROP FUNCTION IF EXISTS delete_pending_appointments_by_patient_v2 CASCADE;

-- También eliminar cualquier otra versión que pueda existir
DROP FUNCTION IF EXISTS create_recurring_appointments CASCADE;

-- Mostrar confirmación
DO $$
BEGIN
    RAISE NOTICE '🧹 Todas las versiones de funciones eliminadas correctamente.';
    RAISE NOTICE '📝 Ahora ejecutar el archivo setup_rls_policies.sql para recrear las funciones.';
    RAISE NOTICE '⚠️  Usar solo una versión de la función para evitar conflictos.';
END $$;