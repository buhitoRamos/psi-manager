import supabaseRest from '../../lib/supabaseRest';
import { processInBatches } from '../../lib/googleCalendar';
import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { validateConfig, DEBUG_CONFIG } from '../../config/appConfig.js';
import Loading from '../Loading/Loading';
import './GoogleCalendarSettings.css';

function GoogleCalendarSettings({ isOpen, onClose }) {
  // Estado para mostrar el modal de confirmación de borrado masivo
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  // Estado para saber si la API de Google Calendar está lista
  const [isApiReady, setIsApiReady] = useState(false);
  // Estado para mostrar el modal de reconexión
  const [showReconnectModal, setShowReconnectModal] = useState(false);
  // Acción pendiente ("delete" o "sync")
  const [pendingAction, setPendingAction] = useState(null);
    // Estado para loading de acciones especiales
  const [actionLoading, setActionLoading] = useState(false);
  const [isPreviousClear, setPreviousClear] = useState(true);
    // Eliminar todos los eventos del calendario
    // Borrar eventos en lotes de 10 para evitar rate limit
    const handleDeleteAllCalendarEvents = async () => {
      setActionLoading(true);
      setPreviousClear(false);
      try {
        const { isAuthorized, deleteCalendarEvent } = await import('../../lib/googleCalendar');
        if (!isAuthorized()) throw new Error('Debes conectar Google Calendar primero.');
        if (!window.gapi || !window.gapi.client || !window.gapi.client.calendar) throw new Error('La API de Google Calendar no está lista.');
        // Buscar todos los eventos cuyo summary comience con 'Sesión'
        let allEvents = [];
        let pageToken = undefined;
        do {
          const response = await window.gapi.client.calendar.events.list({
            calendarId: 'primary',
            q: 'Sesión',
            singleEvents: true,
            orderBy: 'startTime',
            maxResults: 2500,
            pageToken
          });
          const events = (response.result && response.result.items) ? response.result.items : [];
          allEvents = allEvents.concat(events.filter(e => e.summary && e.summary.startsWith('Sesión')));
          pageToken = response.result.nextPageToken;
        } while (pageToken);

        // Borrar en lotes usando utilitario
        const results = await processInBatches(
          allEvents,
          (event) => deleteCalendarEvent(event.id),
          10, 3000
        );
        const deleted = results.filter(r => r.status === 'fulfilled' && r.value).length;
        const errorResults = results.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value));
        const errors = errorResults.length;
        let errorMsg = '';
        if (errors && errorResults[0]) {
          if (errorResults[0].status === 'rejected') {
            errorMsg = errorResults[0].reason?.message || errorResults[0].reason || '';
          } else {
            errorMsg = 'No se pudo eliminar uno o más eventos.';
          }
        }
        toast.success(`Se eliminaron ${deleted} eventos.${errors ? ' Errores: ' + errors : ''}${errorMsg ? ' Ejemplo: ' + errorMsg : ''}`);
      } catch (err) {
        toast.error('Error al eliminar eventos: ' + (err.message || err));
      } finally {
        setActionLoading(false);
        setShowDeleteConfirm(false);
      }
    };

    // Sincronizar todos los turnos de la app con Google Calendar
    // Sincronizar turnos en bloques de 10 con espera de 3 segundos entre bloques
    const handleSyncAllAppointments = async () => {
      setActionLoading(true);
      try {
        const { isAuthorized, createCalendarEvent } = await import('../../lib/googleCalendar');
        if (!isAuthorized()) throw new Error('Debes conectar Google Calendar primero.');
        // Obtener todos los turnos del usuario desde la API
        const token = localStorage.getItem('token');
        const userId = token && token.split('-')[1];
        if (!userId) throw new Error('No se pudo obtener el usuario.');
        const appointments = await supabaseRest.getAppointmentsByUserId(userId);
        // Crear en lotes usando utilitario
        const results = await processInBatches(
          appointments,
          (apt) => createCalendarEvent(apt, { name: apt.patient_name, last_name: apt.patient_last_name }),
          10, 3000
        );
        const created = results.filter(r => r.status === 'fulfilled').length;
        const errorResults = results.filter(r => r.status === 'rejected');
        const errors = errorResults.length;
        let errorMsg = '';
        if (errors && errorResults[0]) {
          errorMsg = errorResults[0].reason?.message || errorResults[0].reason || '';
        }
        toast.success(`Sincronización completa: ${created} turnos añadidos.${errors ? ' Errores: ' + errors : ''}${errorMsg ? ' Ejemplo: ' + errorMsg : ''}`);
      } catch (err) {
        toast.error('Error al sincronizar: ' + (err.message || err));
      } finally {
        setActionLoading(false);
        setPreviousClear(true);
      }
    };
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [userInfo, setUserInfo] = useState(null);
  const [error, setError] = useState('');
  const [tokenExpired, setTokenExpired] = useState(false);


  useEffect(() => {
    checkConnection();
    validateApiConfiguration();
    // Verificar si la API de Google Calendar está lista
    const checkApiReady = () => {
      setIsApiReady(!!(window.gapi && window.gapi.client && window.gapi.client.calendar));
    };
    checkApiReady();
    // Escuchar cambios en gapi
    const interval = setInterval(checkApiReady, 1000);
    return () => clearInterval(interval);
  }, [isPreviousClear]);

  const validateApiConfiguration = () => {
    const configValidation = validateConfig();
    if (!configValidation.isValid && DEBUG_CONFIG.enableConsoleLogging) {
      console.warn('⚠️ Problemas de configuración:', configValidation.issues);
    }
  };

    const checkConnection = async () => {
    setIsLoading(true);
    try {
      const { isAuthorized, getCurrentUser } = await import('../../lib/googleCalendar');
      if (isAuthorized()) {
        const user = getCurrentUser();
        setIsConnected(true);
        setUserInfo(user);
        // Verificar expiración del token
        let expired = false;
        if (window.gapi && window.gapi.auth2) {
          const authInstance = window.gapi.auth2.getAuthInstance();
          const gUser = authInstance && authInstance.currentUser && authInstance.currentUser.get();
          if (gUser && gUser.getAuthResponse().expires_at < Date.now() / 1000) {
            expired = true;
          }
        }
        setTokenExpired(expired);
        if (expired) {
          setError('La sesión de Google Calendar ha expirado. Por favor, vuelve a conectar.');
        }
        if (DEBUG_CONFIG.enableConsoleLogging) {
          console.log('🔄 Sesión de Google Calendar detectada:', user, expired ? 'TOKEN EXPIRADO' : '');
        }
      } else {
        setIsConnected(false);
        setUserInfo(null);
        setTokenExpired(false);
      }
    } catch (error) {
      console.error('Error checking connection:', error);
      setIsConnected(false);
      setUserInfo(null);
      setTokenExpired(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnect = async () => {
    if (DEBUG_CONFIG.enableConsoleLogging) {
      console.log('🔄 Iniciando conexión con Google Calendar...');
    }
    
    setIsLoading(true);
    setError('');
    
    try {
      const { initializeGoogleAPI, authorizeGoogleCalendar } = await import('../../lib/googleCalendar');
      
      const isInitialized = await initializeGoogleAPI();
      if (!isInitialized) {
        throw new Error('No se pudo inicializar la API de Google');
      }

      const result = await authorizeGoogleCalendar();
      
      if (result.success) {
        setIsConnected(true);
        setUserInfo(result.userInfo);
        toast.success('¡Conectado a Google Calendar exitosamente!');
        
        if (DEBUG_CONFIG.enableConsoleLogging) {
          console.log('✅ Conexión exitosa:', result.userInfo);
        }
      } else {
        // Error de autorización, pero no mostrar toast si el usuario canceló
        const errorMessage = result.error || 'Error en la autorización';
        setError(errorMessage);
        
        // Solo mostrar toast si no fue cancelado por el usuario
        if (!errorMessage.includes('cerrada') && !errorMessage.includes('closed')) {
          toast.error(errorMessage);
        }
        
        if (DEBUG_CONFIG.enableConsoleLogging) {
          toast.success('⚠️ Autorización no exitosa:', result.error);
        }
      }
    } catch (error) {
      const errorMessage = error.message || 'Error al conectar con Google Calendar';
      setError(errorMessage);
      toast.error(errorMessage);
      
      if (DEBUG_CONFIG.enableConsoleLogging) {
        toast.error('❌ Error en conexión:', error);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisconnect = async () => {
    setIsLoading(true);
    try {
      const { disconnectGoogleCalendar } = await import('../../lib/googleCalendar');
      await disconnectGoogleCalendar();
      
      setIsConnected(false);
      setUserInfo(null);
      toast.success('Desconectado de Google Calendar');
      
      if (DEBUG_CONFIG.enableConsoleLogging) {
        console.log('🔌 Desconectado de Google Calendar');
      }
    } catch (error) {
      const errorMessage = 'Error al desconectar de Google Calendar';
      setError(errorMessage);
      toast.error(errorMessage);
      console.error('Error disconnecting:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="google-calendar-modal-overlay">
      <div className="google-calendar-modal">
        <div className="google-calendar-header">
          <h2>Google Calendar Settings</h2>
          <button 
            className="google-calendar-close" 
            onClick={onClose}
            disabled={isLoading}
          >
            ×
          </button>
        </div>

        <div className="google-calendar-content">
          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          {isConnected ? (
            <div className="connected-section">
              <div className={`connection-status connected${tokenExpired ? ' expired' : ''}`}>
                <i className="fas fa-check-circle"></i>
                <span>
                  {tokenExpired ? 'Sesión expirada de Google Calendar' : 'Conectado a Google Calendar'}
                </span>
              </div>
              {tokenExpired && (
                <button 
                  className="connect-btn"
                  onClick={handleConnect}
                  disabled={isLoading || actionLoading}
                >
                  Volver a conectar Google Calendar
                </button>
              )}
              <button
                className="danger-btn"
                onClick={() => {
                  if (!isApiReady || !isConnected) {
                    setPendingAction('delete');
                    setShowReconnectModal(true);
                  } else {
                    setShowDeleteConfirm(true);
                  }
                }}
                disabled={isLoading || actionLoading}
                style={{ marginTop: 16 }}
              >
                🗑️ Eliminar TODOS los turnos del calendario
              </button>
              <button
                className="sync-btn"
                onClick={() => {
                  if (!isApiReady || !isConnected) {
                    setPendingAction('sync');
                    setShowReconnectModal(true);
                    setPreviousClear(true);
                  } else {
                    handleSyncAllAppointments();
                  }
                }}
                disabled={isLoading || actionLoading || isPreviousClear}
                style={{ marginTop: 10 }}
              >
                🔄 Sincronizar turnos de la app con Google Calendar
              </button>
              <button 
                className="disconnect-btn"
                onClick={handleDisconnect}
                disabled={isLoading || actionLoading}
              >
                Desconectar Google Calendar
              </button>
            </div>
          ) : (
            <div className="disconnected-section">
              <div className="connection-status disconnected">
                <i className="fas fa-times-circle"></i>
                <span>No conectado a Google Calendar</span>
              </div>

              <button 
                className="connect-btn"
                onClick={handleConnect}
                disabled={isLoading}
              >
                Conectar Google Calendar
              </button>
            </div>
          )}
        </div>
        
        {(isLoading || actionLoading) && (
          <Loading 
            message={actionLoading ? 'Procesando...' : 'Configurando Google Calendar...'} 
            overlay={true}
          />
        )}

        {/* Modal de confirmación para eliminar todos los eventos */}
        {showDeleteConfirm && (
          <div className="google-calendar-modal-overlay confirm-overlay">
            <div className="google-calendar-modal confirm-modal">
              <h3>¿Eliminar TODOS los eventos?</h3>
              <p style={{ margin: '16px 0' }}>
                ¿Seguro que quieres eliminar <b>TODOS</b> los eventos de Google Calendar que comiencen con <b>"Sesión"</b>?<br/>
                <span style={{ color: 'red' }}>Esta acción no se puede deshacer.</span>
              </p>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                <button
                  className="cancel-btn"
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={actionLoading}
                >
                  Cancelar
                </button>
                <button
                  className="danger-btn"
                  onClick={handleDeleteAllCalendarEvents}
                  disabled={actionLoading}
                >
                  Sí, eliminar todo
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal de reconexión si la API no está lista o no hay conexión */}
        {showReconnectModal && (
          <div className="google-calendar-modal-overlay confirm-overlay">
            <div className="google-calendar-modal confirm-modal">
              <h3>Google Calendar no está disponible</h3>
              <p style={{ margin: '16px 0' }}>
                {(!isApiReady)
                  ? 'La API de Google Calendar no está lista. ¿Quieres intentar reconectar?'
                  : 'Debes conectar Google Calendar para realizar esta acción.'}
              </p>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                <button
                  className="cancel-btn"
                  onClick={() => { setShowReconnectModal(false); setPendingAction(null); }}
                  disabled={actionLoading}
                >
                  Cancelar
                </button>
                <button
                  className="connect-btn"
                  onClick={async () => {
                    setShowReconnectModal(false);
                    await handleConnect();
                    // Si la acción pendiente era delete y ahora está todo ok, mostrar confirmación
                    setTimeout(() => {
                      if (pendingAction === 'delete' && isApiReady && isConnected) setShowDeleteConfirm(true);
                      if (pendingAction === 'sync' && isApiReady && isConnected) handleSyncAllAppointments();
                      setPendingAction(null);
                    }, 500);
                  }}
                  disabled={actionLoading}
                >
                  Reconectar Google Calendar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default GoogleCalendarSettings;
