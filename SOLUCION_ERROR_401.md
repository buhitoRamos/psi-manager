# Guía para Solucionar el Error 401 en Eliminación de Turnos

## 🚫 Problema
Al intentar eliminar turnos pendientes por paciente, aparece el error:
```
❌ Error al eliminar turnos: HTTP error! status: 401
```

## 🔧 Solución

### 1. Ejecutar Scripts SQL en Supabase

Debes ejecutar estos archivos SQL en tu consola de Supabase (en el orden indicado):

#### A) Primero: `create_recurring_appointments.sql`
- Este archivo ya está actualizado con las mejoras de seguridad
- Incluye verificaciones de autenticación con `auth.uid()`
- Configura las funciones RPC de manera segura

#### B) Segundo: `setup_rls_policies.sql`
- Este archivo es **NUEVO** y debe ejecutarse
- Configura las políticas RLS (Row Level Security)
- Crea la nueva función `delete_pending_appointments_by_patient`
- Otorga los permisos necesarios

### 2. Pasos para Ejecutar en Supabase

1. **Accede a tu proyecto Supabase**
   - Ve a https://app.supabase.com
   - Selecciona tu proyecto

2. **Abre el Editor SQL**
   - En el menú lateral, busca "SQL Editor"
   - Haz clic en "New Query"

3. **Ejecuta el primer script**
   - Copia todo el contenido de `src/sql/create_recurring_appointments.sql`
   - Pégalo en el editor SQL
   - Haz clic en "RUN"

4. **Ejecuta el segundo script**
   - Crea una nueva consulta
   - Copia todo el contenido de `src/sql/setup_rls_policies.sql`
   - Pégalo en el editor SQL
   - Haz clic en "RUN"

### 3. Verificación

Después de ejecutar ambos scripts, deberías ver mensajes como:
```
✅ Políticas RLS configuradas correctamente.
✅ Función delete_pending_appointments_by_patient creada.
✅ Tabla "patients" encontrada.
✅ Tabla "appointments" encontrada.
✅ Columna "user_id" encontrada en appointments.
```

### 4. ¿Qué se solucionó?

1. **Autenticación Mejorada**: Las funciones ahora usan `auth.uid()` para verificar el usuario autenticado
2. **Políticas RLS**: Se configuraron políticas de seguridad a nivel de fila para proteger los datos
3. **Función Específica**: Se creó `delete_pending_appointments_by_patient` optimizada para el caso específico
4. **Permisos**: Se otorgaron los permisos necesarios para que las funciones RPC funcionen correctamente

### 5. Beneficios

- ✅ **Seguridad**: Solo los usuarios autenticados pueden acceder a sus propios datos
- ✅ **Simplicidad**: Una sola llamada RPC elimina todos los turnos pendientes
- ✅ **Protección**: Los turnos finalizados/cancelados no se ven afectados
- ✅ **Trazabilidad**: Se retorna el conteo y los IDs de los turnos eliminados

### 6. Código Frontend Actualizado

El código del frontend ya está actualizado para:
- Usar la nueva función RPC `delete_pending_appointments_by_patient`
- Manejar mejor los errores de autenticación
- Mostrar información más detallada sobre los turnos eliminados
- Presentar la funcionalidad como un desplegable más elegante

## 🎯 Resultado Esperado

Una vez implementados estos cambios:
1. El error 401 desaparecerá
2. Los turnos se eliminarán correctamente
3. Solo se eliminarán turnos en estado "en_espera"
4. El usuario verá una confirmación del número de turnos eliminados
5. La interfaz será más limpia con el nuevo desplegable