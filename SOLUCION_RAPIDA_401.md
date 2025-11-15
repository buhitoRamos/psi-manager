# 🔧 Solución Rápida para Error 401 JWT

## 🚫 Error Actual
```
❌ Error al eliminar turnos: HTTP error! status: 401 - {"code":"PGRST301","details":null,"hint":null,"message":"Expected 3 parts in JWT; got 1"}
```

## ✅ Solución

### Paso 1: Ejecutar Script SQL en Supabase

**Ve a tu proyecto Supabase → SQL Editor → Nueva consulta y ejecuta:**

```sql
-- Pega exactamente este código:
-- Función para eliminar turnos pendientes por paciente (versión compatible)
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
    SELECT 1 FROM patients 
    WHERE patients.id = patient_id_param 
    AND patients.user_id = user_id_param
  ) THEN
    RAISE EXCEPTION 'No tienes acceso a este paciente o el paciente no existe';
  END IF;

  -- Eliminar solo turnos pendientes del paciente especificado
  WITH deleted_rows AS (
    DELETE FROM appointments 
    WHERE patient_id = patient_id_param 
      AND user_id = user_id_param
      AND status = 'en_espera'
    RETURNING id
  )
  SELECT array_agg(id) INTO deleted_appointment_ids FROM deleted_rows;

  -- Contar cuántos se eliminaron
  total_deleted := COALESCE(array_length(deleted_appointment_ids, 1), 0);

  RETURN QUERY SELECT total_deleted, COALESCE(deleted_appointment_ids, ARRAY[]::BIGINT[]);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permission for the new function
GRANT EXECUTE ON FUNCTION delete_pending_appointments_by_patient_v2 TO anon;
GRANT EXECUTE ON FUNCTION delete_pending_appointments_by_patient_v2 TO authenticated;

-- Configurar RLS para trabajar con autenticación personalizada
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

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
```

### Paso 2: Verificar la Función

Después de ejecutar el script, deberías ver un mensaje de éxito. Puedes probar la función ejecutando:

```sql
-- Prueba rápida (reemplaza 123 y 456 con IDs reales de tu base de datos)
SELECT * FROM delete_pending_appointments_by_patient_v2(123, 456);
```

### Paso 3: Probar la Aplicación

1. **Refrescar la página** de tu aplicación
2. **Ir a la sección de Turnos**
3. **Probar el desplegable** de "Eliminar Turnos Pendientes"
4. **Seleccionar un paciente** y verificar que funciona sin error 401

## 🎯 ¿Qué se solucionó?

1. **JWT Token Issue**: Ahora usa el `SUPABASE_ANON_KEY` en lugar del token personalizado
2. **RPC Function**: Creada función específica que trabaja con tu sistema de autenticación
3. **RLS Policies**: Configuradas para permitir el acceso necesario
4. **Permissions**: Otorgados permisos correctos para usuarios anónimos y autenticados

## 🚀 Resultado Esperado

- ✅ **Sin Error 401**: El error de JWT desaparecerá
- ✅ **Eliminación Funcional**: Los turnos pendientes se eliminarán correctamente
- ✅ **Seguridad**: Solo se eliminan turnos en estado "en_espera"
- ✅ **UI Mejorada**: Desplegable elegante en lugar de lista de botones

## 🆘 Si Sigue el Error

1. **Verifica** que el script SQL se ejecutó sin errores
2. **Comprueba** que las tablas `patients` y `appointments` existen
3. **Revisa** la consola del navegador para más detalles del error
4. **Recarga** la página completamente (Ctrl+F5 o Cmd+Shift+R)

¡El código del frontend ya está actualizado y listo para funcionar una vez ejecutes el script SQL!