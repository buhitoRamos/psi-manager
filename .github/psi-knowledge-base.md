# PSI Manager - Knowledge Base

> Base de conocimiento viva del proyecto PSI Manager. Este documento se actualiza cada vez que se crea o modifica una funcionalidad importante.

---

## 📋 Índice

- [Arquitectura General](#arquitectura-general)
- [Stack Tecnológico](#stack-tecnológico)
- [Patrones de Código](#patrones-de-código)
- [Reglas de Negocio](#reglas-de-negocio)
- [Componentes Documentados](#componentes-documentados)
- [Features Recientes](#features-recientes)
- [Decisiones Técnicas](#decisiones-técnicas)
- [Troubleshooting Conocido](#troubleshooting-conocido)

---

## 🏗️ Arquitectura General

PSI Manager es una SPA (Single Page Application) React que gestiona pacientes, turnos, pagos e informes para profesionales de la psicología.

### Flujo de Datos
```
Usuario → React Components → Contexts → lib/supabaseRest.js → Supabase (PostgreSQL)
                                    ↓
                              Google Calendar API (OAuth)
```

### Autenticación
- Token JWT simulado en `localStorage` (formato: `user-{id}-{timestamp}-{random}`)
- Rol en `localStorage`: `user_role` (`admin` | `user`)
- Verificación periódica vía `authStatusRest.js`

---

## 🛠️ Stack Tecnológico

| Capa | Tecnología | Versión |
|------|-----------|---------|
| Framework | React | 18.2.0 |
| Router | React Router DOM | 6.8.0 |
| BaaS | Supabase | ^2.35.0 |
| Calendario | Google Calendar API | v3 |
| Build | Create React App | 5.0.1 |
| Validación | AJV | ^8.12.0 |
| Rich Text | React Quill | ^2.0.0 |
| Notificaciones | React Hot Toast | ^2.6.0 |

---

## 🧩 Patrones de Código

### 1. Context Pattern
```javascript
// Crear contexto
export const MiContext = createContext(null);

// Hook personalizado con verificación
export const useMiContext = () => {
  const context = useContext(MiContext);
  if (!context) throw new Error('useMiContext must be used within MiProvider');
  return context;
};

// Provider con lógica
export const MiProvider = ({ children }) => { ... };
```

### 2. Debounce Pattern (Turnos)
```javascript
const [debounceTimeout, setDebounceTimeout] = useState(null);

const triggerUpdate = () => {
  if (debounceTimeout) clearTimeout(debounceTimeout);
  const newTimeout = setTimeout(() => {
    setUpdateTrigger(prev => prev + 1);
  }, 300);
  setDebounceTimeout(newTimeout);
};
```

### 3. Búsqueda sin Tildes
```javascript
const normalizeText = (text) => {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
};
```

### 4. Supabase RPC Pattern
```javascript
const { data, error } = await supabase
  .rpc('nombre_funcion', { param1: valor1 });
```

### 5. Google Calendar OAuth Flow
```javascript
// 1. Cargar gapi script
// 2. Inicializar con API_KEY
// 3. Autenticar con clientId + scope calendar
// 4. Crear/actualizar/eliminar eventos vía gapi.client.calendar.events.*
```

---

## 📜 Reglas de Negocio

1. **Pacientes**: Todo paciente debe tener `name`, `phone`, `email` (opcional), `user_id`
2. **Turnos**: Estados permitidos: `pending`, `confirmed`, `completed`, `cancelled`
3. **Turnos Recurrentes**: Solo frecuencias `weekly`, `biweekly`, `monthly`. Máximo 1 año.
4. **Pagos**: Cada pago registra `amount`, `date`, `patient_id`, `user_id`
5. **Deuda**: Calculada como suma de sesiones - suma de pagos
6. **Admin**: Usuario con `user_role === 'admin'` accede a `/admin`
7. **User**: Usuario normal accede a `/dashboard`
8. **Google Calendar**: Sincronización bidireccional (crear/editar/eliminar)

---

## 🧱 Componentes Documentados

### Appointments (`src/components/Appointments/`)
- **Propósito**: Gestión completa de turnos
- **Estados**: Lista, creación, edición, eliminación
- **Dependencias**: `AppointmentsUpdateContext`, `AppointmentForm`, `ConfirmModal`
- **Patrones**: Debounce, búsqueda sin tildes, RPC Supabase
- **Creado**: Inicio del proyecto

### Patients (`src/components/patients-board/`)
- **Propósito**: CRUD de pacientes
- **Features**: Búsqueda inteligente, próxima cita visible
- **Dependencias**: `supabaseRest.js`
- **Patrones**: Búsqueda sin tildes
- **Creado**: Inicio del proyecto

### Payments (`src/components/Payments/`)
- **Propósito**: Registro de pagos y visualización de deudas
- **Dependencias**: `PaymentForm`, `supabaseRest.js`
- **Creado**: Inicio del proyecto

### Reports (`src/components/Reports/`)
- **Propósito**: Generación de informes clínicos
- **Sub-componentes**: `ReportTable`, `ReportForm`, `ReportCard`
- **Dependencias**: React Quill (rich text)
- **Creado**: Inicio del proyecto

### Menu (`src/components/Menu/`)
- **Propósito**: Navegación lateral
- **Features**: Logout, cambio de sección, settings
- **Creado**: Inicio del proyecto

### GoogleCalendarSettings (`src/components/GoogleCalendarSettings/`)
- **Propósito**: Configuración OAuth de Google Calendar
- **Dependencias**: `googleCalendar.js`
- **Creado**: Inicio del proyecto

---

## 🆕 Features Recientes

> Registrar aquí cada feature nuevo con fecha y detalles.

### 2026-XX-XX - Template Feature
- **Descripción**: Descripción del feature
- **Archivos**: `src/components/Nuevo/Nuevo.js`
- **Patrones usados**: Context, Debounce, etc.
- **Decisiones**: Por qué se implementó así

---

## 🤔 Decisiones Técnicas

| Decisión | Contexto | Fecha |
|----------|----------|-------|
| CRA en lugar de Vite | Proyecto iniciado antes de la popularización de Vite | Inicio |
| Token en localStorage | Simplicidad para MVP, sin refresh token | Inicio |
| RPC en lugar de REST directo | Optimización de queries complejas | Inicio |
| Google Calendar API v3 | Integración nativa sin librerías externas | Inicio |
| `dahboard-page` (typo) | Error inicial que se mantuvo para no romper imports | Inicio |

---

## 🐛 Troubleshooting Conocido

### Error 401 en Google Calendar
- **Causa**: Token OAuth expirado
- **Solución**: Reconectar en `GoogleCalendarSettings` o usar `googleCalendarReconnect.js`
- **Documentación**: `SOLUCION_ERROR_401.md`, `SOLUCION_RAPIDA_401.md`

### Error 403 en Google Calendar
- **Causa**: Permisos insuficientes o API no habilitada
- **Solución**: Verificar en Google Cloud Console
- **Documentación**: `TROUBLESHOOT_403.md`

### Problemas de Refresh
- **Causa**: Estado de auth desincronizado
- **Solución**: Verificar `MEJORAS_REFRESH.md`

---

## 📝 Convenciones de Código

- **Imports**: React primero, luego librerías, luego locales
- **Quotes**: Preferir comillas simples en JS, dobles en JSX
- **CSS**: Un archivo `.css` por componente, mismo nombre
- **Logs**: Usar prefijo `[ComponentName]` para trazabilidad
- **Nombres**: Components en PascalCase, funciones en camelCase, archivos en kebab-case
- **Comentarios**: Solo cuando aportan claridad, no para lo obvio

---

*Última actualización: 2026-11-07*
*Mantenido por: PSI Expert Agent*
