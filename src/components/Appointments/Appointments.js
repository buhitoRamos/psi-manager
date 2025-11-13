import React, { useState, useEffect, useContext } from 'react';
import toast from 'react-hot-toast';
import { AuthContext } from '../../App';
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

function Appointments() {
  const { isAuthenticated, token } = useContext(AuthContext);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userId, setUserId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    appointment: null
  });
  const [editingAppointment, setEditingAppointment] = useState({
    isOpen: false,
    appointment: null,
    patient: null
  });

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

      } catch (err) {
        console.error('Error loading appointments:', err);
        setError(err.message || 'Error al cargar los turnos');
      } finally {
        setLoading(false);
      }
    }

    loadAppointments();
  }, [isAuthenticated, token]);

  // Función para manejar la edición de una cita
  const handleEditAppointment = (appointment) => {
    setEditingAppointment({
      isOpen: true,
      appointment: appointment,
      patient: {
        id: appointment.patient_id,
        name: appointment.patient_name,
        last_name: appointment.patient_last_name
      }
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
  const handleSaveEdit = async (appointmentData) => {
    try {
      const updatedAppointment = await supabaseRest.updateAppointment(
        editingAppointment.appointment.id,
        appointmentData,
        userId
      );

      // Actualizar la lista de citas
      setAppointments(appointments.map(apt => 
        apt.id === editingAppointment.appointment.id 
          ? { ...apt, ...updatedAppointment, patient_name: apt.patient_name, patient_last_name: apt.patient_last_name }
          : apt
      ));

      toast.success(`✅ Turno actualizado para ${editingAppointment.patient.name}`);
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
      await supabaseRest.deleteAppointment(appointment.id, userId);
      setAppointments(appointments.filter(apt => apt.id !== appointment.id));
      return appointment;
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

  // Función para cancelar la eliminación
  const cancelDeleteAppointment = () => {
    setConfirmModal({ isOpen: false, appointment: null });
  };

  // Filtrar turnos por nombre de paciente y estado
  const filteredAppointments = appointments.filter(appointment => {
    const matchesSearch = !searchTerm || 
      (appointment.patient_name && appointment.patient_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (appointment.patient_last_name && appointment.patient_last_name.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = filterStatus === 'all' || appointment.status === filterStatus;
    
    return matchesSearch && matchesStatus;
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
              placeholder="Buscar por nombre del paciente..."
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
        </div>
        
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

      {/* Modal del formulario de edición */}
      <AppointmentForm
        isOpen={editingAppointment.isOpen}
        onClose={handleCloseEdit}
        onSave={handleSaveEdit}
        patient={editingAppointment.patient}
        existingAppointment={editingAppointment.appointment}
      />
    </div>
  );
}

export default Appointments;