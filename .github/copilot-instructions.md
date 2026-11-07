# PSI Manager - Instrucciones del Proyecto

## Contexto
Este es PSI Manager, un sistema de gestión de pacientes para profesionales de la psicología. Está construido con React 18 + Supabase + Google Calendar API.

## Antes de Cualquier Cambio
1. Lee `.github/psi-knowledge-base.md` para entender el estado actual del proyecto
2. Si vas a crear/modificar algo significativo, usa el agente **PSI Expert** (`.github/agents/psi-expert.agent.md`)
3. Busca patrones existentes con `grep` antes de introducir algo nuevo

## Reglas de Oro
- **Mantén consistencia**: Sigue los patrones establecidos en el knowledge base
- **Documenta**: Actualiza el knowledge base después de cambios importantes
- **Prueba**: Ejecuta `npm test` o verifica la UI antes de considerar listo
- **No rompas**: El `typo` `dahboard-page` es intencional (no renombrar)
- **Aprende**: Si descubres algo nuevo sobre el proyecto, documentalo

## Stack Recordatorio
- React 18.2, React Router 6, CRA 5.0.1
- Supabase JS v2, PostgreSQL RPC
- Google Calendar API v3 (OAuth 2.0)
- Puerto dev: 8080

## Estructura Clave
- `src/App.js` - Entry point, AuthContext, Router
- `src/contexts/` - Contextos React (AppointmentsUpdateContext)
- `src/lib/` - Clientes y utilidades (supabase, googleCalendar, auth)
- `src/components/` - Componentes reutilizables
- `src/pages/` - Páginas principales
- `src/sql/` - Scripts PostgreSQL/RPC para Supabase
- `src/config/appConfig.js` - Configuración centralizada
