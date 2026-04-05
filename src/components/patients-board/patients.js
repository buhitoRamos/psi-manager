import React, { useState, useEffect, useContext } from 'react';
import toast from 'react-hot-toast';
import { AuthContext } from '../../App';
import { useAppointmentsUpdate } from '../../contexts/AppointmentsUpdateContext';
import supabaseRest from '../../lib/supabaseRest';
import { createCalendarEvent, createRecurringCalendarEvents, isAuthorized } from '../../lib/googleCalendar';
import { reconnectGoogleCalendar } from '../../lib/googleCalendarReconnect';
import ConfirmModal from '../ConfirmModal/ConfirmModal';
import AppointmentForm from '../AppointmentForm/AppointmentForm';
import GoogleCalendarSettings from '../GoogleCalendarSettings/GoogleCalendarSettings';
import Loading from '../Loading/Loading';
import './patients.css';

// Función para extraer el user_id del token
function extractUserIdFromToken(token) {
  if (!token) return null;

  // El token tiene formato: "user-{user_id}-{timestamp}"
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

// Función para formatear dinero
function formatCurrency(amount) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0
  }).format(amount);
}

// Función para formatear fecha de próxima cita
function formatNextAppointmentDate(dateString) {
  if (!dateString) return 'Sin turnos programados';

  try {
    const appointmentDate = new Date(dateString);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
    const appointmentDay = new Date(appointmentDate.getFullYear(), appointmentDate.getMonth(), appointmentDate.getDate());

    // Determinar si es hoy, mañana o una fecha específica
    let datePrefix = '';
    if (appointmentDay.getTime() === today.getTime()) {
      datePrefix = 'Hoy';
    } else if (appointmentDay.getTime() === tomorrow.getTime()) {
      datePrefix = 'Mañana';
    } else {
      // Formatear fecha normal
      datePrefix = appointmentDate.toLocaleDateString('es-ES', {
        day: 'numeric',
        month: 'short'
      });
    }

    // Formatear hora
    const timeString = appointmentDate.toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });

    return `${datePrefix} ${timeString}`;
  } catch (error) {
    return 'Fecha inválida';
  }
}

