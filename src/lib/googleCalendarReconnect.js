// googleCalendarReconnect.js
// Utilidad centralizada para reconectar Google Calendar si la API no está lista o el token está vencido

import { initializeGoogleAPI, authorizeGoogleCalendar, isGoogleApiReady, isAuthorized } from './googleCalendar';

/**
 * Intenta reconectar Google Calendar si la API no está lista o el token está vencido.
 * Muestra toasts y retorna true si la reconexión fue exitosa.
 * @returns {Promise<boolean>} true si reconectó, false si no
 */
export async function reconnectGoogleCalendar({ showToast = true } = {}) {
  try {
    if (!isGoogleApiReady() || !isAuthorized()) {
      if (showToast && window.toast) window.toast('Reconectando Google Calendar...');
      await initializeGoogleAPI();
      const result = await authorizeGoogleCalendar();
      if (result.success) {
        if (showToast && window.toast) window.toast('Google Calendar reconectado');
        return true;
      } else {
        if (showToast && window.toast) window.toast.error(result.error || 'No se pudo reconectar Google Calendar');
        return false;
      }
    }
    // Ya está listo y autorizado
    return true;
  } catch (error) {
    if (showToast && window.toast) window.toast.error('Error al reconectar Google Calendar: ' + (error.message || error));
    return false;
  }
}
