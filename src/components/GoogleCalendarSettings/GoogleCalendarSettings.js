import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { validateConfig, DEBUG_CONFIG } from '../../config/appConfig.js';
import Loading from '../Loading/Loading';
import './GoogleCalendarSettings.css';

function GoogleCalendarSettings({ isOpen, onClose }) {
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [userInfo, setUserInfo] = useState(null);
  const [error, setError] = useState('');
  const [tokenExpired, setTokenExpired] = useState(false);

  useEffect(() => {
    checkConnection();
    validateApiConfiguration();
  }, []);

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
                  disabled={isLoading}
                >
                  Volver a conectar Google Calendar
                </button>
              )}
              <button 
                className="disconnect-btn"
                onClick={handleDisconnect}
                disabled={isLoading}
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
        
        {isLoading && (
          <Loading 
            message="Configurando Google Calendar..." 
            overlay={true}
          />
        )}
      </div>
    </div>
  );
}

export default GoogleCalendarSettings;
