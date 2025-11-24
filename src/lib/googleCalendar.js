
import { GOOGLE_CALENDAR_CONFIG, DEBUG_CONFIG } from '../config/appConfig.js';
// Utilidad para verificar si la API de Google está lista
export function isGoogleApiReady() {
  return (
    typeof window !== 'undefined' &&
    window.gapi &&
    window.gapi.client &&
    typeof window.gapi.client.init === 'function'
  );
}
/**
 * Google Calendar Integration - Versión con API Real
 * Usa configuración centralizada desde appConfig.js
 */

let isGoogleLoaded = false;
let currentUser = null;

// Clave para localStorage
const LOCAL_STORAGE_KEY = 'googleCalendarSession';

// Función para restaurar sesión desde localStorage
const restoreSessionFromStorage = () => {
  try {
    const savedSession = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (savedSession) {
      const session = JSON.parse(savedSession);
      if (session && session.access_token && session.userInfo) {
        currentUser = session.userInfo;
        // Solo configurar token si gapi está disponible
        if (window.gapi && window.gapi.client) {
          window.gapi.client.setToken({ access_token: session.access_token });
        }
        return true;
      }
    }
  } catch (error) {
    if (typeof window !== 'undefined' && window.toast) {
      window.toast.error('Error restaurando sesión desde localStorage: ' + (error.message || error));
    } else {
      console.error('Error restaurando sesión desde localStorage:', error);
    }
    localStorage.removeItem(LOCAL_STORAGE_KEY);
  }
  return false;
};

// Función para guardar sesión en localStorage
const saveSessionToStorage = (accessToken, userInfo) => {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify({
      access_token: accessToken,
      userInfo: userInfo,
      timestamp: Date.now()
    }));
  } catch (error) {
    if (typeof window !== 'undefined' && window.toast) {
      window.toast.error('Error guardando sesión en localStorage: ' + (error.message || error));
    } else {
      console.error('Error guardando sesión en localStorage:', error);
    }
  }
};

// Restaurar sesión al cargar el módulo
restoreSessionFromStorage();

/**
 * Cargar script dinámicamente
 */
const loadScript = (src) => {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
};

/**
 * Inicializar Google APIs con credenciales dinámicas
 * @param {string} apiKey - API Key desde configuración
 * @param {string} clientId - Client ID desde configuración
 */
export const initializeGoogleAPI = async (apiKey, clientId) => {
  try {
    console.log('🚀 Iniciando carga de Google APIs...');
    
    // Cargar Google API y Google Identity Services scripts
    if (!window.gapi) {
      console.log('📦 Cargando Google API script...');
      await loadScript('https://apis.google.com/js/api.js');
    }
    
    if (!window.google) {
      console.log('🔐 Cargando Google Identity Services script...');
      await loadScript('https://accounts.google.com/gsi/client');
    }
      
    return new Promise((resolve, reject) => {
      console.log('⚙️ Inicializando gapi client...');
      
      window.gapi.load('client:auth2', async () => {
        try {
          // Inicializar solo con API Key para cargar la Calendar API
          await window.gapi.client.init({
            apiKey: apiKey,
            discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest']
          });

          console.log('✅ Google API inicializada correctamente');
          isGoogleLoaded = true;
          
          // Restaurar sesión desde localStorage si existe
          if (restoreSessionFromStorage()) {
            console.log('🔄 Sesión de Google Calendar restaurada desde localStorage');
          }
          
          resolve(window.gapi);
        } catch (error) {
          if (typeof window !== 'undefined' && window.toast) {
            window.toast.error('❌ Error inicializando Google API: ' + (error.message || error));
          } else {
            console.error('❌ Error inicializando Google API:', error);
          }
          reject(error);
        }
      });
    });
  } catch (error) {
    if (typeof window !== 'undefined' && window.toast) {
      window.toast.error('❌ Error loading Google API: ' + (error.message || error));
    } else {
      console.error('❌ Error loading Google API:', error);
    }
    throw error;
  }
};

/**
 * Autorizar con Google usando Google Identity Services
 */
