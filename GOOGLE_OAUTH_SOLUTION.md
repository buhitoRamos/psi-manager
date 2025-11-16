# Google Calendar OAuth - Solución para Errores CSP y 400

## ✅ Problemas Solucionados

### 1. CSP (Content Security Policy) Violations
- **Problema**: Los scripts de Google OAuth eran bloqueados por la política CSP del navegador
- **Solución**: Agregamos meta tag CSP en `public/index.html` que permite:
  - Scripts de `apis.google.com` y `accounts.google.com`
  - Iframes de Google para OAuth
  - Conexiones a APIs de Google

### 2. Scripts de Google Identity Services Faltantes
- **Problema**: El código intentaba usar `window.google.accounts.oauth2` sin cargar el script requerido
- **Solución**: Agregamos carga automática del script de Google Identity Services en `googleCalendar.js`

### 3. Credenciales Hardcoded
- **Problema**: Las credenciales API estaban en el código fuente (inseguro)
- **Solución**: Movimos toda la configuración a localStorage con interfaz de usuario

## 🔧 Configuración Requerida en Google Cloud Console

### CRÍTICO: Error 400 - "redirect_uri_mismatch"

Debes agregar estas URLs autorizadas en tu Google Cloud Console:

1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Selecciona tu proyecto
3. Ve a "Credenciales" en el menú lateral
4. Busca tu "Client ID de OAuth 2.0"
5. Haz clic en el ícono de editar (lápiz)
6. En "URIs de JavaScript autorizados" agrega:
   ```
   http://localhost:8080
   http://localhost:3000
   ```
7. Guarda los cambios

### Verificación de Configuración

**En el archivo `package.json` vemos que tu app corre en puerto 8080:**
```json
"start": "PORT=8080 react-scripts start"
```

**Por eso necesitas específicamente `http://localhost:8080` en las URLs autorizadas.**

## 🚀 Cómo Probar

1. **Reinicia tu aplicación**:
   ```bash
   npm start
   ```

2. **Abre el modal de Google Calendar**

3. **Configura tus credenciales**:
   - API Key: `AIzaSyCoN69ay8wqd4ApoMsZmeVx9qKDj8JPcdY`
   - Client ID: Tu Client ID real (reemplaza el de prueba)

4. **Haz clic en "Conectar con Google"**

## 🔍 Debugging

Si sigues teniendo problemas:

1. **Abre las herramientas de desarrollador (F12)**
2. **Ve a la pestaña Console**
3. **Busca errores específicos**
4. **Ve a la pestaña Network** para ver las requests OAuth

### Errores Comunes:

- **"redirect_uri_mismatch"**: URLs no configuradas en Google Cloud Console
- **"origin_mismatch"**: Puerto incorrecto en la configuración
- **CSP violations**: Cache del navegador (Ctrl+F5 para refrescar)

## 📝 Cambios Realizados

### 1. `public/index.html`
```html
<meta http-equiv="Content-Security-Policy" 
      content="default-src 'self'; 
               script-src 'self' 'unsafe-inline' 'unsafe-eval' https://apis.google.com https://accounts.google.com https://*.googleapis.com; 
               script-src-elem 'self' 'unsafe-inline' https://apis.google.com https://accounts.google.com https://*.googleapis.com; 
               frame-src 'self' https://accounts.google.com https://*.google.com; 
               connect-src 'self' https://apis.google.com https://accounts.google.com https://*.googleapis.com; 
               style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; 
               font-src 'self' https://fonts.gstatic.com; 
               img-src 'self' data: https:;">
```

### 2. `src/lib/googleCalendar.js`
- Carga automática de Google Identity Services
- Mejor manejo de errores OAuth
- Configuración dinámica de credenciales desde localStorage

### 3. `src/components/GoogleCalendarSettings/`
- Removidas credenciales hardcoded
- Agregada interfaz de configuración segura
- Instrucciones visuales para configuración OAuth
- Advertencias sobre URLs autorizadas

## 🎯 Próximos Pasos

1. **Configura las URLs en Google Cloud Console** (lo más importante)
2. **Prueba la conexión**
3. **Si funciona**, procede a probar la creación de eventos en el calendario
4. **Si no funciona**, revisa la consola del navegador para errores específicos

¡Esto debería resolver los errores CSP y 400 que estabas experimentando!