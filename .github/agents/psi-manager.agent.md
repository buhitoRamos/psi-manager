---
name: psi-manager
description: Agente experto en el proyecto Psi Manager (React + Supabase). Úsalo para implementar features, corregir bugs, agregar pantallas/módulos, trabajar con la capa de datos Supabase, el sistema de roles, Google Calendar, o cualquier tarea de desarrollo dentro de este codebase.
argument-hint: "una tarea a implementar", "un bug a corregir", "una pantalla nueva", "una consulta sobre el proyecto"
---

# Psi Manager — Contexto del Proyecto

Sistema de gestión para profesionales de psicología: pacientes, turnos, pagos, informes de progreso, ganancias, integración con Google Calendar y panel de administración.

## Stack y comandos

- **Frontend**: React 18 (Create React App / `react-scripts`), `react-router-dom` v6, `react-hot-toast`, `react-quill`.
- **Backend/DB**: Supabase (PostgREST + RPC). Cliente `@supabase/supabase-js`.
- **Servidor auxiliar**: `server/index.js` (Express) para login con JWT (opcional, no es el flujo principal).
- **Node**: 20.x, npm 10.
- Comandos:
  - `npm start` → dev en `http://localhost:8080` (PORT=8080).
  - `npm test` → Jest (react-scripts test).
  - `npm run build` → build de producción.

## Estructura clave

```
src/
├── App.js                    # Router + AuthContext (isAuthenticated, token, handleAuth)
├── config/appConfig.js       # Config centralizada (Supabase, Google, debug)
├── contexts/AppointmentsUpdateContext.js  # Trigger de actualización de turnos (debounce)
├── lib/
│   ├── supabaseClient.js     # Cliente supabase-js (anon key)
│   ├── supabaseRest.js       # Capa de datos REST/RPC (default export `supabaseRest`)
│   ├── authStatusRest.js     # getAuthStatusByUserId, updateAuthStatus, insertAuthStatus, canUserAccess
│   ├── googleCalendar.js     # Integración Google Calendar (gapi, OAuth)
│   └── googleCalendarReconnect.js  # reconnectGoogleCalendar()
├── components/               # Un subdirectorio por feature (JS + CSS)
│   ├── Peritajes/            # Pantalla de peritajes (solo rol 'google')
│   └── ...
├── pages/
│   ├── login-page/login.js
│   ├── dahboard-page/dashboard.js   # Dashboard del psicólogo (secciones por estado)
│   └── admin-dashboard/AdminDashboard.jsx  # Panel admin (membresías, usuarios)
├── sql/                      # Scripts SQL para Supabase (tablas + RPC)
└── tests/                    # Tests Jest por componente
```

## Autenticación y roles

- **Token custom**: `localStorage.setItem('token', 'user-{id}-{timestamp}')`. El `userId` se extrae con `token.split('-')[1]` (patrón `extractUserIdFromToken` repetido en varios componentes).
- **Rol**: `localStorage.setItem('user_role', rol)`. Valores vistos: `'user'`, `'admin'`, `'google'` (peritajes).
- **Login** (`src/components/login/Login.js`): usa `authCheck(username, password)` (RPC `auth_check_secure`), luego consulta `users.role`, valida `auth_status`, y navega a `/admin` o `/dashboard`.
- **Rutas** (`App.js`): `/login`, `/admin` (solo admin), `/dashboard`, `/` (redirect según rol).
- **Estado de acceso**: tabla `auth_status` (status boolean). Si `status === false` el usuario se desloguea.

## Capa de datos (supabaseRest.js)

`supabaseRest` es el objeto default export con métodos async. Patrón: usa `callRpc(fnName, params)` para RPC y `fetch` directo a `/rest/v1/...` para tablas. Métodos principales:

- Pacientes: `getPatientsByUserId`, `createPatient`, `updatePatient`, `deletePatient`, `getPatientsWithDebt`, `getPatientsWithNextAppointment`.
- Turnos: `getAppointmentsByUserId`, `getAppointmentsByPatientId`, `createAppointment`, `createRecurringAppointments`, `updateAppointment`, `deleteAppointment`, `deleteRecurringAppointments`, `deletePendingAppointmentsByPatient`.
- Pagos: `getPaymentsByUserId`, `createPayment`, `updatePayment`, `deletePayment`, `getPatientDebt`.
- Progreso: `getProgressReports`, `insertProgressReport`, `updateProgressReport`, `deleteProgressReport`.
- Peritajes: `getPeritadosByUserId`, `createPeritado`, `updatePeritado`, `deletePeritado`, `getJuzgadosByUserId`, `createJuzgado`, `updateJuzgado`, `deleteJuzgado`, `getEstadosByUserId`, `createEstado`, `updateEstado`, `deleteEstado`.
- Auth: `authCheck`, `selectUsersByUser`, `insertUser`, `updateUserPass`, `deleteUser`.

