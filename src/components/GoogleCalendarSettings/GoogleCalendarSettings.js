import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { GOOGLE_CALENDAR_CONFIG, validateConfig, DEBUG_CONFIG } from '../../config/appConfig.js';
import Loading from '../Loading/Loading';
import './GoogleCalendarSettings.css';

function GoogleCalendarSettings({ isOpen, onClose }) {
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [userInfo, setUserInfo] = useState(null);
  const [error, setError] = useState('');

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
        setIsConnected(true);
        const user = getCurrentUser();
        setUserInfo(user);
      } else {
        setIsConnected(false);
        setUserInfo(null);
      }
    } catch (error) {
      console.error('Error checking connection:', error);
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
          console.log('⚠️ Autorización no exitosa:', result.error);
        }
      }
    } catch (error) {
      const errorMessage = error.message || 'Error al conectar con Google Calendar';
      setError(errorMessage);
      toast.error(errorMessage);
      
      if (DEBUG_CONFIG.enableConsoleLogging) {
        console.error('❌ Error en conexión:', error);
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
            className="close-button" 
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
              <div className="connection-status connected">
                <i className="fas fa-check-circle"></i>
                <span>Conectado a Google Calendar</span>
              </div>
              
              {userInfo && (
                <div className="user-info">
                  <div className="user-detail">
                    <strong>Email:</strong> {userInfo.email}
                  </div>
                  {userInfo.name && (
                    <div className="user-detail">
                      <strong>Nombre:</strong> {userInfo.name}
                    </div>
                  )}
                </div>
              )}

              <button 
                className="disconnect-button"
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
                className="connect-button"
                onClick={handleConnect}
                disabled={isLoading}
              >
                Conectar Google Calendar
              </button>
            </div>
          )}

          <div className="configuration-info">
            <h3>Información de Configuración:</h3>
            <div className="config-details">
              <div className="config-item">
                <strong>Cliente ID:</strong> 
                <span className="config-value">
                  {GOOGLE_CALENDAR_CONFIG.CLIENT_ID ? 
                    `${GOOGLE_CALENDAR_CONFIG.CLIENT_ID.substring(0, 20)}...` : 
                    'No configurado'
                  }
                </span>
              </div>
              <div className="config-item">
                <strong>API Key:</strong>
                <span className="config-value">
                  {GOOGLE_CALENDAR_CONFIG.API_KEY ? 
                    `${GOOGLE_CALENDAR_CONFIG.API_KEY.substring(0, 20)}...` : 
                    'No configurado'
                  }
                </span>
              </div>
            </div>
          </div>
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