export const authorizeGoogleCalendar = async () => {
  try {
    // Validar configuración
    const apiKey = GOOGLE_CALENDAR_CONFIG.apiKey;
    const clientId = GOOGLE_CALENDAR_CONFIG.clientId;
    
    if (!apiKey || apiKey.trim() === '' || apiKey === 'your-api-key-here') {
      throw new Error('API Key de Google no configurada correctamente. Revisa tu configuración.');
    }
    
    if (!clientId || clientId.trim() === '' || clientId === 'your-client-id-here.apps.googleusercontent.com') {
      throw new Error('Client ID de Google no configurado correctamente. Revisa tu configuración.');
    }
    
    if (DEBUG_CONFIG.enableConsoleLogging) {
      console.log('🔑 Iniciando autorización con credenciales configuradas');
      console.log('📋 API Key:', apiKey.substring(0, 10) + '...');
      console.log('📋 Client ID:', clientId.substring(0, 20) + '...');
    }

    if (!isGoogleLoaded) {
      await initializeGoogleAPI(apiKey, clientId);
    }

    // Verificar que Google Identity Services esté disponible
    if (!window.google || !window.google.accounts) {
      if (typeof window !== 'undefined' && window.toast) {
        window.toast.error('❌ Google Identity Services no está disponible');
      } else {
        console.error('❌ Google Identity Services no está disponible');
      }
      throw new Error('Google Identity Services no se cargó correctamente. Intenta recargar la página.');
    }

    if (DEBUG_CONFIG.enableConsoleLogging) {
      console.log('✅ Google Identity Services disponible, iniciando OAuth...');
    }

    return new Promise((resolve, reject) => {
      try {
        const client = window.google.accounts.oauth2.initTokenClient({
          client_id: clientId,
          scope: 'https://www.googleapis.com/auth/calendar.events',
          callback: (response) => {
            if (DEBUG_CONFIG.enableConsoleLogging) {
              console.log('📥 Respuesta OAuth recibida:', response);
            }
            
            if (response.error) {
              if (typeof window !== 'undefined' && window.toast) {
                window.toast.error('❌ OAuth error: ' + (response.error || 'Error desconocido'));
              } else {
                console.error('❌ OAuth error:', response);
              }
              let errorMessage = 'Error en la autorización';
              
              switch (response.error) {
                case 'popup_closed_by_user':
                  errorMessage = 'Ventana de autorización cerrada. Intenta nuevamente.';
                  break;
                case 'access_denied':
                  errorMessage = 'Acceso denegado. Necesitas autorizar el acceso al calendario.';
                  break;
                case 'invalid_client':
                  errorMessage = 'Credenciales de cliente inválidas. Revisa la configuración.';
                  break;
                case 'unauthorized_client':
                  errorMessage = 'Cliente no autorizado. Verifica la configuración en Google Cloud Console.';
                  break;
                default:
                  errorMessage = `Error OAuth: ${response.error} - ${response.error_description || ''}`;
              }
              
              resolve({
                success: false,
                error: errorMessage
              });
              return;
            }
            
            if (!response.access_token) {
              if (typeof window !== 'undefined' && window.toast) {
                window.toast.error('❌ No se recibió access_token');
              } else {
                console.error('❌ No se recibió access_token');
              }
              resolve({
                success: false,
                error: 'No se pudo obtener el token de acceso'
              });
              return;
            }
            
            // Configurar el token de acceso
            window.gapi.client.setToken({
              access_token: response.access_token
            });

            if (DEBUG_CONFIG.enableConsoleLogging) {
              console.log('🔐 Token configurado exitosamente');
            }

            // Para simplicidad, usar información básica en lugar de hacer otra llamada API
            // que puede fallar por permisos
            currentUser = {
              email: 'usuario@gmail.com',
              name: 'Usuario de Google Calendar',
              image: null,
              authenticated: true
            };
            
            // Guardar sesión en localStorage
            saveSessionToStorage(response.access_token, currentUser);
            
            if (DEBUG_CONFIG.enableConsoleLogging) {
              console.log('✅ Usuario autorizado con Google Calendar y sesión guardada');
            }
            
            // Retornar objeto con formato esperado
            resolve({
              success: true,
              userInfo: currentUser
            });
          }
        });

        if (DEBUG_CONFIG.enableConsoleLogging) {
          console.log('🚀 Solicitando token de acceso...');
        }
        // Ejecutar la autorización
        client.requestAccessToken();
        
        // Timeout de seguridad
        setTimeout(() => {
          resolve({
            success: false,
            error: 'Timeout: La autorización tardó demasiado. Intenta nuevamente.'
          });
        }, 30000); // 30 segundos
        
      } catch (clientError) {
        if (typeof window !== 'undefined' && window.toast) {
          window.toast.error('❌ Error creando cliente OAuth: ' + (clientError.message || clientError));
        } else {
          console.error('❌ Error creando cliente OAuth:', clientError);
        }
        resolve({
          success: false,
          error: `Error inicializando cliente OAuth: ${clientError.message}`
        });
      }
    });
  } catch (error) {
    if (typeof window !== 'undefined' && window.toast) {
      window.toast.error('❌ Error en autorización: ' + (error.message || error));
    } else {
      console.error('❌ Error en autorización:', error);
    }
    throw error;
  }
};

