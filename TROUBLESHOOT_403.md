# 🔧 Solución para Error 403 - API_KEY_SERVICE_BLOCKED

## ❌ **Error Encontrado:**
```json
{
  "error": {
    "code": 403,
    "message": "Requests to this API calendar method google.discovery.Discovery.GetDiscoveryRest are blocked.",
    "status": "PERMISSION_DENIED"
  }
}
```

## ⏰ **Estado Actual - Problema de Origen Identificado**

### **Problema Encontrado:**
- ✅ **API Key configurada**: `AIzaSyCoN69ay8wqd4ApoMsZmeVx9qKDj8JPcdY`
- ✅ **Client ID configurado**: `501215429458-mkc6m9gs38cau7nggkfr59381in21cdp.apps.googleusercontent.com`
- ❌ **Origen bloqueado**: La app corre en `/dashboard` pero OAuth solo permite raíz

### **Respuesta Actual:**
```json
{"valid":true,"blocked":true,"suppressed":false}
```

**Problema:** El Client ID OAuth solo permite `http://localhost:3000` pero la app está en `http://localhost:3000/dashboard`

### **Solución en Google Cloud Console:**

#### **Orígenes autorizados de JavaScript:**
```
http://localhost:3000
http://localhost:3000/dashboard
```

#### **URI de redirección autorizados:**
```
http://localhost:3000  
http://localhost:3000/dashboard
```

### **Respuesta Esperada (después de configurar):**
```json
{"valid":true,"blocked":false,"suppressed":false}
```

---

### 1. **Código Actualizado**
- Removido `discoveryDocs` que causaba el bloqueo
- Usando `gapi.client.load('calendar', 'v3')` directamente
- Método más directo sin discovery API

### 2. **Verificar Configuración en Google Cloud Console**

#### A. **Restricciones de la API Key:**
1. Ir a [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Hacer clic en la API Key: `AIzaSyArh8FrSUbSrBHd1gGfqifcUl13fpBTWN8`
3. **Restricciones de aplicación:**
   ```
   Referentes HTTP (sitios web)
   http://localhost:3000/*
   https://localhost:3000/*
   ```
4. **Restricciones de API:**
   ```
   ✅ Google Calendar API
   ```

#### B. **Crear Nueva API Key (Alternativa):**
1. "CREAR CREDENCIALES" → "Clave de API"
2. **No aplicar restricciones inicialmente** (para testing)
3. Probar la conexión
4. Aplicar restricciones después

## 🧪 **Para Probar:**

1. **Refrescar la aplicación** (F5 o Ctrl+R)
2. **Abrir Console del navegador** (F12)
3. **Intentar conectar** con Google Calendar
4. **Verificar mensajes** en la consola

## 📋 **Alternativa: API Key sin restricciones**

Si el problema persiste, crear una API Key temporal sin restricciones:

```bash
# En Google Cloud Console:
# 1. Crear nueva API Key
# 2. NO aplicar restricciones
# 3. Copiar la nueva key
# 4. Reemplazar en el código
```

## ⚡ **Estado Actual del Código:**

```javascript
// Método actualizado sin discoveryDocs
await gapi.client.init({
  apiKey: apiKey,
  clientId: clientId,
  scope: 'https://www.googleapis.com/auth/calendar'
});

// Carga directa de Calendar API
await gapi.client.load('calendar', 'v3');
```

---

**Próximo paso: Probar la conexión con el código actualizado** 🚀