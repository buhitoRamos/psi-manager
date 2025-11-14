# Configuración de la Base de Datos - Appointments

## Instrucciones para ejecutar el script SQL en Supabase

### Paso 1: Acceder a la consola de Supabase
1. Ve a [supabase.com](https://supabase.com) e inicia sesión
2. Selecciona tu proyecto `psi-manager`
3. En el panel lateral izquierdo, haz clic en **SQL Editor**

### Paso 2: Ejecutar el script
1. Copia todo el contenido del archivo `src/sql/create_appointments_table.sql`
2. Pégalo en el editor SQL de Supabase
3. Haz clic en **Run** (o presiona `Ctrl/Cmd + Enter`)

### Paso 3: Verificar la creación
El script creará:
- ✅ **Tabla `appointments`** con todas las columnas necesarias
- ✅ **Índices** para optimizar las consultas
- ✅ **Políticas RLS** para seguridad
- ✅ **Funciones RPC** para operaciones CRUD:
  - `create_appointment()` - Crear nueva cita
  - `get_appointments_by_user_id()` - Obtener citas del usuario
  - `get_appointments_by_patient_id()` - Obtener citas de un paciente
- ✅ **Triggers** para actualización automática de timestamps

### Estructura de la tabla appointments

```sql
appointments (
  id BIGSERIAL PRIMARY KEY,
  patient_id BIGINT NOT NULL REFERENCES patients(id),
  user_id BIGINT NOT NULL REFERENCES users(id),
  date TIMESTAMPTZ NOT NULL,
  frequency TEXT NOT NULL DEFAULT 'unica',
  status TEXT NOT NULL DEFAULT 'en_espera',
  amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  observation TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
)
```

### Estados disponibles
- **frequency**: `'unica'`, `'semanal'`, `'quincenal'`, `'mensual'`
- **status**: `'en_espera'`, `'finalizado'`, `'cancelado'`

### Funciones RPC implementadas

#### `create_appointment()`
Crea una nueva cita verificando que el paciente pertenezca al usuario.

#### `get_appointments_by_user_id(user_id)`
Retorna todas las citas del usuario con información del paciente.

#### `get_appointments_by_patient_id(patient_id, user_id)`
Retorna todas las citas de un paciente específico.

### Seguridad (RLS)
- Los usuarios solo pueden ver/editar/eliminar sus propias citas
- Las citas están vinculadas tanto al usuario como al paciente
- Verificación automática de permisos en todas las operaciones

### Después de ejecutar el script
Una vez ejecutado exitosamente, la aplicación podrá:
1. Crear nuevas citas desde el formulario
2. Guardar observaciones e informes psicológicos
3. Gestionar estados de las citas
4. Calcular honorarioss y frecuencias

### Troubleshooting
Si encuentras errores:
1. Asegúrate de que las tablas `users` y `patients` ya existen
2. Verifica que tengas permisos de administrador en el proyecto
3. Revisa que no haya conflictos de nombres en funciones existentes

### Próximos pasos
Después de ejecutar el script, puedes:
- Probar crear una cita desde la aplicación
- Verificar que los datos se guardan correctamente en la tabla `appointments`
- Revisar los logs de la aplicación para cualquier error de integración