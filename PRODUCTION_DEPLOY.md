# 🚀 Configuración para Hosting en Producción

## ✅ **Cambios Necesarios para Producción**

### 1. **Google Cloud Console - URLs Autorizadas**

En tu [Google Cloud Console](https://console.cloud.google.com/):

**Client ID OAuth 2.0** → Editar → **URIs de JavaScript autorizados**:
```
http://localhost:8080                    (desarrollo)
https://tu-dominio-de-produccion.com     (producción)
```

**Ejemplos según tu hosting:**
- Netlify: `https://mi-app.netlify.app`
- Vercel: `https://mi-app.vercel.app` 
- GitHub Pages: `https://usuario.github.io/psi-manager`

### 2. **Variables de Entorno en Hosting**

#### Para Netlify:
1. Ir a Site settings → Environment variables
2. Agregar:
   ```
   REACT_APP_GOOGLE_API_KEY=AIzaSyCoN69ay8wqd4ApoMsZmeVx9qKDj8JPcdY
   REACT_APP_GOOGLE_CLIENT_ID=501215429458-mkc6m9gs38cau7nggkfr59381in21cdp.apps.googleusercontent.com
   ```

#### Para Vercel:
1. Project settings → Environment Variables
2. Agregar las mismas variables

#### Para GitHub Pages:
Variables se configuran en el código (menos seguro pero funcional)

### 3. **Archivo CSP Configurado ✅**

Ya configuramos el CSP en `public/index.html` para que funcione tanto en desarrollo como producción.

### 4. **Build de Producción**

```bash
npm run build
```

Esto genera la carpeta `build/` optimizada para hosting.

## 🔧 **Servicios de Hosting Recomendados**

### **Netlify** (Recomendado - Gratis)
1. Conectar repositorio GitHub
2. Build command: `npm run build`
3. Publish directory: `build`
4. Configurar variables de entorno

### **Vercel** (Excelente para React)
1. Importar proyecto desde GitHub
2. Auto-detecta configuración React
3. Configurar variables de entorno

### **GitHub Pages**
1. Instalar: `npm install --save-dev gh-pages`
2. Agregar a package.json:
   ```json
   "homepage": "https://usuario.github.io/psi-manager",
   "scripts": {
     "predeploy": "npm run build",
     "deploy": "gh-pages -d build"
   }
   ```

## ⚠️ **Problemas Comunes en Producción**

### 1. **Error "redirect_uri_mismatch"**
- **Causa**: URL de producción no está en Google Cloud Console
- **Solución**: Agregar URL exacta de producción

### 2. **CSP Violations**
- **Causa**: Hosting con CSP muy restrictivo
- **Solución**: Ya configurado en index.html

### 3. **Variables de entorno no definidas**
- **Causa**: No configuraste las variables en el hosting
- **Solución**: Revisar configuración del hosting

### 4. **HTTPS requerido**
- **Causa**: Google OAuth requiere HTTPS en producción
- **Solución**: La mayoría de hostings dan HTTPS automático

## 🧪 **Checklist antes de Deploy**

- [ ] URLs autorizadas agregadas en Google Cloud Console
- [ ] Variables de entorno configuradas en hosting
- [ ] Build de prueba: `npm run build`
- [ ] CSP configurado (✅ ya hecho)
- [ ] SSL/HTTPS disponible en hosting

## 🎯 **URL Final Esperada**

Tu app funcionará en:
- **Desarrollo**: `http://localhost:8080`
- **Producción**: `https://tu-dominio.com`

¡Ambas con Google Calendar funcionando perfectamente!

## 📞 **Soporte Post-Deploy**

Si tienes problemas después del deploy:
1. Revisar console del navegador (F12)
2. Verificar variables de entorno en hosting
3. Confirmar URLs en Google Cloud Console
4. Verificar que el dominio tenga HTTPS

¡Tu app está lista para producción! 🚀