**Para agregar una nueva tabla/feature**: crear el SQL en `src/sql/`, agregar los métodos en `supabaseRest.js` (o un nuevo `lib/*.js`), y exponerlos.

## Tablas de Supabase (conocidas)

`users`, `patients`, `appointments`, `contributions` (pagos), `progress` (informes), `admin_payments` (membresías), `auth_status`, `payments`, `keep`.

### Tablas de peritajes (feature en desarrollo)

Existen 3 tablas nuevas relacionadas con peritajes (todas con RLS deshabilitado y FK a `users(id)` vía columna `userID`):

- **`peritado`**: la persona peritada. Columnas: `id`, `created_at`, `nombre`, `apellido`, `fechaPericia` (timestamp), `fechaMaximaEntrega` (timestamp), `conclusion`, `peritadoID`, `juzgadoID`, `userID`, `estadoID`.
- **`juzgado`**: el juzgado del caso. Columnas: `id`, `created_at`, `fuero`, `distrito`, `nombreJuez`, `apellidoJuez`, `numeroExpediente`, `fechaAceptado`, `fechaFinalizado`, `peritadoID`, `estadoID`, `userID`.
- **`estado`**: estado/seguimiento del peritaje. Columnas: `id`, `created_at`, `importeDepositado` (bigint), `fechaDeposito`, `estado`, `juzgadoID`, `peritadoID`, `userID`. (La columna `fechaEntrevista` fue eliminada: la fecha de entrevista es la misma que `fechaPericia` en `peritado`.)

**Relaciones (FK)**: `peritado` ↔ `juzgado` (bidireccional), `peritado` ↔ `estado`, `juzgado` ↔ `estado`. Todas referencian `users(id)` por `userID`.

**Nota**: estas tablas usan `userID` (camelCase) como FK a users, a diferencia del resto del proyecto que usa `user_id` (snake_case).

## MCP de Supabase (acceso a la base de datos)

El proyecto tiene configurado el MCP oficial de Supabase en `.vscode/mcp.json` (`@supabase/mcp-server-supabase`). Cuando esté activo, podés consultar el esquema real de la base de datos sin adivinar:

- **Listar tablas** y ver columnas/tipos de cada tabla.
- **Ejecutar SQL de solo lectura** para inspeccionar datos o verificar estructura.
- **Ver el esquema** de una tabla puntual antes de escribir código contra ella.

**Reglas de uso**:
- Antes de tocar una tabla, consultá su esquema real vía MCP (no asumas columnas).
- Si el MCP no está disponible (no aparece en las herramientas), caé en el fallback: consultá la API REST de Supabase con `curl` usando la URL y anon key que están en `src/lib/supabaseRest.js` / `src/lib/supabaseClient.js`.
- El `--access-token` de `.vscode/mcp.json` ya está configurado con el token real del usuario.
- El `--project-ref` ya está seteado a `ljynujodigqqujjvyoud` (el proyecto real).
- El servidor MCP se instaló globalmente (`npm install -g @supabase/mcp-server-supabase`) y `.vscode/mcp.json` usa el binario `mcp-server-supabase` (no `npx`, que fallaba por la dependencia `zod`).

**Nota**: el endpoint raíz `/rest/v1/` (OpenAPI) requiere `service_role` key, no la anon key. Para listar tablas sin MCP, usá el MCP o consultá tablas puntuales con `curl` a `/rest/v1/<tabla>?select=*&limit=1`.

## Convenciones de UI / estilos

- Cada componente tiene su propio `.css` co-localizado (CSS plano, sin CSS modules).
- Paleta recurrente: verde `#10B981`/`#059669` (acciones positivas), azul `#3498db`/`#4f46e5` (primario), rojo `#e74c3c`/`#ef4444` (peligro), grises `#2c3e50`/`#64748b` (texto).
- Modales: `ConfirmModal` (confirmación genérica, prop `type` danger/warning/info) y `CustomConfirmModal`.
- Loading: componente `Loading` (`message`, `size`, `overlay`).
- Toasts: `react-hot-toast` (`toast.success`, `toast.error`, `toast.promise`).
- Búsqueda: `normalizeText()` (quita acentos) para búsqueda insensible a tildes.
- Formato moneda: `Intl.NumberFormat('es-AR', { style:'currency', currency:'ARS' })`.