/**
 * Verificar si el usuario está autorizado
 */
export const isAuthorized = () => {
  // Primero verificar localStorage
  if (restoreSessionFromStorage()) {
    return true;
  }
  
  // Luego verificar gapi
  return window.gapi && window.gapi.client && window.gapi.client.getToken() !== null;
};

/**
 * Desconectar usuario
 */
export const revokeAuthorization = () => {
  if (window.gapi && window.gapi.client) {
    window.gapi.client.setToken(null);
  }
  currentUser = null;
  
  // Eliminar sesión de localStorage
  localStorage.removeItem(LOCAL_STORAGE_KEY);
  
  if (DEBUG_CONFIG.enableConsoleLogging) {
    console.log('🔌 Sesión de Google Calendar eliminada completamente');
  }
};

/**
 * Obtener usuario actual
 */
export const getCurrentUser = () => {
  // Si tenemos usuario en memoria, devolverlo
  if (currentUser) {
    return currentUser;
  }
  
  // Si no, intentar restaurar desde localStorage
  try {
    const savedSession = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (savedSession) {
      const session = JSON.parse(savedSession);
      if (session && session.userInfo) {
        currentUser = session.userInfo;
        return currentUser;
      }
    }
  } catch (error) {
    if (typeof window !== 'undefined' && window.toast) {
      window.toast.error('Error obteniendo usuario desde localStorage: ' + (error.message || error));
    } else {
      console.error('Error obteniendo usuario desde localStorage:', error);
    }
  }
  
  return null;
};

/**
 * Desconectar de Google Calendar (alias para revokeAuthorization)
 */
export const disconnectGoogleCalendar = () => {
  revokeAuthorization();
};

/**
 * Crear evento en Google Calendar usando API real
 */
export const createCalendarEvent = async (appointmentData, patientData) => {
  try {
    if (!isAuthorized()) {
      throw new Error('Debes autenticarte con Google primero');
    }

    // Verificar que la API de Google esté lista
    if (
      !window.gapi ||
      !window.gapi.client ||
      !window.gapi.client.calendar ||
      typeof window.gapi.client.calendar.events === 'undefined'
    ) {
      throw new Error('La API de Google Calendar no está lista. Por favor, vuelve a conectar o recarga la página.');
    }

    // ===== DEBUGGING: Revisar datos recibidos =====
    console.log('🔍 [createCalendarEvent] appointmentData:', appointmentData);
    console.log('🔍 [createCalendarEvent] patientData:', patientData);

    const startDate = new Date(appointmentData.date);
    const endDate = new Date(startDate.getTime() + 60 * 60 * 1000); // 1 hora

    // Formatear el nombre del paciente
    const patientName = patientData 
      ? `${patientData.name || ''} ${patientData.last_name || ''}`.trim()
      : 'Paciente';

    console.log('🔍 [createCalendarEvent] patientName formateado:', patientName);

    const event = {
      'summary': `Sesión con ${patientName}`,
      'description': `Sesión de psicología con ${patientName}${appointmentData.observation ? `\n\nObservaciones: ${appointmentData.observation}` : ''}`,
      'start': {
        'dateTime': startDate.toISOString(),
        'timeZone': Intl.DateTimeFormat().resolvedOptions().timeZone
      },
      'end': {
        'dateTime': endDate.toISOString(),
        'timeZone': Intl.DateTimeFormat().resolvedOptions().timeZone
      },
      'reminders': {
        'useDefault': true
      }
    };

    const response = await window.gapi.client.calendar.events.insert({
      'calendarId': 'primary',
      'resource': event
    });

    console.log('✅ Evento creado en Google Calendar:', response.result);
    
    return {
      success: true,
      eventId: response.result.id,
      eventUrl: response.result.htmlLink
    };
  } catch (error) {
    if (typeof window !== 'undefined' && window.toast) {
      window.toast.error('❌ No se pudo conectar con Google Calendar: ' + (error.message || error));
    } else {
      if (typeof window !== 'undefined' && window.toast) {
        window.toast.error('❌ No se pudo conectar con Google Calendar: ' + (error.message || error));
      } else {
        console.error('❌ No se pudo conectar con Google Calendar:', error);
      }
    }
    
    // Si hay error de permisos, crear enlace como fallback
    if (error.status === 403 || error.status === 401) {
      return createCalendarEventFallback(appointmentData, patientData);
    }
    
    throw new Error(`No se pudo crear el evento: ${error.message}`);
  }
};

