# Guía de Configuración de Google Calendar

## Resumen

Esta guía te ayudará a configurar la integración con Google Calendar para que los turnos se sincronicen automáticamente.

## Pasos de Configuración

### 1. Crear proyecto en Google Cloud Console

1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Crea un nuevo proyecto o selecciona uno existente
3. Asegúrate de que el proyecto esté activo

### 2. Habilitar APIs

1. Ve a "APIs & Services" > "Library"
2. Busca "Google Calendar API"
3. Haz clic en "Enable"

### 3. Crear credenciales

#### API Key
1. Ve a "APIs & Services" > "Credentials"
2. Haz clic en "Create Credentials" > "API Key"
3. Copia el API Key generado
4. (Opcional) Restringe el API Key a Google Calendar API

#### OAuth 2.0 Client ID
1. Ve a "APIs & Services" > "Credentials"
2. Haz clic en "Create Credentials" > "OAuth client ID"
3. Selecciona "Web application"
4. Agrega los orígenes autorizados:
   - `http://localhost:3000` (desarrollo)
   - Tu dominio de producción
5. Copia el Client ID generado

### 4. Configurar variables de entorno

Crea un archivo `.env` en la raíz del proyecto:

```env
REACT_APP_GOOGLE_CLIENT_ID=tu_client_id.apps.googleusercontent.com
REACT_APP_GOOGLE_API_KEY=tu_api_key
```

### 5. Configurar pantalla de consentimiento OAuth

1. Ve a "APIs & Services" > "OAuth consent screen"
2. Configura la información de tu aplicación
3. Agrega los scopes necesarios:
   - `https://www.googleapis.com/auth/calendar`
   - `https://www.googleapis.com/auth/calendar.events`

## Funcionalidades

### ✅ Conectar con Google Calendar
- Botón de configuración en la página de pacientes
- Autorización OAuth2 segura
- Estado de conexión visible

### ✅ Sincronización automática
- Turnos individuales → Eventos de Google Calendar
- Turnos recurrentes → Serie de eventos recurrentes
- Actualización automática al crear/editar turnos

### ✅ Gestión de eventos
- Creación de eventos con título del paciente
- Fecha y hora automática del turno
- Descripción con información relevante
- Eliminación de eventos al cancelar turnos

## Solución de problemas

### Error: "Invalid client ID"
- Verifica que el Client ID sea correcto
- Asegúrate de que el dominio esté autorizado

### Error: "API key not valid"
- Verifica que el API Key sea correcto
- Asegúrate de que Google Calendar API esté habilitada

### Error: "Access denied"
- Verifica los scopes de OAuth
- Asegúrate de que el usuario haya autorizado el acceso

### Error: "Calendar not found"
- El usuario debe tener al menos un calendario en su cuenta
- Verifica los permisos de acceso al calendario

## Limitaciones

- Requiere conexión a internet para sincronización
- El usuario debe tener una cuenta de Google
- Límites de quota de la API de Google (generalmente suficientes para uso normal)

## Desarrollo

Para desarrollar localmente:
1. Configura las variables de entorno
2. Agrega `http://localhost:3000` como origen autorizado
3. Inicia el servidor de desarrollo con `npm start`
4. Prueba la funcionalidad en la página de pacientes

## Producción

Para producción:
1. Agrega tu dominio de producción a los orígenes autorizados
2. Configura las variables de entorno en tu plataforma de despliegue
3. Verifica que HTTPS esté habilitado (requerido para OAuth)