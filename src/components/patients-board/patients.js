import React, { useState, useEffect, useContext } from 'react';
import toast from 'react-hot-toast';
import { AuthContext } from '../../App';
import supabaseRest, { getPatientsByUserId } from '../../lib/supabaseRest';
import ConfirmModal from '../ConfirmModal/ConfirmModal';
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

function Patients() {
  const { isAuthenticated } = useContext(AuthContext);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
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

  useEffect(() => {
    async function loadPatients() {
      if (!isAuthenticated) {
        setError('No hay sesión activa');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      
      try {
        // Obtener el token del localStorage
        const token = localStorage.getItem('token');
        if (!token) {
          throw new Error('No se encontró el token de autenticación');
        }

        // Extraer el user_id del token
        const extractedUserId = extractUserIdFromToken(token);
        if (!extractedUserId) {
          throw new Error('No se pudo obtener el ID del usuario del token');
        }

        setUserId(extractedUserId);
        
        // Consultar la API REST de Supabase para obtener pacientes
        const patientsData = await getPatientsByUserId(extractedUserId);
        // eslint-disable-next-line no-console
        console.debug('[Patients] getPatientsByUserId result:', patientsData);
        
        setPatients(patientsData || []);

      } catch (err) {
        setError(err.message || 'Error al cargar los pacientes');
      } finally {
        setLoading(false);
      }
    }

    loadPatients();
  }, [isAuthenticated]);

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
      await supabaseRest.deletePatient(patient.id, userId);
      setPatients(patients.filter(p => p.id !== patient.id));
      return patient;
    };

    toast.promise(
      deletePromise(),
      {
        loading: 'Eliminando paciente...',
        success: (data) => `🗑️ ${data.name || 'Paciente'} eliminado correctamente`,
        error: (err) => `❌ Error al eliminar: ${err.message}`,
      },
      {
        style: { minWidth: '300px' },
        success: { duration: 3000, icon: '✅' },
        error: { duration: 5000, icon: '💥' },
      }
    );
  };

  const cancelDeletePatient = () => {
    setConfirmModal({ isOpen: false, patient: null });
  };

  // Filtrar pacientes por nombre o apellido
  const filteredPatients = patients.filter(patient => {
    if (!searchTerm) return true;
    
    const searchLower = searchTerm.toLowerCase();
    const name = (patient.name || '').toLowerCase();
    const lastName = (patient.last_name || '').toLowerCase();
    const fullName = `${name} ${lastName}`.trim();
    const health_insurance = (patient.health_insurance || '').toLowerCase();
    
    return name.includes(searchLower) || 
           lastName.includes(searchLower) || 
           fullName.includes(searchLower) ||
           health_insurance.includes(searchLower);
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
      <div className="patients-container">
        <div className="patients-loading">
          <img src="/logo.svg" alt="Psi" className="loading" />
          <p>Cargando pacientes...</p>
        </div>
      </div>
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
        {patients.length > 0 && addPatient()}
        <p className="patients-user-info">Usuario ID: {userId}</p>
        
        {/* Campo de búsqueda */}
        <div className="patients-search">
          <input
            type="text"
            placeholder="Buscar por nombre o apellido..."
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
              <div key={patient.id || index} className="patient-card">
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
                      <h3 className="patient-name">{patient.name || 'Sin nombre'}</h3>
                      {patient.last_name && <p className="patient-lastname">{patient.last_name}</p>}
                      {patient.tel && <p className="patient-phone">� {patient.tel}</p>}
                      {expandedPatient === patient.id && (
                        <div className="patient-details">
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
                    <div className="patient-actions">
                      <button
                        className="patient-view-btn"
                        onClick={() => togglePatientDetails(patient.id)}
                      >
                        {expandedPatient === patient.id ? 'Ocultar' : 'Ver'}
                      </button>
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
    </div>
  );
}

export default Patients;
