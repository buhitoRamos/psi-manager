import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import './AppointmentForm.css';

// Función auxiliar para obtener el nombre del día de la semana
function getDayOfWeekName(date) {
  const days = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  return days[date.getDay()];
}

// Función auxiliar para generar fechas recurrentes
function generateRecurringDates(startDate, frequency, maxAppointments = 52) {
  const dates = [];
  const originalDate = new Date(startDate);
  
  if (frequency === 'unica') {
    return [originalDate];
  }
  
  // Generar fechas hasta completar un año
  const oneYearLater = new Date(originalDate);
  oneYearLater.setFullYear(oneYearLater.getFullYear() + 1);
  
  let currentDate = new Date(originalDate);
  let count = 0;
  
  while (currentDate <= oneYearLater && count < maxAppointments) {
    dates.push(new Date(currentDate));
    count++;
    
    // Calcular la siguiente fecha según la frecuencia
    switch (frequency) {
      case 'semanal':
        // Cada semana, mismo día de la semana
        currentDate.setDate(currentDate.getDate() + 7);
        break;
      case 'quincenal':
        // Cada 2 semanas, mismo día de la semana (ej: si es miércoles, cada 2 miércoles)
        currentDate.setDate(currentDate.getDate() + 14);
        break;
      case 'mensual':
        // Para frecuencia mensual, mantener el mismo día del mes y misma hora
        const nextMonth = new Date(currentDate);
        nextMonth.setMonth(nextMonth.getMonth() + 1);
        
        // Si el día original no existe en el nuevo mes (ej: 31 de enero -> 28/29 de febrero)
        // usar el último día disponible del mes
        const originalDay = originalDate.getDate();
        const lastDayOfNextMonth = new Date(nextMonth.getFullYear(), nextMonth.getMonth() + 1, 0).getDate();
        
        if (originalDay > lastDayOfNextMonth) {
          nextMonth.setDate(lastDayOfNextMonth);
        } else {
          nextMonth.setDate(originalDay);
        }
        
        currentDate = nextMonth;
        break;
      default:
        return dates;
    }
  }
  
  return dates;
}

