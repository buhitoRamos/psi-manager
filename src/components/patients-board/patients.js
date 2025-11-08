import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../App';
import { getPatientsByUserId } from '../../lib/supabaseRest';
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

      {patients.length > 0 ? (
        <div className="patients-list">
          {filteredPatients.length > 0 ? (
            filteredPatients.map((patient, index) => (
            <div key={patient.id || index} className="patient-card">
              <div className="patient-info">
                <h3 className="patient-name">
                  {patient.name || 'Sin nombre'}
                </h3>
                {patient.last_name && (
                  <p className="patient-lastname">{patient.last_name}</p>
                )}
                {patient.tel && (
                  <p className="patient-phone">📞 {patient.tel}</p>
                )}
                
                {/* Detalles expandibles */}
                {expandedPatient === patient.id && (
                  <div className="patient-details">
                    {patient.age && (
                        <p className="patient-age">⏳ {patient.age}</p>
                        )}
                    {patient.email && (
                      <p className="patient-email">📧 {patient.email}</p>
                    )}
                    {patient.dir && (
                      <p className="patient-address">🏠 {patient.dir}</p>
                    )}
                    {patient.health_insurance && (
                      <p className="patient-insurance">🏥 {patient.health_insurance}</p>
                    )}
                    {patient.reason && (
                      <p className="patient-reason">📝 {patient.reason}</p>
                    )}
                    {patient.created_at && (
                      <p className="patient-date">
                        📅 Registrado: {new Date(patient.created_at).toLocaleDateString('es-ES')}
                      </p>
                    )}
                  </div>
                )}
              </div>
              <div className="patient-actions">
                <button 
                  className="patient-view-btn"
                  onClick={() => togglePatientDetails(patient.id)}
                >
                  {expandedPatient === patient.id ? 'Ocultar detalles' : 'Ver detalles'}
                </button>
                <button className="patient-edit-btn">Editar</button>
              </div>
            </div>
            ))
          ) : (
            <div className="patients-empty">
              <p>No se encontraron pacientes con "{searchTerm}"</p>
              <button
                onClick={() => setSearchTerm('')}
                className="patients-add-btn"
              >
                Limpiar búsqueda
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="patients-empty">
          <p>No hay pacientes registrados para este usuario.</p>
          <button className="patients-add-btn">Agregar Primer Paciente</button>
        </div>
      )}
    </div>
  );
}

export default Patients;
