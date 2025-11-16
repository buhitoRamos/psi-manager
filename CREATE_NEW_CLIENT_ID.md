# 🆕 Crear Nuevo Client ID OAuth - Guía Rápida

## 📋 Pasos para crear Client ID desde cero:

### 1. En Google Cloud Console:
- Ir a: https://console.cloud.google.com/apis/credentials
- Hacer clic: "CREAR CREDENCIALES" → "ID de cliente de OAuth 2.0"

### 2. Configurar:
```
Tipo de aplicación: Aplicación web
Nombre: PSI Manager Calendar (Nuevo)
Orígenes autorizados de JavaScript: http://localhost:3000
URI de redirección autorizados: http://localhost:3000
```

### 3. Copiar el nuevo Client ID
```
Ejemplo: 123456789-abcdefghijklmnop.apps.googleusercontent.com
```

### 4. Reemplazar en el código:
```javascript
// En GoogleCalendarSettings.js línea 25:
clientId: 'TU_NUEVO_CLIENT_ID_AQUI'
```

### 5. Probar inmediatamente
- Los Client ID nuevos funcionan al instante
- No hay tiempo de propagación

---

## 🎯 Client ID actual problemático:
```
501215429458-mkc6m9gs38cau7nggkfr59381in21cdp.apps.googleusercontent.com
```

**¿Crear uno nuevo o seguir debuggando el actual?**