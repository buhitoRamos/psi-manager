-- Script para verificar y configurar políticas RLS
-- Ejecutar en consola SQL de Supabase

-- Verificar políticas existentes para la tabla patients
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'patients';

-- Verificar políticas existentes para la tabla appointments
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'appointments';

-- Crear política para DELETE en patients si no existe
DO $$
BEGIN
    -- Verificar si la política DELETE ya existe para patients
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'patients' 
        AND policyname = 'Users can delete their own patients'
        AND cmd = 'DELETE'
    ) THEN
        -- Crear política DELETE para patients
        EXECUTE 'CREATE POLICY "Users can delete their own patients" ON patients 
                FOR DELETE 
                USING (auth.uid()::text = user_id::text)';
        
        RAISE NOTICE '✅ Política DELETE creada para tabla patients';
    ELSE
        RAISE NOTICE 'ℹ️  Política DELETE ya existe para tabla patients';
    END IF;
END $$;

-- Crear política para DELETE en appointments si no existe
DO $$
BEGIN
    -- Verificar si la política DELETE ya existe para appointments
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'appointments' 
        AND policyname = 'Users can delete their own appointments'
        AND cmd = 'DELETE'
    ) THEN
        -- Crear política DELETE para appointments
        EXECUTE 'CREATE POLICY "Users can delete their own appointments" ON appointments 
                FOR DELETE 
                USING (auth.uid()::text = user_id::text)';
        
        RAISE NOTICE '✅ Política DELETE creada para tabla appointments';
    ELSE
        RAISE NOTICE 'ℹ️  Política DELETE ya existe para tabla appointments';
    END IF;
END $$;

-- Verificar que RLS esté habilitado
SELECT schemaname, tablename, rowsecurity
FROM pg_tables 
WHERE tablename IN ('patients', 'appointments');

-- Habilitar RLS si no está habilitado
DO $$
BEGIN
    -- Habilitar RLS para patients si no está habilitado
    IF NOT EXISTS (
        SELECT 1 FROM pg_tables 
        WHERE tablename = 'patients' 
        AND rowsecurity = true
    ) THEN
        EXECUTE 'ALTER TABLE patients ENABLE ROW LEVEL SECURITY';
        RAISE NOTICE '✅ RLS habilitado para tabla patients';
    ELSE
        RAISE NOTICE 'ℹ️  RLS ya está habilitado para tabla patients';
    END IF;

    -- Habilitar RLS para appointments si no está habilitado
    IF NOT EXISTS (
        SELECT 1 FROM pg_tables 
        WHERE tablename = 'appointments' 
        AND rowsecurity = true
    ) THEN
        EXECUTE 'ALTER TABLE appointments ENABLE ROW LEVEL SECURITY';
        RAISE NOTICE '✅ RLS habilitado para tabla appointments';
    ELSE
        RAISE NOTICE 'ℹ️  RLS ya está habilitado para tabla appointments';
    END IF;
END $$;

-- Verificar estado final
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '=== ESTADO FINAL DE POLÍTICAS RLS ===';
    RAISE NOTICE 'Ejecuta las siguientes consultas para verificar:';
    RAISE NOTICE 'SELECT * FROM pg_policies WHERE tablename IN (''patients'', ''appointments'');';
    RAISE NOTICE 'SELECT tablename, rowsecurity FROM pg_tables WHERE tablename IN (''patients'', ''appointments'');';
END $$;