function Patients() {
  const { isAuthenticated, token } = useContext(AuthContext);
  const { onRecurringAppointmentsCreated, triggerUpdate } = useAppointmentsUpdate();
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState('Cargando pacientes...');
  const [calendarLoading, setCalendarLoading] = useState(false);
  const [appointmentLoading, setAppointmentLoading] = useState(false);
  const [error, setError] = useState(null);
  const [userId, setUserId] = useState(null);
  const [expandedPatient, setExpandedPatient] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingPatient, setEditingPatient] = useState(null);
  const [editForm, setEditForm] = useState({
    name: '',
    last_name: '',
    tel: '',
    email: '',
    dir: '',
    age: '',
    health_insurance: '',
    reason: ''
  });
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    patient: null
  });
  const [recurringConfirmModal, setRecurringConfirmModal] = useState({
    isOpen: false,
    appointmentData: null,
    appointmentWithUserId: null,
    patientName: null,
    patientData: null  // Agregar datos completos del paciente
  });
  const [appointmentForm, setAppointmentForm] = useState({
    isOpen: false,
    patient: null
  });
  const [showGoogleCalendarSettings, setShowGoogleCalendarSettings] = useState(false);

  useEffect(() => {
    async function loadPatients() {
      if (!isAuthenticated) {
        setError('No hay sesión activa');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      setLoadingMessage('Inicializando...');

      try {
        // Obtener el token del localStorage
        setLoadingMessage('Verificando autenticación...');
        const token = localStorage.getItem('token');
        if (!token) {
          throw new Error('No se encontró el token de autenticación');
        }

        // Extraer el user_id del token
        setLoadingMessage('Obteniendo información del usuario...');
        const extractedUserId = extractUserIdFromToken(token);
        if (!extractedUserId) {
          throw new Error('No se pudo obtener el ID del usuario del token');
        }

        setUserId(extractedUserId);

        // Consultar la API REST de Supabase para obtener pacientes con información de deuda y próxima cita
        setLoadingMessage('Cargando lista de pacientes...');
        const patientsData = await supabaseRest.getPatientsWithNextAppointment(extractedUserId);

        // eslint-disable-next-line no-console
        console.debug('[Patients] getPatientsWithNextAppointment result:', patientsData);

        setLoadingMessage('Finalizando carga...');
        setPatients(patientsData || []);

      } catch (err) {
        setError(err.message || 'Error al cargar los pacientes');
      } finally {
        setLoading(false);
        setLoadingMessage('');
      }
    }

    loadPatients();
  }, [isAuthenticated, recurringConfirmModal]);

  const togglePatientDetails = (patientId) => {
    setExpandedPatient(expandedPatient === patientId ? null : patientId);
  };

  const handleAddNewPatient = () => {
    setEditingPatient('new');
    setEditForm({
      name: '',
      last_name: '',
      tel: '',
      email: '',
      dir: '',
      age: '',
      health_insurance: '',
      reason: ''
    });
  };

  const addPatient = (text = 'Agregar Paciente') => {
    return (
      <button
        className="patients-add-btn"
        onClick={handleAddNewPatient}
      >
        {text}
      </button>
    );
  };

  // Funciones de edición
  const handleEditPatient = (patient) => {
    setEditingPatient(patient.id);
    setEditForm({
      name: patient.name || '',
      last_name: patient.last_name || '',
      tel: patient.tel || '',
      email: patient.email || '',
      dir: patient.dir || '',
      age: patient.age || '',
      health_insurance: patient.health_insurance || '',
      reason: patient.reason || ''
    });
  };

  const handleCancelEdit = () => {
    setEditingPatient(null);
    setEditForm({
      name: '',
      last_name: '',
      tel: '',
      email: '',
      dir: '',
      age: '',
      health_insurance: '',
      reason: ''
    });
  };

  const handleSaveEdit = async () => {
    const isCreating = editingPatient === 'new';
    const savePromise = async () => {
      console.log(isCreating ? 'Creando paciente:' : 'Guardando paciente:', editForm);
      let resultPatient;
      if (isCreating) {
        // Crear nuevo paciente; requiere user_id
        resultPatient = await supabaseRest.createPatient({ ...editForm, user_id: userId });
        setPatients([resultPatient, ...patients]);
      } else {
        // Actualizar paciente existente
        const updatedPatient = await supabaseRest.updatePatient(editingPatient, editForm);
        resultPatient = updatedPatient;
        setPatients(patients.map(p => p.id === editingPatient ? { ...p, ...updatedPatient } : p));
      }
      handleCancelEdit();
      return resultPatient;
    };

    toast.promise(
      savePromise(),
      {
        loading: isCreating ? 'Creando paciente...' : 'Guardando cambios...',
        success: (data) => {
          const patientName = data.name || 'Paciente';
          return isCreating
            ? `🆕 ${patientName} creado correctamente`
            : `✅ ${patientName} actualizado exitosamente`;
        },
        error: (err) => `❌ Error: ${err.message}`,
      },
      {
        style: { minWidth: '300px' },
        success: { duration: 3000, icon: isCreating ? '✨' : '🎉' },
        error: { duration: 5000, icon: '💥' },
      }
    );
  };

  const handleFormChange = (field, value) => {
    setEditForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleDeletePatient = (patient) => {
    setConfirmModal({
      isOpen: true,
      patient: patient
    });
  };

  const confirmDeletePatient = async () => {
    const patient = confirmModal.patient;
    setConfirmModal({ isOpen: false, patient: null });

    const deletePromise = async () => {
      let calendarResult = null;

      // Primero intentar eliminar eventos de Google Calendar
      try {
        const { isAuthorized, deletePatientCalendarEvents } = await import('../../lib/googleCalendar');

        if (isAuthorized()) {
          console.log('🗑️ Eliminando eventos de Google Calendar para:', patient.name);
          calendarResult = await deletePatientCalendarEvents(patient);
        } else {
          console.log('ℹ️ Google Calendar no está conectado, saltando eliminación de eventos');
        }
      } catch (calendarError) {
        console.warn('Warning: Could not delete Google Calendar events:', calendarError);
        // Continuar aunque falle la eliminación del calendario
      }

      // Eliminar todos los turnos pendientes del paciente
      try {
        await supabaseRest.deletePendingAppointmentsByPatient(patient.id, userId);
      } catch (appointmentError) {
        console.warn('Warning: Could not delete appointments:', appointmentError);
        // Continuar con la eliminación del paciente aunque fallen los turnos
      }

      // Luego eliminar el paciente
      await supabaseRest.deletePatient(patient.id, userId);
      setPatients(patients.filter(p => p.id !== patient.id));

      return { patient, calendarResult };
    };

    toast.promise(
      deletePromise(),
      {
        loading: 'Eliminando paciente, turnos y eventos del calendario...',
        success: (data) => {
          const { patient, calendarResult } = data;
          let message = `🗑️ ${patient.name || 'Paciente'} y turnos eliminados correctamente`;

          if (calendarResult && calendarResult.deleted > 0) {
            message += ` (${calendarResult.deleted} eventos del calendario eliminados)`;
          }

          return message;
        },
        error: (err) => `❌ Error al eliminar: ${err.message}`,
      },
      {
        style: { minWidth: '300px' },
        success: { duration: 4000, icon: '✅' },
        error: { duration: 5000, icon: '💥' },
      }
    );
  };

  const cancelDeletePatient = () => {
    setConfirmModal({ isOpen: false, patient: null });
  };

  const handleRecurringConfirmation = (appointmentData, appointmentWithUserId) => {
    // Calcular el nombre del paciente una sola vez aquí
    let patientName = 'el paciente';
    if (appointmentForm?.patient) {
      const firstName = appointmentForm.patient.name || '';
      const lastName = appointmentForm.patient.last_name || '';
      patientName = `${firstName} ${lastName}`.trim() || 'el paciente';
    }
    const openModal = !!appointmentData.actualAppointments.length;

    // Ensure appointmentData and appointmentWithUserId are always valid objects with required fields
    let safeAppointmentData = appointmentData || {};
    let safeAppointmentWithUserId = appointmentWithUserId || {};
    // patient_id
    let patientId = safeAppointmentData.patient_id || appointmentForm?.patient?.id || safeAppointmentWithUserId.patient_id;
    if (patientId) {
      safeAppointmentData = { ...safeAppointmentData, patient_id: patientId };
      safeAppointmentWithUserId = { ...safeAppointmentWithUserId, patient_id: patientId };
    }

    const modal = {
      isOpen: openModal,
      appointmentData: safeAppointmentData,
      appointmentWithUserId: safeAppointmentWithUserId,
      patientName, // Agregar el nombre calculado al estado
      patientData: appointmentForm?.patient,
    }

    setRecurringConfirmModal({
      ...modal
    });
    if (!openModal) {
      createAppointments(modal);
    }
  };


  const createAppointments = async (modal, shouldClearExisting = false) => {
    const { appointmentWithUserId, safeAppointmentData, patientName, patientData } = modal;
    try {

      setAppointmentLoading(true);
      const result = await supabaseRest.createRecurringAppointments(appointmentWithUserId, shouldClearExisting);

      // Validar que result existe y tiene las propiedades esperadas
      if (!result) {
        throw new Error('No se recibió respuesta del servidor');
      }

      const createdCount = result.createdCount || 0;
      const deletedCount = result.deletedCount || 0;
      const frequency = safeAppointmentData?.frequency || 'recurrentes';

      // Usar el nombre del paciente ya calculado
      const finalPatientName = patientName || 'el paciente';

      let message = `📅 ${createdCount} turnos ${frequency}es programados para ${finalPatientName}`;
      if (deletedCount > 0) {
        message += ` (${deletedCount} turnos anteriores reemplazados)`;
      }

      // Intentar crear eventos en Google Calendar si está autorizado
      setCalendarLoading(true);
      try {
        const { isGoogleApiReady } = await import('../../lib/googleCalendar');
        if (!isGoogleApiReady() && isAuthorized()) {
          toast.error('Google Calendar no está listo. Por favor, vuelve a conectar.');
          setShowGoogleCalendarSettings(true);
        } else if (isAuthorized() && result.appointments && result.appointments.length > 0) {
          // DEBUGGING: Verificar datos del paciente para turnos recurrentes
          console.log('🔍 [confirmRecurringAppointments] patientData:', patientData);

          const calendarResult = await createRecurringCalendarEvents(
            result.appointments,
            patientData  // Usar los datos completos del paciente
          );

          if (calendarResult.success) {
            message += ` y sincronizados con Google Calendar`;
            if (calendarResult.errors > 0) {
              message += ` (${calendarResult.errors} eventos no se pudieron sincronizar)`;
            }
          }
        }
      } catch (calendarError) {
        console.error('Error creating Google Calendar events:', calendarError);
        toast.error(`⚠️ Turnos creados pero no se pudieron sincronizar con Google Calendar: ${calendarError.message}`);
      } finally {
        setCalendarLoading(false);
      }

      toast.success(message);

      // Trigger appointments list refresh in other components
      if (onRecurringAppointmentsCreated && appointmentForm?.patient?.id) {
        onRecurringAppointmentsCreated({
          patientId: appointmentForm.patient.id,
          patientName: finalPatientName,
          frequency: frequency,
          createdCount: createdCount,
          deletedCount: deletedCount,
          shouldClearExisting
        });
      }

      // Trigger appointments list refresh in other components
      if (triggerUpdate) {
        triggerUpdate();
      }

    } catch (error) {
      console.error('Error creating recurring appointments:', error);
      const errorMessage = error?.message || 'Error desconocido';
      toast.error(`❌ Error al programar turnos: ${errorMessage}`);
    } finally {
      setAppointmentLoading(false);
    }
  };

  const confirmRecurringAppointments = async (shouldClearExisting =  false) => {
    const { appointmentData, appointmentWithUserId } = recurringConfirmModal;
    setRecurringConfirmModal({ isOpen: false, appointmentData: null, appointmentWithUserId: null, patientName: null, patientData: null });

    // Fix: Ensure appointmentData.patient_id is available
    const safeAppointmentData = appointmentData || {};
    if (!safeAppointmentData.patient_id && appointmentWithUserId && appointmentWithUserId.patient_id) {
      safeAppointmentData.patient_id = appointmentWithUserId.patient_id;
    }
debugger;
    createAppointments(recurringConfirmModal, shouldClearExisting);
  };

  const cancelRecurringConfirmation = () => {
    setRecurringConfirmModal({ isOpen: false, appointmentData: null, appointmentWithUserId: null, patientName: null, patientData: null });
  };

  const handleOpenAppointment = (patient) => {
    setAppointmentForm({
      isOpen: true,
      patient: patient
    });
  };

  const handleCloseAppointment = () => {
    setAppointmentForm({
      isOpen: false,
      patient: null
    });
  };

  const handleSaveAppointment = async (appointmentData, isRecurring = false, addToCalendar = true) => {
    try {
      setAppointmentLoading(true);
      const userId = extractUserIdFromToken(token);
      if (!userId) {
        toast.error('Error de autenticación');
        return;
      }
      const appointmentWithUserId = {
        ...appointmentData,
        user_id: userId
      };
      let result;
      if (isRecurring && appointmentData.frequency !== 'unica') {
        console.log('Creating recurring appointments...');
        // Mostrar modal de confirmación para turnos recurrentes aca
        // Ensure patient_id is present in appointmentWithUserId and appointmentData
        let patientId = appointmentData?.patient_id || appointmentForm?.patient?.id || appointmentWithUserId?.patient_id;
        if (!patientId) {
          toast.error('No se pudo determinar el paciente para los turnos recurrentes.');
          return;
        }
        // Ensure appointmentData is always an object with required fields
        appointmentData = {
          ...(appointmentData || {}),
          patient_id: patientId
        };
        appointmentWithUserId.patient_id = patientId;
        const actualAppointments = (await supabaseRest.getAppointmentsByUserId(appointmentWithUserId.user_id))
          .filter(appointment => appointment.patient_id === patientId && appointment.user_id === appointmentWithUserId.user_id);
        appointmentData = {
          ...appointmentData,
          actualAppointments
        };
        handleRecurringConfirmation(appointmentData, appointmentWithUserId);
        return; // Salir aquí, la confirmación se maneja en el modal

      } else {
        // Llamar al servicio para crear una sola cita
        result = await supabaseRest.createAppointment(appointmentWithUserId);

        // Intentar crear evento en Google Calendar si está autorizado
        setCalendarLoading(true);
        try {
          if (isAuthorized() && addToCalendar) {
            try {
              await createCalendarEvent(appointmentWithUserId, appointmentForm.patient);
              toast.success(`📅 Turno programado para ${appointmentForm.patient.name} y añadido a Google Calendar`);
            } catch (calendarError) {
              if (calendarError.message && calendarError.message.includes('no está lista')) {
                const reconnected = await reconnectGoogleCalendar();
                if (reconnected) {
                  try {
                    await createCalendarEvent(appointmentWithUserId, appointmentForm.patient);
                    toast.success(`📅 Turno programado para ${appointmentForm.patient.name} y añadido a Google Calendar (tras reconexión)`);
                  } catch (err2) {
                    toast.success(`📅 Turno programado para ${appointmentForm.patient.name}`);
                    toast.error('No se pudo sincronizar con Google Calendar tras reconexión');
                  }
                } else {
                  toast.success(`📅 Turno programado para ${appointmentForm.patient.name}`);
                  toast.error('No se pudo reconectar Google Calendar');
                }
              } else {
                toast.success(`📅 Turno programado para ${appointmentForm.patient.name}`);
                toast.error(`⚠️ No se pudo sincronizar con Google Calendar: ${calendarError.message}`);
              }
            }
          } else {
            toast.success(`📅 Turno programado para ${appointmentForm.patient.name}`);
          }
        } finally {
          setCalendarLoading(false);
        }
      }

      // Recargar pacientes con información de deuda y próxima cita actualizada
      const updatedPatients = await supabaseRest.getPatientsWithNextAppointment(userId);
      setPatients(updatedPatients || []);

      // Cerrar el formulario
      handleCloseAppointment();

      return result;
    } catch (error) {
      console.error('Error saving appointment:', error);
      toast.error('Error al guardar el turno');
      throw error;
    } finally {
      setAppointmentLoading(false);
    }
  };

  // Filtrar pacientes por nombre o apellido (ignorando acentos)
  const filteredPatients = patients.filter(patient => {
    if (!searchTerm) return true;

    // Normalizar término de búsqueda (sin acentos)
    const searchNormalized = normalizeText(searchTerm);

    // Normalizar campos del paciente (sin acentos)
    const name = normalizeText(patient.name || '');
    const lastName = normalizeText(patient.last_name || '');
    const fullName = normalizeText(`${patient.name || ''} ${patient.last_name || ''}`.trim());
    const health_insurance = normalizeText(patient.health_insurance || '');
    const tel = normalizeText(patient.tel || '');
    const email = normalizeText(patient.email || '');

    return name.includes(searchNormalized) ||
      lastName.includes(searchNormalized) ||
      fullName.includes(searchNormalized) ||
      health_insurance.includes(searchNormalized) ||
      tel.includes(searchNormalized) ||
      email.includes(searchNormalized);
  });

  if (!isAuthenticated) {
    return (
      <div className="patients-container">
        <p className="patients-error">Debes estar autenticado para ver los pacientes.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <Loading
        message={loadingMessage}
        size="large"
        overlay={true}
      />
    );
  }

  if (error) {
    return (
      <div className="patients-container">
        <div className="patients-error">
          <h3>Error</h3>
          <p>{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="patients-retry-btn"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="patients-container">
      <div className="patients-header">
        <h2>Lista de Pacientes</h2>
        <div className="patients-header-actions">
          {patients.length > 0 && addPatient()}
        </div>
        <p className="patients-user-info">Usuario ID: {userId}</p>

        {/* Configuración de Google Calendar */}
        {showGoogleCalendarSettings && (
          <GoogleCalendarSettings
            isOpen={showGoogleCalendarSettings}
            onClose={() => setShowGoogleCalendarSettings(false)}
          />
        )}

        {/* Campo de búsqueda */}
        <div className="patients-search">
          <input
            type="text"
            placeholder="Buscar paciente (nombre, apellido, obra social, teléfono, email)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="patients-search-input"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="patients-search-clear"
              title="Limpiar búsqueda"
            >
              ✕
            </button>
          )}
        </div>

        <p className="patients-count">
          {patients.length === 0
            ? 'No hay pacientes registrados'
            : searchTerm
              ? `${filteredPatients.length} de ${patients.length} paciente${patients.length !== 1 ? 's' : ''}`
              : `${patients.length} paciente${patients.length !== 1 ? 's' : ''} encontrado${patients.length !== 1 ? 's' : ''}`
          }
        </p>
      </div>

      {/* Formulario de creación (visible siempre que esté editando 'new') */}
      {editingPatient === 'new' && (
        <div className="patients-list editing-single-column">
          <div className="patient-card">
            <div className="patient-edit-form">
              <h3>Nuevo Paciente</h3>
              <div className="edit-form-grid">
                <div className="form-field">
                  <label>Nombre:</label>
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={(e) => handleFormChange('name', e.target.value)}
                    className="edit-input"
                  />
                </div>
                <div className="form-field">
                  <label>Apellido:</label>
                  <input
                    type="text"
                    value={editForm.last_name}
                    onChange={(e) => handleFormChange('last_name', e.target.value)}
                    className="edit-input"
                  />
                </div>
                <div className="form-field">
                  <label>Teléfono:</label>
                  <input
                    type="tel"
                    value={editForm.tel}
                    onChange={(e) => handleFormChange('tel', e.target.value)}
                    className="edit-input"
                  />
                </div>
                <div className="form-field">
                  <label>Email:</label>
                  <input
                    type="email"
                    value={editForm.email}
                    onChange={(e) => handleFormChange('email', e.target.value)}
                    className="edit-input"
                  />
                </div>
                <div className="form-field">
                  <label>Dirección:</label>
                  <input
                    type="text"
                    value={editForm.dir}
                    onChange={(e) => handleFormChange('dir', e.target.value)}
                    className="edit-input"
                  />
                </div>
                <div className="form-field">
                  <label>Edad:</label>
                  <input
                    type="number"
                    min="0"
                    max="120"
                    value={editForm.age}
                    onChange={(e) => handleFormChange('age', e.target.value)}
                    className="edit-input"
                    placeholder="Años"
                  />
                </div>
                <div className="form-field">
                  <label>Obra Social:</label>
                  <input
                    type="text"
                    value={editForm.health_insurance}
                    onChange={(e) => handleFormChange('health_insurance', e.target.value)}
                    className="edit-input"
                  />
                </div>
                <div className="form-field full-width">
                  <label>Motivo:</label>
                  <textarea
                    value={editForm.reason}
                    onChange={(e) => handleFormChange('reason', e.target.value)}
                    className="edit-textarea"
                    rows="3"
                  />
                </div>
              </div>
              <div className="edit-form-actions">
                <button className="save-btn" onClick={handleSaveEdit}>Crear</button>
                <button className="cancel-btn" onClick={handleCancelEdit}>Cancelar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {patients.length > 0 ? (
        <div className={`patients-list ${editingPatient ? 'editing-single-column' : ''} ${filteredPatients.length === 1 ? 'single-patient' : ''}`}>
          {filteredPatients.length > 0 ? (
            filteredPatients.map((patient, index) => (
              <div key={patient.id || index} className={`patient-card ${expandedPatient === patient.id ? 'expanded' : ''}`}>
                {editingPatient === patient.id ? (
                  <div className="patient-edit-form">
                    <h3>Editar Paciente</h3>
                    <div className="edit-form-grid">
                      <div className="form-field">
                        <label>Nombre:</label>
                        <input
                          type="text"
                          value={editForm.name}
                          onChange={(e) => handleFormChange('name', e.target.value)}
                          className="edit-input"
                        />
                      </div>
                      <div className="form-field">
                        <label>Apellido:</label>
                        <input
                          type="text"
                          value={editForm.last_name}
                          onChange={(e) => handleFormChange('last_name', e.target.value)}
                          className="edit-input"
                        />
                      </div>
                      <div className="form-field">
                        <label>Teléfono:</label>
                        <input
                          type="tel"
                          value={editForm.tel}
                          onChange={(e) => handleFormChange('tel', e.target.value)}
                          className="edit-input"
                        />
                      </div>
                      <div className="form-field">
                        <label>Email:</label>
                        <input
                          type="email"
                          value={editForm.email}
                          onChange={(e) => handleFormChange('email', e.target.value)}
                          className="edit-input"
                        />
                      </div>
                      <div className="form-field">
                        <label>Dirección:</label>
                        <input
                          type="text"
                          value={editForm.dir}
                          onChange={(e) => handleFormChange('dir', e.target.value)}
                          className="edit-input"
                        />
                      </div>
                      <div className="form-field">
                        <label>Edad:</label>
                        <input
                          type="number"
                          min="0"
                          max="120"
                          value={editForm.age}
                          onChange={(e) => handleFormChange('age', e.target.value)}
                          className="edit-input"
                          placeholder="Años"
                        />
                      </div>
                      <div className="form-field">
                        <label>Obra Social:</label>
                        <input
                          type="text"
                          value={editForm.health_insurance}
                          onChange={(e) => handleFormChange('health_insurance', e.target.value)}
                          className="edit-input"
                        />
                      </div>
                      <div className="form-field full-width">
                        <label>Motivo:</label>
                        <textarea
                          value={editForm.reason}
                          onChange={(e) => handleFormChange('reason', e.target.value)}
                          className="edit-textarea"
                          rows="3"
                        />
                      </div>
                    </div>
                    <div className="edit-form-actions">
                      <button className="save-btn" onClick={handleSaveEdit}>Guardar</button>
                      <button className="cancel-btn" onClick={handleCancelEdit}>Cancelar</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="patient-info">
                      <div className="patient-header">
                        <div className="patient-title">
                          <h3 className="patient-name">{patient.name || 'Sin nombre'}</h3>
                          {patient.last_name && <p className="patient-lastname">{patient.last_name}</p>}
                        </div>
                        <button
                          className="appointment-btn"
                          onClick={() => handleOpenAppointment(patient)}
                          title="Programar turno"
                        >
                          📅
                        </button>
                      </div>

                      {/* Indicador de deuda */}
                      {patient.hasDebt && patient.debt > 0 && (
                        <div className="patient-debt-alert">
                          <span className="debt-icon">⚠️</span>
                          <span className="debt-text">
                            Debe: {formatCurrency(patient.debt)}
                          </span>
                        </div>
                      )}

                      {/* Mostrar resumen financiero cuando está expandido */}
                      {expandedPatient === patient.id && (
                        <div className="patient-financial-summary">
                          <div className="financial-item">
                            <span className="financial-label">Total de honorarios:</span>
                            <span className="financial-amount">{formatCurrency(patient.totalAppointments || 0)}</span>
                          </div>
                          <div className="financial-item">
                            <span className="financial-label">Honorarios cancelados:</span>
                            <span className="financial-amount">{formatCurrency(patient.totalPayments || 0)}</span>
                          </div>
                          <div className="financial-item financial-debt">
                            <span className="financial-label">Saldo:</span>
                            <span className={`financial-amount ${patient.debt > 0 ? 'debt' : patient.debt < 0 ? 'credit' : 'neutral'}`}>
                              {formatCurrency(patient.debt || 0)}
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Próxima cita (donde antes estaba el teléfono) */}
                      <div className="patient-next-appointment">
                        <span className="next-appointment-icon">📅</span>
                        <span className="next-appointment-text">
                          {patient.nextAppointment
                            ? formatNextAppointmentDate(patient.nextAppointment.date)
                            : 'Sin turnos programados'
                          }
                        </span>
                      </div>

                      {expandedPatient === patient.id && (
                        <div className="patient-details">
                          {patient.tel && <p className="patient-phone">📞 {patient.tel}</p>}
                          {patient.age && <p className="patient-age">⏳ {patient.age}</p>}
                          {patient.email && <p className="patient-email">📧 {patient.email}</p>}
                          {patient.dir && <p className="patient-address">🏠 {patient.dir}</p>}
                          {patient.health_insurance && <p className="patient-insurance">🏥 {patient.health_insurance}</p>}
                          {patient.reason && <p className="patient-reason">📝 {patient.reason}</p>}
                          {patient.created_at && (
                            <p className="patient-date">📅 Registrado: {new Date(patient.created_at).toLocaleDateString('es-ES')}</p>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Botón Ver siempre visible */}
                    <div className="patient-actions-preview">
                      <button
                        className="patient-view-btn"
                        onClick={() => togglePatientDetails(patient.id)}
                      >
                        {expandedPatient === patient.id ? 'Ocultar' : 'Ver'}
                      </button>
                    </div>

                    {/* Botones adicionales solo cuando está expandido */}
                    {expandedPatient === patient.id && (
                      <div className="patient-actions-expanded">
                        <button
                          className="patient-edit-btn"
                          onClick={() => handleEditPatient(patient)}
                        >
                          Editar
                        </button>
                        <button
                          className="patient-delete-btn"
                          onClick={() => handleDeletePatient(patient)}
                        >
                          Eliminar
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            ))
          ) : (
            <div className="patients-empty">
              <p>No se encontraron pacientes con "{searchTerm}"</p>
              <button onClick={() => setSearchTerm('')} className="patients-add-btn">
                Limpiar búsqueda
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="patients-empty">
          <p>No hay pacientes registrados para este usuario.</p>
          {
            addPatient('Primer Paciente')
          }
        </div>
      )}

      {/* Modal de confirmación para eliminar */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={cancelDeletePatient}
        onConfirm={confirmDeletePatient}
        title="Eliminar Paciente"
        message={`¿Estás seguro de que quieres eliminar a ${confirmModal.patient?.name || 'este paciente'}? Esta acción no se puede deshacer.`}
        confirmText="Eliminar"
        cancelText="Cancelar"
        type="danger"
      />

      {/* Modal de confirmación para turnos recurrentes */}
      {recurringConfirmModal.isOpen && (
        <div className="appointment-confirm-overlay">
          <div className="appointment-confirm-modal">
            <h3>Turnos Recurrentes</h3>
            <p>
              ¿Desea reemplazar los turnos {recurringConfirmModal.appointmentData?.frequency || 'recurrentes'}es existentes pendientes de {recurringConfirmModal.patientName || 'el paciente'}?
            </p>
            <div className="confirmation-details">
              <div className="option">
                <strong>Reemplazar:</strong> Eliminará turnos recurrentes pendientes existentes y creará nuevos.
              </div>
              <div className="option">
                <strong>Mantener:</strong> Mantendrá los existentes y agregará los nuevos.
              </div>
            </div>
            <div className="appointment-confirm-buttons">
              <button
                className="confirm-replace-btn"
                onClick={() => confirmRecurringAppointments(true)}
                disabled={appointmentLoading}
              >
                {appointmentLoading ? 'Cargando...' : 'Reemplazar'}
              </button>
              <button
                className="confirm-keep-btn"
                onClick={() => confirmRecurringAppointments(false)}
                disabled={appointmentLoading}
              >
                {appointmentLoading ? 'Cargando...' : 'Mantener'}
              </button>
              <button
                className="confirm-cancel-btn"
                onClick={cancelRecurringConfirmation}
                disabled={appointmentLoading}
              >
                Cancelar
              </button>
            </div>
            {appointmentLoading && (
              <div className="appointment-loading-overlay">
                <Loading message="Procesando..." size="medium" overlay={false} />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal del formulario de turnos */}
      <AppointmentForm
        isOpen={appointmentForm.isOpen}
        onClose={handleCloseAppointment}
        onSave={handleSaveAppointment}
        patient={appointmentForm.patient}
        addToCalendar={isAuthorized() ? appointmentForm.addToCalendar : undefined}
        onAddToCalendarChange={isAuthorized() ? (checked => setAppointmentForm(prev => ({ ...prev, addToCalendar: checked }))) : undefined}
      />

      {/* Loading Overlays */}
      {calendarLoading && (
        <Loading
          message="Sincronizando con Google Calendar..."
          size="large"
          overlay={true}
        />
      )}

      {appointmentLoading && (
        <Loading
          message="Creando turnos..."
          size="large"
          overlay={true}
        />
      )}
    </div>
  );
}

export default Patients;