/**
 * Fallback: crear enlace de Google Calendar si la API falla
 */
const createCalendarEventFallback = (appointmentData, patientData) => {
  const startDate = new Date(appointmentData.date);
  const endDate = new Date(startDate.getTime() + 60 * 60 * 1000);
  
  const patientName = patientData 
    ? `${patientData.name || ''} ${patientData.last_name || ''}`.trim()
    : 'Paciente';

  const title = `Sesión con ${patientName}`;
  const description = `Sesión de psicología con ${patientName}${appointmentData.observation ? `\n\nObservaciones: ${appointmentData.observation}` : ''}`;
  
  const startDateStr = startDate.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const endDateStr = endDate.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  
  const calendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${startDateStr}/${endDateStr}&details=${encodeURIComponent(description)}`;
  
  // Guardar enlace para mostrar al usuario
  window.open(calendarUrl, '_blank', 'width=800,height=600');
  
  return {
    success: true,
    eventId: `fallback-${Date.now()}`,
    eventUrl: calendarUrl,
    fallback: true
  };
};

/**
 * Crear múltiples eventos de manera eficiente (SIN abrir ventanas)
 */
export const createRecurringCalendarEvents = async (appointments, patientData) => {
  if (!isAuthorized()) {
    throw new Error('Debes autenticarte con Google primero');
  }

  const results = [];
  const errors = [];
  let fallbackUsed = false;

  console.log(`🔄 Creando ${appointments.length} eventos de Google Calendar...`);

  // Procesar en lotes de 10 en paralelo, con 3 segundos entre bloques
  const batchSize = 10;
  for (let i = 0; i < appointments.length; i += batchSize) {
    const batch = appointments.slice(i, i + batchSize);
    const batchPromises = batch.map(appointment => {
      return createCalendarEvent(appointment, patientData)
        .then(result => ({ success: true, result, appointment, fallback: result.fallback || false }))
        .catch(error => {
          if (typeof window !== 'undefined' && window.toast) {
            window.toast.error('Error creando evento de Google Calendar: ' + (error.message || error));
          } else {
            console.error('Error creating calendar event:', error);
          }
          return { success: false, error: error.message, appointment, fallback: false };
        });
    });

    const batchResults = await Promise.all(batchPromises);

    // Procesar resultados y evitar referencia insegura en bucle
    const successfulResults = [];
    const failedResults = [];
    let batchHasFallback = false;

    batchResults.forEach(item => {
      if (item.success) {
        successfulResults.push(item.result);
        if (item.fallback) {
          batchHasFallback = true;
        }
      } else {
        failedResults.push({ appointment: item.appointment, error: item.error });
      }
    });

    // Actualizar arrays principales
    results.push(...successfulResults);
    errors.push(...failedResults);
    if (batchHasFallback) {
      fallbackUsed = true;
    }

    // Pausa de 3 segundos entre lotes
    if (i + batchSize < appointments.length) {
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }

  console.log(`✅ Procesamiento completado: ${results.length} éxitos, ${errors.length} errores`);

  return {
    success: results.length > 0,
    created: results.length,
    errors: errors.length,
    results,
    errorDetails: errors,
    fallbackUsed: fallbackUsed
  };
};

/**
 * Buscar eventos en Google Calendar por paciente
 * @param {Object} patientData - Datos del paciente
 * @param {Array} appointments - Array de citas para buscar por fechas
 * @returns {Array} - Lista de eventos encontrados
 */
export const findPatientEvents = async (patientData, appointments = []) => {
  try {
    if (!isAuthorized()) {
      throw new Error('Debes autenticarte con Google primero');
    }

    const patientName = patientData 
      ? `${patientData.name || ''} ${patientData.last_name || ''}`.trim()
      : 'Paciente';

    if (DEBUG_CONFIG.enableConsoleLogging) {
      console.log(`🔍 Buscando eventos para paciente: ${patientName}`);
    }

    // Si tenemos citas específicas, buscar por rango de fechas
    let timeMin, timeMax;
    if (appointments.length > 0) {
      const dates = appointments.map(apt => new Date(apt.date));
      timeMin = new Date(Math.min(...dates));
      timeMax = new Date(Math.max(...dates));
      
      // Agregar margen de búsqueda
      timeMin.setHours(0, 0, 0, 0);
      timeMax.setHours(23, 59, 59, 999);
    } else {
      // Buscar en los últimos 30 días y próximos 365 días
      timeMin = new Date();
      timeMin.setDate(timeMin.getDate() - 30);
      timeMax = new Date();
      timeMax.setDate(timeMax.getDate() + 365);
    }

    // Buscar primero con el nombre específico, luego con término genérico
    let searchQuery = `Sesión con ${patientName}`;
    
    console.log('🔍 [findPatientEvents] Buscando con query:', searchQuery);
    console.log('🔍 [findPatientEvents] rango de fechas:', { timeMin: timeMin.toISOString(), timeMax: timeMax.toISOString() });

    let response = await window.gapi.client.calendar.events.list({
      calendarId: 'primary',
      timeMin: timeMin.toISOString(),
      timeMax: timeMax.toISOString(),
      q: searchQuery,
      singleEvents: true,
      orderBy: 'startTime'
    });

    let events = response.result.items || [];
    
    // Si no encontramos eventos con el nombre específico, buscar con término genérico
    if (events.length === 0 && patientName !== 'Paciente') {
      console.log('🔍 [findPatientEvents] No se encontraron eventos específicos, buscando con término genérico');
      searchQuery = 'Sesión con';
      
      response = await window.gapi.client.calendar.events.list({
        calendarId: 'primary',
        timeMin: timeMin.toISOString(),
        timeMax: timeMax.toISOString(),
        q: searchQuery,
        singleEvents: true,
        orderBy: 'startTime'
      });

      events = response.result.items || [];
      console.log('🔍 [findPatientEvents] Eventos encontrados con búsqueda genérica:', events.length);
    }
    
    console.log('🔍 [findPatientEvents] Eventos encontrados antes de filtrar:', events.length);
    
    if (DEBUG_CONFIG.enableConsoleLogging) {
      events.forEach(event => {
        console.log('📅 Evento:', {
          id: event.id,
          summary: event.summary,
          start: event.start?.dateTime || event.start?.date,
          description: event.description
        });
      });
      console.log(`📋 Encontrados ${events.length} eventos para ${patientName}`);
    }

    const filteredEvents = events.filter(event => {
      // Filtrar eventos que contengan el nombre del paciente O que sean eventos genéricos de sesión
      const summary = (event.summary || '').toLowerCase();
      const description = (event.description || '').toLowerCase();
      const patientNameLower = patientName.toLowerCase();
      
      // Si es un nombre específico, buscar coincidencias
      let matches = false;
      if (patientNameLower !== 'paciente') {
        matches = summary.includes(patientNameLower) || description.includes(patientNameLower);
      }
      
      // Si no hay coincidencias específicas, buscar eventos genéricos de sesión
      if (!matches) {
        const isSessionEvent = summary.includes('sesión con') || summary.includes('sesion con');
        matches = isSessionEvent;
      }
      
      if (DEBUG_CONFIG.enableConsoleLogging) {
        console.log('🔍 Evaluando evento:', {
          summary: event.summary,
          patientNameLower,
          summaryIncludes: summary.includes(patientNameLower),
          descriptionIncludes: description.includes(patientNameLower),
          isSessionEvent: summary.includes('sesión con') || summary.includes('sesion con'),
          matches
        });
      }
      
      return matches;
    });

    console.log('🔍 [findPatientEvents] Eventos después del filtro:', filteredEvents.length);

    return filteredEvents;
  } catch (error) {
    if (typeof window !== 'undefined' && window.toast) {
      window.toast.error('❌ Error buscando eventos: ' + (error.message || error));
    } else {
      console.error('❌ Error buscando eventos:', error);
    }
    throw new Error(`No se pudieron buscar los eventos: ${error.message}`);
  }
};

/**
 * Eliminar un evento específico de Google Calendar
 * @param {string} eventId - ID del evento a eliminar
 * @returns {boolean} - True si se eliminó exitosamente
 */
export const deleteCalendarEvent = async (eventId) => {
  try {
    if (!isAuthorized()) {
      throw new Error('Debes autenticarte con Google primero');
    }

    await window.gapi.client.calendar.events.delete({
      calendarId: 'primary',
      eventId: eventId
    });

    if (DEBUG_CONFIG.enableConsoleLogging) {
      console.log(`✅ Evento ${eventId} eliminado del calendario`);
    }

    return true;
  } catch (error) {
    if (typeof window !== 'undefined' && window.toast) {
      window.toast.error(`❌ Error eliminando evento ${eventId}: ` + (error.message || error));
    } else {
      console.error(`❌ Error eliminando evento ${eventId}:`, error);
    }
    // Si el evento no existe, considerar como éxito
    if (error.status === 404 || error.status === 410) {
      if (DEBUG_CONFIG.enableConsoleLogging) {
        console.log(`⚠️ Evento ${eventId} ya no existe en el calendario`);
      }
      return true;
    }
    return false;
  }
};

/**
 * Eliminar múltiples eventos de Google Calendar para un paciente
 * @param {Object} patientData - Datos del paciente
 * @param {Array} appointments - Array de citas (opcional, para búsqueda más precisa)
 * @returns {Object} - Resultado de la operación
 */
export const deletePatientCalendarEvents = async (patientData, appointments = []) => {
  try {
    if (!isAuthorized()) {
      throw new Error('Debes autenticarte con Google primero');
    }

    // ===== DEBUGGING: Revisar datos recibidos =====
    console.log('🗑️ [deletePatientCalendarEvents] patientData:', patientData);
    console.log('🗑️ [deletePatientCalendarEvents] appointments:', appointments);

    const patientName = patientData 
      ? `${patientData.name || ''} ${patientData.last_name || ''}`.trim()
      : 'Paciente';

    if (DEBUG_CONFIG.enableConsoleLogging) {
      console.log(`🗑️ Eliminando eventos de Google Calendar para: ${patientName}`);
    }

    // Buscar eventos del paciente
    const events = await findPatientEvents(patientData, appointments);

    if (events.length === 0) {
      if (DEBUG_CONFIG.enableConsoleLogging) {
        console.log(`📭 No se encontraron eventos para eliminar para ${patientName}`);
      }
      return {
        success: true,
        deleted: 0,
        errors: 0,
        message: `No se encontraron eventos en el calendario para ${patientName}`
      };
    }


    // Eliminar eventos en bloques de 10 en paralelo, con 3 segundos entre bloques
    const results = [];
    const errors = [];
    const batchSize = 10;
    for (let i = 0; i < events.length; i += batchSize) {
      const batch = events.slice(i, i + batchSize);
      const batchResults = await Promise.allSettled(batch.map(event => deleteCalendarEvent(event.id)));
      batch.forEach((event, idx) => {
        const res = batchResults[idx];
        if (res.status === 'fulfilled' && res.value) {
          results.push({
            eventId: event.id,
            summary: event.summary,
            start: event.start?.dateTime || event.start?.date,
            deleted: true
          });
        } else {
          errors.push({
            eventId: event.id,
            summary: event.summary,
            error: res.reason ? (res.reason.message || res.reason) : 'No se pudo eliminar'
          });
        }
      });
      // Esperar 3 segundos entre bloques si quedan más eventos
      if (i + batchSize < events.length) {
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
    }

    if (DEBUG_CONFIG.enableConsoleLogging) {
      console.log(`✅ Eliminación completada: ${results.length} éxitos, ${errors.length} errores`);
    }

    return {
      success: results.length > 0,
      deleted: results.length,
      errors: errors.length,
      results,
      errorDetails: errors,
      message: `Se eliminaron ${results.length} eventos del calendario${errors.length > 0 ? ` (${errors.length} errores)` : ''}`
    };
  } catch (error) {
    if (typeof window !== 'undefined' && window.toast) {
      window.toast.error('❌ Error en eliminación masiva: ' + (error.message || error));
    } else {
      console.error('❌ Error en eliminación masiva:', error);
    }
    throw new Error(`No se pudieron eliminar los eventos: ${error.message}`);
  }
};

/**
 * Eliminar eventos de Google Calendar basados en citas específicas
 * @param {Array} appointments - Array de citas a eliminar del calendario
 * @param {Object} patientData - Datos del paciente
 * @returns {Object} - Resultado de la operación
 */
export const deleteAppointmentCalendarEvents = async (appointments, patientData) => {
  try {
    if (!isAuthorized()) {
      throw new Error('Debes autenticarte con Google primero');
    }

    // ===== DEBUGGING: Revisar datos recibidos =====
    console.log('🗑️ [deleteAppointmentCalendarEvents] appointments:', appointments);
    console.log('🗑️ [deleteAppointmentCalendarEvents] patientData:', patientData);

    if (!appointments || appointments.length === 0) {
      return {
        success: true,
        deleted: 0,
        errors: 0,
        message: 'No hay citas para eliminar del calendario'
      };
    }

    const patientName = patientData 
      ? `${patientData.name || ''} ${patientData.last_name || ''}`.trim()
      : 'Paciente';

    if (DEBUG_CONFIG.enableConsoleLogging) {
      console.log(`🗑️ Eliminando ${appointments.length} eventos específicos de ${patientName}`);
    }

    // Buscar eventos del paciente
    const events = await findPatientEvents(patientData, appointments);
    
    // Filtrar eventos que coincidan con las fechas de las citas
    const appointmentDates = appointments.map(apt => new Date(apt.date).toISOString().split('T')[0]);
    const matchingEvents = events.filter(event => {
      const eventDate = new Date(event.start?.dateTime || event.start?.date).toISOString().split('T')[0];
      return appointmentDates.includes(eventDate);
    });

    if (matchingEvents.length === 0) {
      return {
        success: true,
        deleted: 0,
        errors: 0,
        message: `No se encontraron eventos en el calendario para las citas de ${patientName}`
      };
    }

    // Eliminar eventos matching
    const results = [];
    const errors = [];

    for (const event of matchingEvents) {
      try {
        const deleted = await deleteCalendarEvent(event.id);
        if (deleted) {
          results.push({
            eventId: event.id,
            summary: event.summary,
            start: event.start?.dateTime || event.start?.date,
            deleted: true
          });
        } else {
          errors.push({
            eventId: event.id,
            summary: event.summary,
            error: 'No se pudo eliminar'
          });
        }
        
        await new Promise(resolve => setTimeout(resolve, 200));
      } catch (error) {
        errors.push({
          eventId: event.id,
          summary: event.summary,
          error: error.message
        });
      }
    }

    return {
      success: results.length > 0,
      deleted: results.length,
      errors: errors.length,
      results,
      errorDetails: errors,
      message: `Se eliminaron ${results.length} eventos del calendario para ${patientName}`
    };
  } catch (error) {
    if (typeof window !== 'undefined' && window.toast) {
      window.toast.error('❌ Error eliminando eventos específicos: ' + (error.message || error));
    } else {
      console.error('❌ Error eliminando eventos específicos:', error);
    }
    throw new Error(`No se pudieron eliminar los eventos: ${error.message}`);
  }
};