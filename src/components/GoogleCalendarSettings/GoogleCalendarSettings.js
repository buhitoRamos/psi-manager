import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { GOOGLE_CALENDAR_CONFIG, validateConfig, DEBUG_CONFIG } from '../../config/appConfig.js';
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
      
      // Las credenciales se obtienen automáticamente desde appConfig.js
      await initializeGoogleAPI(GOOGLE_CALENDAR_CONFIG.apiKey, GOOGLE_CALENDAR_CONFIG.clientId);
      
      // Autorizar al usuario actual
      const profile = await authorizeGoogleCalendar();
      
      if (profile) {
        setIsConnected(true);
        setUserInfo(profile);
        toast.success('✅ Conectado exitosamente con Google Calendar');
      } else {
        throw new Error('No se pudo obtener el perfil del usuario');
      }
    } catch (error) {
      console.error('❌ Error connecting:', error);
      
      let errorMessage = error.message;
      
      if (error.message.includes('popup')) {
        errorMessage = 'Popup bloqueado. Permite popups para este sitio e intenta nuevamente.';
      } else if (error.message.includes('unauthorized_client')) {
        errorMessage = 'Client ID no autorizado. Verifica la configuración en Google Cloud Console.';
      } else if (error.message.includes('Timeout')) {
        errorMessage = 'La autorización tardó demasiado. Intenta nuevamente.';
      } else if (error.message.includes('redirect_uri_mismatch')) {
        errorMessage = 'URL no autorizada. Agrega http://localhost:8080 a Google Cloud Console.';
      }
      
      setError(errorMessage);
      toast.error('❌ ' + errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisconnect = () => {
    try {
      const { revokeAuthorization } = require('../../lib/googleCalendar');
      revokeAuthorization();
      setIsConnected(false);
      setUserInfo(null);
      toast.success('🔓 Desconectado exitosamente');
    } catch (error) {
      console.error('Error disconnecting:', error);
      toast.error('❌ Error al desconectar');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="google-calendar-modal-overlay" onClick={onClose}>
      <div className="google-calendar-modal" onClick={(e) => e.stopPropagation()}>
        <div className="google-calendar-header">
          <h3>📅 Google Calendar</h3>
          <button className="google-calendar-close" onClick={onClose}>×</button>
        </div>

        <div className="google-calendar-content">
          <div className="connection-status">
            {isConnected && userInfo ? (
              <div className="connected-status">
                <div className="status-icon connected">✓</div>
                <div className="status-info">
                  <h4>Conectado a Google Calendar</h4>
                  <p><strong>Email:</strong> {userInfo.email}</p>
                  <p><strong>Nombre:</strong> {userInfo.name}</p>
                </div>
                <button onClick={handleDisconnect} className="disconnect-btn">
                  🔌 Desconectar
                </button>
              </div>
            ) : (
              <div className="disconnected-status">
                <div className="status-icon disconnected">✗</div>
                <div className="status-info">
                  <h4>No conectado</h4>
                  <p>Conecta tu cuenta de Google para sincronizar turnos automáticamente</p>
                </div>
                <button 
                  onClick={handleConnect} 
                  disabled={isLoading}
                  className="connect-btn"
                >
                  {isLoading ? '🔄 Conectando...' : '🔗 Conectar con Google'}
                </button>
              </div>
            )}

            {error && (
              <div className="error-message">
                <span>❌ {error}</span>
              </div>
            )}
          </div>

          <div className="info-section">
            <h4>🚀 ¿Cómo funciona?</h4>
            <div className="how-it-works">
              <div className="step">
                <span className="step-number">1</span>
                <div className="step-content">
                  <strong>Conectar cuenta</strong>
                  <p>Autoriza tu cuenta de Google Calendar</p>
                </div>
              </div>
              
              <div className="step">
                <span className="step-number">2</span>
                <div className="step-content">
                  <strong>Crear turnos</strong>
                  <p>Los turnos se agregan automáticamente a tu calendar</p>
                </div>
              </div>
              
              <div className="step">
                <span className="step-number">3</span>
                <div className="step-content">
                  <strong>Sincronización automática</strong>
                  <p>Ve tus turnos en Google Calendar sin ventanas adicionales</p>
                </div>
              </div>
            </div>

            <div className="benefits">
              <h5>✨ Beneficios:</h5>
              <ul>
                <li>✅ Configuración automática - sin APIs complejas</li>
                <li>✅ Funciona con cualquier cuenta de Google</li>
                <li>✅ <strong>NO abre múltiples ventanas</strong> para turnos recurrentes</li>
                <li>✅ Sincronización automática en tiempo real</li>
                <li>✅ Los eventos aparecen en tu calendario personal</li>
                <li>✅ Puedes editarlos después en Google Calendar</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default GoogleCalendarSettings;