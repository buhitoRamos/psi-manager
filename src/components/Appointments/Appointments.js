import React, { useState, useEffect, useContext, useCallback } from 'react';
import toast from 'react-hot-toast';
import { AuthContext } from '../../App';
import { useAppointmentsUpdate } from '../../contexts/AppointmentsUpdateContext';
import supabaseRest from '../../lib/supabaseRest';
import ConfirmModal from '../ConfirmModal/ConfirmModal';
import AppointmentForm from '../AppointmentForm/AppointmentForm';
import './Appointments.css';

// Función para extraer el user_id del token
function extractUserIdFromToken(token) {
  if (!token) return null;
  
  const parts = token.split('-');
  if (parts.length >= 2 && parts[0] === 'user') {
    const userId = parseInt(parts[1], 10);
    return isNaN(userId) ? null : userId;
  }
  return null;
}

// Función para normalizar texto removiendo acentos/tildes
function normalizeText(text) {
  return text
    .toLowerCase()
    .normalize('NFD') // Descompone los caracteres con acentos
    .replace(/[\u0300-\u036f]/g, '') // Remueve las marcas diacríticas (acentos)
    .trim();
}

function Appointments() {
  const { isAuthenticated, token } = useContext(AuthContext);
  const appointmentsUpdate = useAppointmentsUpdate();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [userId, setUserId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectKey, setSelectKey] = useState(0); // Para resetear el select
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    appointment: null
  });
  const [bulkDeleteModal, setBulkDeleteModal] = useState({
    isOpen: false,
    patientId: null,
    patientName: ''
  });
  const [editingAppointment, setEditingAppointment] = useState({
    isOpen: false,
    appointment: null,
    patient: null
  });
  const [paidSessions, setPaidSessions] = useState(new Set()); // IDs de sesiones pagadas

  useEffect(() => {
    async function loadAppointments() {
      if (!isAuthenticated) {
        setError('No hay sesión activa');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      
      try {
        // Extraer el user_id del token
        const extractedUserId = extractUserIdFromToken(token);
        if (!extractedUserId) {
          throw new Error('No se pudo obtener el ID del usuario del token');
        }

        setUserId(extractedUserId);
        
        // Obtener todas las citas del usuario
        const appointmentsData = await supabaseRest.getAppointmentsByUserId(extractedUserId);
        console.debug('[Appointments] getAppointmentsByUserId result:', appointmentsData);
        
        setAppointments(appointmentsData || []);

        // Cargar los pagos para identificar qué sesiones están pagadas
        try {
          const payments = await supabaseRest.getPaymentsByUserId(extractedUserId);
          const paidSessionIds = new Set(
            payments
              .filter(payment => payment.appointment_id) // Solo pagos vinculados a turnos
              .map(payment => payment.appointment_id)
          );
          setPaidSessions(paidSessionIds);
        } catch (paymentError) {
          console.warn('Error al cargar pagos:', paymentError);
          // No es crítico si falla la carga de pagos
        }

      } catch (err) {
        console.error('Error loading appointments:', err);
        setError(err.message || 'Error al cargar los turnos');
      } finally {
        setLoading(false);
      }
    }

    loadAppointments();
  }, [isAuthenticated, token]);

  // Función para refrescar los datos manualmente
  const refreshAppointments = useCallback(async () => {
    if (!userId) {
      toast.error('No hay usuario autenticado');
      return;
    }
    
    // Usar una referencia funcional para evitar dependencias circulares
    setRefreshing(current => {
      if (current) return current; // Si ya está refrescando, no hacer nada
      return true;
    });
    
    const refreshPromise = async () => {
      try {
        console.debug('[Appointments] Refrescando datos...');
        const refreshedAppointments = await supabaseRest.getAppointmentsByUserId(userId);
        setAppointments(refreshedAppointments || []);
        
        // Recargar también los pagos
        try {
          const payments = await supabaseRest.getPaymentsByUserId(userId);
          const paidSessionIds = new Set(
            payments
              .filter(payment => payment.appointment_id)
              .map(payment => payment.appointment_id)
          );
          setPaidSessions(paidSessionIds);
        } catch (paymentError) {
          console.warn('Error al recargar pagos:', paymentError);
        }
        
        // Resetear el select del desplegable
        setSelectKey(prev => prev + 1);
        
        console.debug('[Appointments] Datos refrescados exitosamente:', refreshedAppointments);
        
        // Calcular estadísticas para mostrar en el toast
        const totalCount = refreshedAppointments ? refreshedAppointments.length : 0;
        const pendingCount = refreshedAppointments ? refreshedAppointments.filter(apt => apt.status === 'en_espera').length : 0;
        
        return { totalCount, pendingCount };
      } finally {
        setRefreshing(false);
      }
    };

    toast.promise(
      refreshPromise(),
      {
        loading: 'Actualizando datos...',
        success: (data) => `✅ ${data.totalCount} turnos cargados (${data.pendingCount} pendientes)`,
        error: (err) => `❌ Error al actualizar: ${err.message}`,
      },
      {
        style: { minWidth: '300px' },
        success: { duration: 3000, icon: '🔄' },
        error: { duration: 5000, icon: '💥' },
      }
    );
  }, [userId]); // Solo userId como dependencia

  // useEffect para debug - observar cambios en appointments
  useEffect(() => {
    console.debug('[Appointments] Estado appointments actualizado:', {
      count: appointments.length,
      pendingCount: appointments.filter(apt => apt.status === 'en_espera').length
    });
  }, [appointments]);

  // useEffect para escuchar actualizaciones desde otros componentes
  useEffect(() => {
    if (appointmentsUpdate.updateTrigger > 0 && userId) {
      console.debug('[Appointments] Trigger de actualización recibido desde otro componente:', appointmentsUpdate.updateTrigger);
      
      // Usar un timeout para evitar múltiples llamadas simultáneas
      const timeoutId = setTimeout(() => {
        refreshAppointments();
      }, 100);

      return () => clearTimeout(timeoutId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appointmentsUpdate.updateTrigger, userId]); // Intencionalmente omitimos refreshAppointments para evitar loops

  // Función para manejar el pago de una sesión
  const handleSessionPayment = async (appointment) => {


    if (!appointment.amount || appointment.amount <= 0) {
      toast.error('No hay un monto válido para registrar el pago');
      return;
    }

    try {
      // Crear el registro de pago
      const paymentData = {
        patient_id: appointment.patient_id,
        user_id: userId,
        amount: appointment.amount,
        payment_date: new Date().toISOString(),
        payment_method: 'sesion', // Método específico para pagos de sesión
        notes: `Pago de sesión - ${formatDate(appointment.date)} - ${appointment.patient_name} ${appointment.patient_last_name || ''}`,
        appointment_id: appointment.id // Relacionar el pago con el turno específico
      };

      const result = await supabaseRest.createPayment(paymentData);
      
      if (result) {
        toast.success(`💰 Pago de $${appointment.amount.toLocaleString('es-AR')} registrado para ${appointment.patient_name}`);
        
        // Actualizar el estado local inmediatamente
        setPaidSessions(prev => new Set([...prev, appointment.id]));
        
        // Refrescar la lista de turnos para mantener todo sincronizado
        refreshAppointments();
      }
    } catch (error) {
      console.error('Error al registrar el pago:', error);
      toast.error('Error al registrar el pago de la sesión');
    }
  };

  // Función para manejar la edición de una cita
  const handleEditAppointment = (appointment) => {
    setEditingAppointment({
      isOpen: true,
      appointment: appointment,
      patient: {
        id: appointment.patient_id,
        name: appointment.patient_name,
        last_name: appointment.patient_last_name
      },
      isPaid: paidSessions.has(appointment.id),
      onPaymentChange: (appointmentId) => handleSessionPayment(appointment)
    });
  };

  // Función para cerrar el modal de edición
  const handleCloseEdit = () => {
    setEditingAppointment({
      isOpen: false,
      appointment: null,
      patient: null
    });
  };

  // Función para guardar los cambios de la cita editada
  const handleSaveEdit = async (appointmentData, shouldProcessPayment = false) => {
    try {
      const updatedAppointment = await supabaseRest.updateAppointment(
        editingAppointment.appointment.id,
        appointmentData,
        userId
      );

      // Procesar el pago si fue solicitado
      if (shouldProcessPayment) {
        await handleSessionPayment(editingAppointment.appointment);
      }

      // Actualizar la lista de citas
      setAppointments(appointments.map(apt => 
        apt.id === editingAppointment.appointment.id 
          ? { ...apt, ...updatedAppointment, patient_name: apt.patient_name, patient_last_name: apt.patient_last_name }
          : apt
      ));

      const paymentMessage = shouldProcessPayment ? ' y pago registrado' : '';
      toast.success(`✅ Turno actualizado${paymentMessage} para ${editingAppointment.patient.name}`);
      handleCloseEdit();
    } catch (error) {
      console.error('Error updating appointment:', error);
      toast.error('Error al actualizar el turno');
      throw error;
    }
  };

  // Función para manejar la eliminación de una cita
  const handleDeleteAppointment = (appointment) => {
    setConfirmModal({
      isOpen: true,
      appointment: appointment
    });
  };

  // Función para confirmar la eliminación
  const confirmDeleteAppointment = async () => {
    const appointment = confirmModal.appointment;
    setConfirmModal({ isOpen: false, appointment: null });

    const deletePromise = async () => {
      try {
        await supabaseRest.deleteAppointment(appointment.id, userId);
        
        // Actualizar estado local inmediatamente
        const updatedAppointments = appointments.filter(apt => apt.id !== appointment.id);
        setAppointments(updatedAppointments);
        
        return appointment;
      } catch (error) {
        console.error('Error al eliminar turno:', error);
        throw error;
      }
    };

    toast.promise(
      deletePromise(),
      {
        loading: 'Eliminando turno...',
        success: (data) => `🗑️ Turno de ${data.patient_name} ${data.patient_last_name} eliminado`,
        error: (err) => `❌ Error al eliminar: ${err.message}`,
      },
      {
        style: { minWidth: '300px' },
        success: { duration: 3000, icon: '✅' },
        error: { duration: 5000, icon: '💥' },
      }
    );
  };

  // Función para eliminar todos los turnos pendientes de un paciente
  const handleBulkDeletePendingAppointments = (patientId, patientName) => {
    setBulkDeleteModal({
      isOpen: true,
      patientId,
      patientName
    });
  };

  // Función para confirmar la eliminación masiva de turnos pendientes
  const confirmBulkDeletePendingAppointments = async () => {
    const { patientId, patientName } = bulkDeleteModal;
    setBulkDeleteModal({ isOpen: false, patientId: null, patientName: '' });

    const deletePromise = async () => {
      try {
        const result = await supabaseRest.deletePendingAppointmentsByPatient(patientId, userId);
        
        // Filtrar los turnos eliminados del estado local inmediatamente
        const updatedAppointments = appointments.filter(apt => 
          !(apt.patient_id === parseInt(patientId, 10) && apt.status === 'en_espera')
        );
        setAppointments(updatedAppointments);
        
        // Resetear el select del desplegable
        setSelectKey(prev => prev + 1);
        
        // También podemos recargar todos los datos para asegurar sincronización
        setTimeout(async () => {
          try {
            const refreshedAppointments = await supabaseRest.getAppointmentsByUserId(userId);
            console.debug('[Appointments] Datos refrescados después de eliminación:', refreshedAppointments);
            setAppointments(refreshedAppointments);
            setSelectKey(prev => prev + 1); // Reset select nuevamente por si acaso
          } catch (refreshError) {
            console.warn('Error al refrescar datos:', refreshError);
          }
        }, 500); // Pequeño delay para permitir que la DB se actualice
        
        return result;
      } catch (error) {
        console.error('Error en eliminación masiva:', error);
        throw error;
      }
    };

    toast.promise(
      deletePromise(),
      {
        loading: 'Eliminando turnos pendientes...',
        success: (data) => `🗑️ ${data.deletedCount} turnos pendientes de ${patientName} eliminados`,
        error: (err) => `❌ Error al eliminar turnos: ${err.message}`,
      },
      {
        style: { minWidth: '350px' },
        success: { duration: 4000, icon: '✅' },
        error: { duration: 5000, icon: '💥' },
      }
    );
  };

  // Función para cancelar la eliminación
  const cancelDeleteAppointment = () => {
    setConfirmModal({ isOpen: false, appointment: null });
  };

  // Obtener pacientes únicos que tienen turnos pendientes
  const getPatientsWithPendingAppointments = () => {
    const patientsMap = new Map();
    
    appointments
      .filter(appointment => appointment.status === 'en_espera')
      .forEach(appointment => {
        const patientKey = appointment.patient_id;
        if (!patientsMap.has(patientKey)) {
          patientsMap.set(patientKey, {
            id: appointment.patient_id,
            name: `${appointment.patient_name || ''} ${appointment.patient_last_name || ''}`.trim(),
            pendingCount: 0
          });
        }
        patientsMap.get(patientKey).pendingCount++;
      });
    
    return Array.from(patientsMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  };

  // Filtrar turnos por nombre de paciente y estado (ignorando acentos)
  const filteredAppointments = appointments.filter(appointment => {
    const matchesSearch = !searchTerm || (() => {
      const searchNormalized = normalizeText(searchTerm);
      const patientName = normalizeText(appointment.patient_name || '');
      const patientLastName = normalizeText(appointment.patient_last_name || '');
      const fullPatientName = normalizeText(`${appointment.patient_name || ''} ${appointment.patient_last_name || ''}`.trim());
      const observation = normalizeText(appointment.observation || '');
      
      return patientName.includes(searchNormalized) ||
             patientLastName.includes(searchNormalized) ||
             fullPatientName.includes(searchNormalized) ||
             observation.includes(searchNormalized);
    })();
    
    const matchesStatus = filterStatus === 'all' || appointment.status === filterStatus;
    
    return matchesSearch && matchesStatus;
  }).sort((a, b) => {
    // Ordenar por fecha: los próximos turnos primero
    const dateA = new Date(a.date);
    const dateB = new Date(b.date);
    return dateA - dateB; // Orden ascendente (próximos primero)
  });

  // Formatear fecha
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'long', 
      year: 'numeric'
    });
  };

  // Formatear hora
  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Obtener emoji del estado
  const getStatusEmoji = (status) => {
    switch (status) {
      case 'en_espera': return '📝';
      case 'finalizado': return '✅';
      case 'cancelado': return '❌';
      default: return '📅';
    }
  };

  // Obtener color del estado
  const getStatusColor = (status) => {
    switch (status) {
      case 'en_espera': return '#ffd700';
      case 'finalizado': return '#28a745';
      case 'cancelado': return '#dc3545';
      default: return '#6c757d';
    }
  };

  // Obtener texto del estado
  const getStatusText = (status) => {
    switch (status) {
      case 'en_espera': return 'En Espera';
      case 'finalizado': return 'Finalizado';
      case 'cancelado': return 'Cancelado';
      default: return status;
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="appointments-container">
        <p className="appointments-error">Debes estar autenticado para ver los turnos.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="appointments-container">
        <div className="appointments-loading">
          <img src="/logo.svg" alt="Psi" className="loading" />
          <p>Cargando turnos...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="appointments-container">
        <div className="appointments-error">
          <h3>Error</h3>
          <p>{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="appointments-retry-btn"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="appointments-container">
      <div className="appointments-header">
        <h2>Turnos Programados</h2>
        <p className="appointments-user-info">Usuario ID: {userId}</p>
        
        {/* Controles de filtrado */}
        <div className="appointments-controls">
          <div className="appointments-search">
            <input
              type="text"
              placeholder="Buscar por nombre del paciente u observación..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="appointments-search-input"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="appointments-search-clear"
                title="Limpiar búsqueda"
              >
                ✕
              </button>
            )}
          </div>
          
          <div className="appointments-filter">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="appointments-filter-select"
            >
              <option value="all">Todos los estados</option>
              <option value="en_espera">📝 En Espera</option>
              <option value="finalizado">✅ Finalizados</option>
              <option value="cancelado">❌ Cancelados</option>
            </select>
          </div>
          
          <button
            onClick={refreshAppointments}
            className="appointments-refresh-btn"
            title="Refrescar datos"
            disabled={refreshing}
          >
            {refreshing ? '🔄' : '🔄'} {refreshing ? 'Actualizando...' : 'Actualizar'}
          </button>
        </div>

        {/* Sección de eliminación masiva de turnos pendientes */}
        {getPatientsWithPendingAppointments().length > 0 && (
          <div className="appointments-bulk-delete">
            <div className="bulk-delete-header">
              <h3>🗑️ Eliminar Turnos Pendientes</h3>
              <div className="bulk-delete-selector">
                <select
                  key={selectKey} // Esto resetea el select cuando cambien los datos
                  value=""
                  onChange={(e) => {
                    if (e.target.value) {
                      const [patientId, patientName] = e.target.value.split('|');
                      handleBulkDeletePendingAppointments(patientId, patientName);
                      e.target.value = ""; // Reset select
                    }
                  }}
                  className="bulk-delete-select"
                >
                  <option value="">Seleccionar paciente para eliminar turnos pendientes...</option>
                  {getPatientsWithPendingAppointments().map(patient => (
                    <option 
                      key={patient.id} 
                      value={`${patient.id}|${patient.name}`}
                    >
                      {patient.name} ({patient.pendingCount} turno{patient.pendingCount !== 1 ? 's' : ''} pendiente{patient.pendingCount !== 1 ? 's' : ''})
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <p className="bulk-delete-description">
              💡 Solo se eliminarán turnos en estado "En Espera". Los turnos finalizados o cancelados no se verán afectados.
            </p>
          </div>
        )}
        
        <p className="appointments-count">
          {appointments.length === 0 
            ? 'No hay turnos registrados' 
            : searchTerm || filterStatus !== 'all'
              ? `${filteredAppointments.length} de ${appointments.length} turno${appointments.length !== 1 ? 's' : ''}`
              : `${appointments.length} turno${appointments.length !== 1 ? 's' : ''} encontrado${appointments.length !== 1 ? 's' : ''}`
          }
        </p>
      </div>

      {appointments.length > 0 ? (
        <div className="appointments-list">
          {filteredAppointments.length > 0 ? (
            filteredAppointments.map((appointment) => (
              <div key={appointment.id} className="appointment-card">
                <div className="appointment-header">
                  <div className="appointment-patient">
                    <h3 className="appointment-patient-name">
                      {appointment.patient_name} {appointment.patient_last_name}
                    </h3>
                  </div>
                  <div 
                    className="appointment-status"
                    style={{ backgroundColor: getStatusColor(appointment.status) }}
                  >
                    {getStatusEmoji(appointment.status)} {getStatusText(appointment.status)}
                  </div>
                </div>
                
                <div className="appointment-details">
                  <div className="appointment-datetime">
                    <div className="appointment-date">
                      📅 {formatDate(appointment.date)}
                    </div>
                    <div className="appointment-time">
                      🕐 {formatTime(appointment.date)}
                    </div>
                  </div>
                  
                  <div className="appointment-info">
                    <div className="appointment-frequency">
                      🔄 {appointment.frequency === 'unica' ? 'Única' : appointment.frequency}
                    </div>
                    {appointment.amount > 0 && (
                      <div className="appointment-amount">
                        💰 ${appointment.amount.toLocaleString('es-AR')}
                      </div>
                    )}
                  </div>
                </div>
                
                {appointment.observation && (
                  <div className="appointment-observation">
                    <h4>Observaciones:</h4>
                    <p>{appointment.observation}</p>
                  </div>
                )}
                
                <div className="appointment-actions">
                  <button
                    className="appointment-edit-btn"
                    onClick={() => handleEditAppointment(appointment)}
                    title="Editar turno"
                  >
                    ✏️ Editar
                  </button>
                  <button
                    className="appointment-delete-btn"
                    onClick={() => handleDeleteAppointment(appointment)}
                    title="Eliminar turno"
                  >
                    🗑️ Eliminar
                  </button>
                </div>
                
                <div className="appointment-meta">
                  <small>Creado: {formatDate(appointment.created_at)}</small>
                  {appointment.updated_at !== appointment.created_at && (
                    <small>Actualizado: {formatDate(appointment.updated_at)}</small>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="appointments-empty">
              <p>
                {searchTerm || filterStatus !== 'all' 
                  ? 'No se encontraron turnos con los filtros aplicados'
                  : 'No se encontraron turnos'
                }
              </p>
              {(searchTerm || filterStatus !== 'all') && (
                <button 
                  onClick={() => { setSearchTerm(''); setFilterStatus('all'); }} 
                  className="appointments-clear-filters-btn"
                >
                  Limpiar filtros
                </button>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="appointments-empty">
          <div className="appointments-empty-content">
            <img src="/logo.svg" alt="Psi" className="appointments-empty-icon" />
            <h3>No hay turnos programados</h3>
            <p>Los turnos que se creen desde la lista de pacientes aparecerán aquí.</p>
          </div>
        </div>
      )}

      {/* Modal de confirmación para eliminar */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={cancelDeleteAppointment}
        onConfirm={confirmDeleteAppointment}
        title="Eliminar Turno"
        message={`¿Estás seguro de que quieres eliminar el turno de ${confirmModal.appointment?.patient_name || ''} ${confirmModal.appointment?.patient_last_name || ''}? Esta acción no se puede deshacer.`}
        confirmText="Eliminar"
        cancelText="Cancelar"
        type="danger"
      />

      {/* Modal de confirmación para eliminación masiva */}
      <ConfirmModal
        isOpen={bulkDeleteModal.isOpen}
        onClose={() => setBulkDeleteModal({ isOpen: false, patientId: null, patientName: '' })}
        onConfirm={confirmBulkDeletePendingAppointments}
        title="Eliminar Todos los Turnos Pendientes"
        message={`¿Estás seguro de que quieres eliminar TODOS los turnos pendientes de ${bulkDeleteModal.patientName}? 

Solo se eliminarán los turnos en estado "En Espera". Los turnos finalizados o cancelados no se verán afectados.

Esta acción no se puede deshacer.`}
        confirmText="Eliminar Todos los Pendientes"
        cancelText="Cancelar"
        type="danger"
      />

      {/* Modal del formulario de edición */}
      <AppointmentForm
        isOpen={editingAppointment.isOpen}
        onClose={handleCloseEdit}
        onSave={handleSaveEdit}
        patient={editingAppointment.patient}
        existingAppointment={editingAppointment.appointment}
        isPaid={editingAppointment.isPaid}
        onPaymentChange={editingAppointment.onPaymentChange}
      />
    </div>
  );
}

export default Appointments;