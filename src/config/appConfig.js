/**
 * 🔧 Configuración de la Aplicación
 * 
 * Este archivo centraliza todas las configuraciones que serán variables de entorno en producción.
 * En desarrollo usa valores por defecto, en producción usará process.env
 */

// 🗄️ Configuración de Base de Datos (Supabase)
export const DATABASE_CONFIG = {
  url: process.env.REACT_APP_SUPABASE_URL || 'https://your-project.supabase.co',
  anonKey: process.env.REACT_APP_SUPABASE_ANON_KEY || 'your-supabase-anon-key'
};

// 📅 Configuración de Google Calendar
export const GOOGLE_CALENDAR_CONFIG = {
  apiKey: process.env.REACT_APP_GOOGLE_API_KEY || 'your-api-key-here',
  clientId: process.env.REACT_APP_GOOGLE_CLIENT_ID || 'your-client-id-here.apps.googleusercontent.com'
};

// 🔐 Configuración de Autenticación
export const AUTH_CONFIG = {
  jwtSecret: process.env.REACT_APP_JWT_SECRET || 'change-me-in-prod',
  sessionDuration: '24h'
};

// 🌐 Configuración de API Externa
export const API_CONFIG = {
  serverUrl: process.env.REACT_APP_SERVER_URL || 'http://localhost:4000'
};

// 🚀 Configuración de Entorno
export const ENVIRONMENT = {
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production',
  appVersion: process.env.REACT_APP_VERSION || '1.0.0'
};

// 📊 Debug y Logging
export const DEBUG_CONFIG = {
  enableConsoleLogging: process.env.REACT_APP_ENABLE_LOGGING === 'true' || ENVIRONMENT.isDevelopment,
  enableErrorReporting: ENVIRONMENT.isProduction
};

/**
 * 🔍 Función para verificar configuración
 * Útil para debugging y verificar que las variables estén configuradas
 */
export const validateConfig = () => {
  const issues = [];
  
  if (!GOOGLE_CALENDAR_CONFIG.apiKey || GOOGLE_CALENDAR_CONFIG.apiKey === 'your-api-key') {
    issues.push('Google API Key no configurada');
  }
  
  if (!GOOGLE_CALENDAR_CONFIG.clientId || GOOGLE_CALENDAR_CONFIG.clientId === 'your-client-id') {
    issues.push('Google Client ID no configurado');
  }
  
  if (!DATABASE_CONFIG.url || DATABASE_CONFIG.url === 'https://your-project.supabase.co') {
    issues.push('Supabase URL no configurada');
  }
  
  return {
    isValid: issues.length === 0,
    issues
  };
};

// 📝 Export por defecto con toda la configuración
const appConfig = {
  database: DATABASE_CONFIG,
  google: GOOGLE_CALENDAR_CONFIG,
  auth: AUTH_CONFIG,
  api: API_CONFIG,
  environment: ENVIRONMENT,
  debug: DEBUG_CONFIG,
  validate: validateConfig
};

export default appConfig;