function AppointmentForm({ 
  isOpen, 
  onClose, 
  onSave, 
  patient, 
  existingAppointment = null, 
  isPaid = false, 
  onPaymentChange = null 
}) {
  const [formData, setFormData] = useState({
    patient_id: patient?.id || '',
    date: '',
    frequency: 'unica',
    observation: '',
    status: 'en_espera',
    amount: ''
  });

  const [loading, setLoading] = useState(false);
  const [localPaymentChecked, setLocalPaymentChecked] = useState(isPaid);
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    message: '',
    appointmentData: null,
    isRecurring: false
  });

  // Efecto para cargar los datos cuando se abre el modal o cambia existingAppointment
  useEffect(() => {
    if (isOpen) {
      if (existingAppointment) {
        // Modo edición: cargar datos existentes
        setFormData({
          patient_id: patient?.id || existingAppointment.patient_id,
          date: existingAppointment.date ? existingAppointment.date.substring(0, 16) : '',
          frequency: existingAppointment.frequency || 'unica',
          observation: existingAppointment.observation || '',
          status: existingAppointment.status || 'en_espera',
          amount: existingAppointment.amount || ''
        });
      } else {
        // Modo creación: limpiar formulario
        setFormData({
          patient_id: patient?.id || '',
          date: '',
          frequency: 'unica',
          observation: '',
          status: 'en_espera',
          amount: ''
        });
      }
    }
  }, [isOpen, existingAppointment, patient]);

  // Efecto para sincronizar el estado del pago
  useEffect(() => {
    setLocalPaymentChecked(isPaid);
  }, [isPaid]);

  const handleChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.date || !formData.amount) {
      toast.error('Por favor complete los campos obligatorios (fecha y honorarios)', {
        duration: 3000,
        icon: '⚠️'
      });
      return;
    }

    setLoading(true);
    try {
      // Si estamos editando un turno existente, solo actualizar ese turno
      if (existingAppointment) {
        const appointmentData = {
          ...formData,
          patient_id: patient.id,
          amount: parseFloat(formData.amount),
          date: new Date(formData.date).toISOString()
        };
        
        // Procesar el pago si el checkbox está marcado y no estaba pagado antes
        const shouldProcessPayment = localPaymentChecked && !isPaid && 
                                   (formData.status === 'finalizado' || formData.status === 'cancelado') &&
                                   formData.amount > 0;
        
        await onSave(appointmentData, shouldProcessPayment);
        onClose();
        return;
      }

      // Para turnos nuevos, verificar si es recurrente
      if (formData.frequency === 'unica') {
        // Crear solo un turno
        const appointmentData = {
          ...formData,
          patient_id: patient.id,
          amount: parseFloat(formData.amount),
          date: new Date(formData.date).toISOString()
        };
        await onSave(appointmentData);
      } else {
        // Crear turnos recurrentes usando el backend
        const startDate = new Date(formData.date);
        const previewDates = generateRecurringDates(startDate, formData.frequency);
        
        // Preparar mensaje de confirmación más detallado
        const dayName = getDayOfWeekName(startDate);
        let patternDescription = '';
        
        if (formData.frequency === 'semanal') {
          patternDescription = `todos los ${dayName}s`;
        } else if (formData.frequency === 'quincenal') {
          patternDescription = `cada 2 ${dayName}s (quincenal)`;
        } else if (formData.frequency === 'mensual') {
          const dayNumber = startDate.getDate();
          patternDescription = `el día ${dayNumber} de cada mes`;
        }
        
        const confirmMessage = `Se van a crear ${previewDates.length} turnos ${patternDescription} desde el ${startDate.toLocaleDateString('es-ES')} hasta el ${previewDates[previewDates.length - 1].toLocaleDateString('es-ES')}.`;
        
        // Preparar datos para la función de turnos recurrentes
        const appointmentData = {
          ...formData,
          patient_id: patient.id,
          amount: parseFloat(formData.amount),
          date: new Date(formData.date).toISOString()
        };

        // Mostrar modal de confirmación
        setConfirmModal({
          isOpen: true,
          message: confirmMessage,
          appointmentData,
          isRecurring: true
        });
        
        setLoading(false);
        return;
      }
      
      onClose();
    } catch (error) {
      console.error('Error saving appointment:', error);
      toast.error(`Error al guardar el turno: ${error.message || 'Error desconocido'}`, {
        duration: 4000,
        icon: '❌'
      });
    } finally {
      setLoading(false);
    }
  };

  // Función para confirmar la creación de turnos recurrentes
  const confirmRecurringAppointments = async () => {
    setConfirmModal({ isOpen: false, message: '', appointmentData: null, isRecurring: false });
    setLoading(true);
    
    try {
      await onSave(confirmModal.appointmentData, true); // true indica que es recurrente
      onClose();
    } catch (error) {
      console.error('Error saving recurring appointments:', error);
      toast.error(`Error al guardar los turnos: ${error.message || 'Error desconocido'}`, {
        duration: 4000,
        icon: '❌'
      });
    } finally {
      setLoading(false);
    }
  };

  // Función para cancelar la confirmación
  const cancelConfirmation = () => {
    setConfirmModal({ isOpen: false, message: '', appointmentData: null, isRecurring: false });
  };

  const handleCancel = () => {
    setFormData({
      patient_id: patient?.id || '',
      date: '',
      frequency: 'unica',
      observation: '',
      status: 'en_espera',
      amount: ''
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="appointment-form-overlay">
      <div className="appointment-form-modal">
        <div className="appointment-form-header">
          <h3>
            {existingAppointment ? 'Editar Turno' : 'Nuevo Turno'}
          </h3>
          <p className="patient-name">
            Paciente: {patient?.name} {patient?.last_name}
          </p>
          <button className="form-close-btn" onClick={handleCancel}>
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="appointment-form">
          <div className="form-grid">
            <div className="form-field">
              <label htmlFor="date">Fecha y Hora *</label>
              <input
                type="datetime-local"
                id="date"
                value={formData.date}
                onChange={(e) => handleChange('date', e.target.value)}
                className="form-input"
                required
              />
            </div>

            <div className="form-field">
              <label htmlFor="frequency">Frecuencia</label>
              <select
                id="frequency"
                value={formData.frequency}
                onChange={(e) => handleChange('frequency', e.target.value)}
                className="form-select"
              >
                <option value="unica">Única</option>
                <option value="semanal">Semanal</option>
                <option value="quincenal">Quincenal</option>
                <option value="mensual">Mensual</option>
              </select>
              
              {/* Vista previa de turnos recurrentes */}
              {formData.frequency !== 'unica' && formData.date && (
                <div className="recurring-preview">
                  <small className="recurring-info">
                    📅 Se crearán turnos {formData.frequency}es por 1 año
                    {(() => {
                      const startDate = new Date(formData.date);
                      const dates = generateRecurringDates(startDate, formData.frequency);
                      const dayName = startDate.toLocaleDateString('es-ES', { weekday: 'long' });
                      
                      let frequencyText = '';
                      if (formData.frequency === 'semanal') {
                        frequencyText = `todos los ${dayName}s`;
                      } else if (formData.frequency === 'quincenal') {
                        frequencyText = `cada 2 ${dayName}s`;
                      } else if (formData.frequency === 'mensual') {
                        const dayNumber = startDate.getDate();
                        frequencyText = `el día ${dayNumber} de cada mes`;
                      }
                      
                      return (
                        <span className="dates-count">
                          <br />
                          {frequencyText} ({dates.length} turnos total)
                        </span>
                      );
                    })()}
                  </small>
                </div>
              )}
            </div>

            <div className="form-field">
              <label htmlFor="amount">honorarios *</label>
              <input
                type="number"
                id="amount"
                min="0"
                step="0.01"
                value={formData.amount}
                onChange={(e) => handleChange('amount', e.target.value)}
                className="form-input"
                placeholder="20000"
                required
              />
            </div>

            <div className="form-field">
              <label htmlFor="status">Estado del Turno</label>
              <select
                id="status"
                value={formData.status}
                onChange={(e) => handleChange('status', e.target.value)}
                className="form-select"
                data-status={formData.status}
              >
                <option value="en_espera">📝 En Espera</option>
                <option value="finalizado">✅ Finalizado</option>
                <option value="cancelado">❌ Cancelado</option>
              </select>
            </div>
          </div>

          <div className="form-field observation-field">
            <label htmlFor="observation">Observaciones / Informe Psicológico</label>
            <textarea
              id="observation"
              value={formData.observation}
              onChange={(e) => handleChange('observation', e.target.value)}
              className="form-textarea"
              rows="8"
              placeholder="Escriba aquí las observaciones, notas de la sesión, o informe psicológico detallado..."
            />
          </div>

          {/* Sección de pago - solo para turnos existentes con estado finalizado/cancelado */}
          {existingAppointment && 
           (formData.status === 'finalizado' || formData.status === 'cancelado') && 
           formData.amount > 0 && 
           onPaymentChange && (
            <div className="payment-section">
              <div className="payment-header">
                <h3>💰 Pago de Sesión</h3>
                <span className="payment-amount">
                  ${parseFloat(formData.amount).toLocaleString('es-AR')}
                </span>
              </div>
              
              <div className="payment-checkbox-wrapper">
                <label className="payment-checkbox-container">
                  <input
                    type="checkbox"
                    checked={localPaymentChecked}
                    onChange={(e) => setLocalPaymentChecked(e.target.checked)}
                    disabled={isPaid} // No permitir cambiar si ya está pagado
                    className="payment-checkbox"
                  />
                  <span className="payment-checkbox-label">
                    {isPaid 
                      ? "✅ Sesión ya está pagada" 
                      : localPaymentChecked
                        ? "💳 Registrar pago al actualizar"
                        : "💳 Marcar para registrar pago"
                    }
                  </span>
                </label>
                
                {isPaid && (
                  <div className="payment-confirmed">
                    <small>✨ El pago de esta sesión ya fue registrado</small>
                  </div>
                )}
                
                {!isPaid && localPaymentChecked && (
                  <div className="payment-pending">
                    <small>⏳ El pago se registrará al hacer clic en "Actualizar"</small>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="form-actions">
            <button
              type="button"
              onClick={handleCancel}
              className="btn btn-cancel"
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="btn btn-save"
              disabled={loading}
            >
              {loading ? 'Guardando...' : (existingAppointment ? 'Actualizar' : 'Guardar')}
            </button>
          </div>
        </form>
      </div>

      {/* Modal de confirmación para turnos recurrentes */}
      {confirmModal.isOpen && (
        <div className="appointment-confirm-overlay">
          <div className="appointment-confirm-modal">
            <div className="appointment-confirm-header">
              <h3>🗓️ Confirmar Turnos Recurrentes</h3>
            </div>
            <div className="appointment-confirm-content">
              <p>{confirmModal.message}</p>
              <div className="appointment-confirm-question">
                <strong>¿Continuar con la creación de todos los turnos?</strong>
              </div>
            </div>
            <div className="appointment-confirm-actions">
              <button
                onClick={cancelConfirmation}
                className="btn btn-cancel"
                disabled={loading}
              >
                Cancelar
              </button>
              <button
                onClick={confirmRecurringAppointments}
                className="btn btn-save"
                disabled={loading}
              >
                {loading ? 'Creando...' : 'Crear Turnos'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AppointmentForm;