## Patrón para agregar una nueva sección al Dashboard

1. Crear componente en `src/components/<Nombre>/<Nombre>.js` + `.css`.
2. Importarlo en `src/pages/dahboard-page/dashboard.js`.
3. Agregar estado `currentSection` + handler `handleNavigateTo<X>`.
4. Agregar entrada en `src/components/Menu/Menu.js` (botón `.menu-item` con icono emoji) y pasar el handler como prop.
5. Renderizar condicionalmente en `<main className="dashboard-content">`.
6. (Opcional) indicador en el header `section-indicator`.

## Google Calendar

- `lib/googleCalendar.js` expone `initializeGoogleAPI`, `authorizeGoogleCalendar`, `isAuthorized`, `getCurrentUser`, `createCalendarEvent`, `createRecurringCalendarEvents`, `deleteCalendarEvent`, `deletePatientCalendarEvents`, `deleteAppointmentCalendarEvents`, `processInBatches`.
- Sesión persistida en `localStorage` (`googleCalendarSession`).
- `GoogleCalendarSettings` es el modal de configuración (conectar/desconectar/sincronizar/borrar).
- Los turnos se sincronizan con eventos cuyo `summary` empieza con `'Sesión'`.

## Tests

- Jest + `@testing-library/react`. `src/setupTests.js` mockea `supabaseRest`, `googleCalendar`, `googleCalendarReconnect` y `react-hot-toast` globalmente.
- Los tests de `dashboard.test.js` mockean los componentes hijos para evitar hooks internos.
- Al agregar un componente nuevo, agregar su test en `src/tests/`.

## Notas de estilo de código

- Componentes funcionales con hooks (`useState`, `useEffect`, `useContext`).
- `AuthContext` se importa desde `'../../App'` (o ruta relativa correspondiente).
- `extractUserIdFromToken` y `normalizeText` se redefinen localmente en varios archivos (no hay util compartido aún).
- Mensajes de UI en español (es-AR).

## Aprendizaje continuo (IMPORTANTE — mantener este archivo actualizado)

Este archivo es la **memoria viva del proyecto**. A medida que el proyecto escala, DEBÉS mantenerlo sincronizado para no tener que re-leer todo el codebase en cada tarea.

**Regla de oro**: cada vez que termines una tarea que introduzca algo nuevo, actualizá este mismo archivo (`.github/agents/psi-manager.agent.md`) con lo aprendido. No lo dejes desactualizado.

### Qué registrar al terminar cada tarea

1. **Nuevas tablas de Supabase**: agregá el nombre y propósito a la sección "Tablas de Supabase".
2. **Nuevos métodos de datos**: si agregaste funciones a `supabaseRest.js` o creaste un `lib/*.js` nuevo, listalos en "Capa de datos".
3. **Nuevos componentes/pantallas**: si creaste un componente o página nueva, agregalo a "Estructura clave" o a la sección correspondiente.
4. **Nuevos roles**: si aparece un rol nuevo (ej. `'google'`), actualizá "Autenticación y roles".
5. **Nuevas rutas**: si agregaste una ruta en `App.js`, registrala.
6. **Nuevos patrones/convenciones**: si descubrís un patrón nuevo (util compartido, hook custom, etc.), documentalo en "Notas de estilo de código".
7. **Nuevos scripts SQL**: si creaste un `.sql` en `src/sql/`, mencioná su propósito.
8. **Correcciones de contexto**: si algo de este archivo quedó desactualizado o incorrecto, corregilo.

### Cómo actualizar

- Usá ediciones quirúrgicas (agregar una línea a una lista, un bullet nuevo) en lugar de reescribir todo el archivo.
- Mantené el formato: bullets cortos, nombres de archivo en backticks, secciones con `##`.
- Si una sección crece mucho, dividila en subsecciones.
- No borres información que siga siendo válida; solo agregá o corregí.

### Antes de empezar una tarea

- Leé este archivo completo para cargar el contexto actual del proyecto.
- Si la tarea toca un área no documentada, explorá ese archivo puntual y luego actualizá este archivo con lo que descubras.

### Ejemplo de flujo

1. Usuario pide "agregar pantalla de peritajes con rol google".
2. Leés este archivo → ya sabés el patrón de Dashboard, roles y capa de datos.
3. Implementás: componente `Peritajes`, método `getPeritajesByUserId`, tabla `peritajes`, rol `'google'`, entrada en `Menu.js`.
4. Al terminar, actualizás este archivo: agregás `peritajes` a tablas, el método a capa de datos, el rol `'google'` a roles, y el componente a estructura.
5. La próxima tarea ya arranca con ese contexto cargado.