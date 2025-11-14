import React, { useState, useEffect, useContext } from 'react';
import toast from 'react-hot-toast';
import { AuthContext } from '../../App';
import supabaseRest from '../../lib/supabaseRest';
import PaymentForm from '../PaymentForm/PaymentForm';
import ConfirmModal from '../ConfirmModal/ConfirmModal';
import './Payments.css';

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

// Función para formatear fecha
function formatDate(dateString) {
  if (!dateString) return 'No especificada';
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (error) {
    return 'Fecha inválida';
  }
}

// Función para formatear dinero
function formatCurrency(amount) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0
  }).format(amount);
}

function Payments() {
  const { isAuthenticated, token } = useContext(AuthContext);
  const [payments, setPayments] = useState([]);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userId, setUserId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Estados para modales
  const [paymentFormOpen, setPaymentFormOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState(null);
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    payment: null
  });

  useEffect(() => {
    async function loadData() {
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
        
        // Cargar pacientes y pagos en paralelo
        const [patientsData, paymentsData] = await Promise.all([
          supabaseRest.getPatientsByUserId(extractedUserId),
          supabaseRest.getPaymentsByUserId(extractedUserId)
        ]);
        
        console.debug('[Payments] Patients loaded:', patientsData);
        console.debug('[Payments] Payments loaded:', paymentsData);
        
        setPatients(patientsData || []);
        setPayments(paymentsData || []);

      } catch (err) {
        console.error('Error loading data:', err);
        setError(err.message || 'Error al cargar los datos');
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [isAuthenticated, token]);

  // Función para abrir formulario de nuevo pago
  const handleNewPayment = () => {
    setEditingPayment(null);
    setPaymentFormOpen(true);
  };

  // Función para editar pago
  const handleEditPayment = (payment) => {
    setEditingPayment(payment);
    setPaymentFormOpen(true);
  };

  // Función para cerrar formulario
  const handleCloseForm = () => {
    setPaymentFormOpen(false);
    setEditingPayment(null);
  };

  // Función para guardar pago (crear o editar)
  const handleSavePayment = async (paymentData) => {
    try {
      if (editingPayment) {
        // Editar pago existente
        const updatedPayment = await supabaseRest.updatePayment(
          editingPayment.id,
          paymentData,
          userId
        );
        
        setPayments(payments.map(payment => 
          payment.id === editingPayment.id 
            ? { ...payment, ...updatedPayment }
            : payment
        ));
        
        toast.success('💰 Pago actualizado correctamente');
      } else {
        // Crear nuevo pago
        const newPayment = await supabaseRest.createPayment({
          ...paymentData,
          user_id: userId
        });
        
        setPayments([...payments, newPayment]);
        toast.success('💰 Pago registrado correctamente');
      }
      
      handleCloseForm();
    } catch (error) {
      console.error('Error saving payment:', error);
      toast.error('Error al guardar el pago');
      throw error;
    }
  };

  // Función para eliminar pago
  const handleDeletePayment = (payment) => {
    setConfirmModal({
      isOpen: true,
      payment: payment
    });
  };

  // Confirmar eliminación
  const confirmDeletePayment = async () => {
    const payment = confirmModal.payment;
    setConfirmModal({ isOpen: false, payment: null });

    const deletePromise = async () => {
      await supabaseRest.deletePayment(payment.id, userId);
      setPayments(payments.filter(p => p.id !== payment.id));
      return payment;
    };

    toast.promise(
      deletePromise(),
      {
        loading: 'Eliminando pago...',
        success: '🗑️ Pago eliminado correctamente',
        error: (err) => `❌ Error al eliminar: ${err.message}`,
      },
      {
        style: { minWidth: '300px' },
        success: { duration: 3000, icon: '✅' },
        error: { duration: 5000, icon: '💥' },
      }
    );
  };

  // Cancelar eliminación
  const cancelDeletePayment = () => {
    setConfirmModal({ isOpen: false, payment: null });
  };

  // Función para obtener nombre del paciente
  const getPatientName = (patientId) => {
    const patient = patients.find(p => p.id === patientId);
    return patient ? `${patient.name} ${patient.last_name}` : 'Paciente no encontrado';
  };

  // Filtrar pagos por término de búsqueda (ignorando acentos)
  const filteredPayments = payments.filter(payment => {
    if (!searchTerm) return true;
    
    const searchNormalized = normalizeText(searchTerm);
    const patientName = normalizeText(getPatientName(payment.patient_id));
    const observation = normalizeText(payment.contribution_ob || '');
    
    return patientName.includes(searchNormalized) ||
           observation.includes(searchNormalized);
  });

  if (loading) {
    return (
      <div className="payments-container">
        <div className="payments-loading">
          <div className="payments-loading-content">
            <div className="payments-loading-spinner"></div>
            <p>Cargando pagos...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="payments-container">
        <div className="payments-error">
          <div className="payments-error-content">
            <h3>Error al cargar los pagos</h3>
            <p>{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="payments-retry-btn"
            >
              Reintentar
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="payments-container">
      <div className="payments-header">
        <h2>Gestión de Pagos</h2>
        <p className="payments-user-info">Usuario ID: {userId}</p>
        
        {/* Controles */}
        <div className="payments-controls">
          <div className="payments-search">
            <input
              type="text"
              placeholder="Buscar por nombre del paciente u observación..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="payments-search-input"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="payments-search-clear"
                title="Limpiar búsqueda"
              >
                ✕
              </button>
            )}
          </div>
          
          <button
            onClick={handleNewPayment}
            className="payments-new-btn"
          >
            + Nuevo Pago
          </button>
        </div>
      </div>

      {/* Lista de pagos */}
      {filteredPayments.length > 0 ? (
        <div className="payments-grid">
          {filteredPayments.map((payment) => (
            <div key={payment.id} className="payment-card">
              <div className="payment-header">
                <h4 className="patient-name">
                  {getPatientName(payment.patient_id)}
                </h4>
                <div className="payment-amount">
                  {formatCurrency(payment.payment)}
                </div>
              </div>
              
              {payment.contribution_ob && (
                <div className="payment-observation">
                  <strong>Observación:</strong>
                  <p>{payment.contribution_ob}</p>
                </div>
              )}
              
              <div className="payment-actions">
                <button
                  className="payment-edit-btn"
                  onClick={() => handleEditPayment(payment)}
                  title="Editar pago"
                >
                  ✏️ Editar
                </button>
                <button
                  className="payment-delete-btn"
                  onClick={() => handleDeletePayment(payment)}
                  title="Eliminar pago"
                >
                  🗑️ Eliminar
                </button>
              </div>
              
              <div className="payment-meta">
                <small>Registrado: {formatDate(payment.created_at)}</small>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="payments-empty">
          <div className="payments-empty-content">
            <img src="/logo.svg" alt="Psi" className="payments-empty-icon" />
            <h3>No hay pagos registrados</h3>
            <p>Los pagos que registres aparecerán aquí.</p>
            <button
              onClick={handleNewPayment}
              className="payments-new-btn"
            >
              Registrar Primer Pago
            </button>
          </div>
        </div>
      )}

      {/* Modal del formulario */}
      <PaymentForm
        isOpen={paymentFormOpen}
        onClose={handleCloseForm}
        onSave={handleSavePayment}
        patients={patients}
        existingPayment={editingPayment}
      />

      {/* Modal de confirmación para eliminar */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={cancelDeletePayment}
        onConfirm={confirmDeletePayment}
        title="Eliminar Pago"
        message={`¿Estás seguro de que quieres eliminar este pago de ${getPatientName(confirmModal.payment?.patient_id)}? Esta acción no se puede deshacer.`}
        confirmText="Eliminar"
        cancelText="Cancelar"
        type="danger"
      />
    </div>
  );
}

export default Payments;