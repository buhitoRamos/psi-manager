import React, { useState, useEffect } from 'react';
import './PaymentForm.css';

function PaymentForm({ isOpen, onClose, onSave, patients, existingPayment = null }) {
  const [formData, setFormData] = useState({
    patient_id: '',
    payment: '',
    contribution_ob: ''
  });

  const [loading, setLoading] = useState(false);

  // Efecto para cargar los datos cuando se abre el modal
  useEffect(() => {
    if (isOpen) {
      if (existingPayment) {
        // Modo edición: cargar datos existentes
        setFormData({
          patient_id: existingPayment.patient_id || '',
          payment: existingPayment.payment || '',
          contribution_ob: existingPayment.contribution_ob || ''
        });
      } else {
        // Modo creación: limpiar formulario
        setFormData({
          patient_id: '',
          payment: '',
          contribution_ob: ''
        });
      }
    }
  }, [isOpen, existingPayment]);

  const handleChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.patient_id || !formData.payment) {
      alert('Por favor complete los campos obligatorios (paciente y monto)');
      return;
    }

    const paymentAmount = parseFloat(formData.payment);
    if (isNaN(paymentAmount) || paymentAmount <= 0) {
      alert('Por favor ingrese un monto válido');
      return;
    }

    setLoading(true);
    try {
      // Preparar datos para enviar
      const paymentData = {
        patient_id: parseInt(formData.patient_id),
        payment: paymentAmount,
        contribution_ob: formData.contribution_ob.trim() || null
      };

      await onSave(paymentData);
      onClose();
    } catch (error) {
      console.error('Error saving payment:', error);
      alert('Error al guardar el pago');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      patient_id: '',
      payment: '',
      contribution_ob: ''
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="payment-form-overlay">
      <div className="payment-form-modal">
        <div className="payment-form-header">
          <h3>
            {existingPayment ? 'Editar Pago' : 'Nuevo Pago'}
          </h3>
          <button
            onClick={handleCancel}
            className="payment-form-close"
            type="button"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="payment-form">
          {/* Selección de paciente */}
          <div className="form-group">
            <label htmlFor="patient_id" className="form-label">
              Paciente *
            </label>
            <select
              id="patient_id"
              value={formData.patient_id}
              onChange={(e) => handleChange('patient_id', e.target.value)}
              className="form-select"
              required
              disabled={loading}
            >
              <option value="">Selecciona un paciente</option>
              {patients.map(patient => (
                <option key={patient.id} value={patient.id}>
                  {patient.name} {patient.last_name}
                </option>
              ))}
            </select>
          </div>

          {/* Monto del pago */}
          <div className="form-group">
            <label htmlFor="payment" className="form-label">
              Monto del Pago *
            </label>
            <div className="amount-input-wrapper">
              <span className="currency-symbol">$</span>
              <input
                id="payment"
                type="number"
                min="0"
                step="0.01"
                value={formData.payment}
                onChange={(e) => handleChange('payment', e.target.value)}
                className="form-input amount-input"
                placeholder="0.00"
                required
                disabled={loading}
              />
            </div>
            <small className="form-help">
              Ingrese el monto sin el símbolo de moneda
            </small>
          </div>

          {/* Observaciones */}
          <div className="form-group">
            <label htmlFor="contribution_ob" className="form-label">
              Observaciones
            </label>
            <textarea
              id="contribution_ob"
              value={formData.contribution_ob}
              onChange={(e) => handleChange('contribution_ob', e.target.value)}
              className="form-textarea"
              rows="4"
              placeholder="Observaciones sobre el pago (opcional)"
              disabled={loading}
            />
            <small className="form-help">
              Información adicional sobre el pago (opcional)
            </small>
          </div>

          {/* Botones de acción */}
          <div className="form-actions">
            <button
              type="button"
              onClick={handleCancel}
              className="btn-cancel"
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="btn-save"
              disabled={loading}
            >
              {loading 
                ? (existingPayment ? 'Actualizando...' : 'Guardando...')
                : (existingPayment ? 'Actualizar Pago' : 'Guardar Pago')
              }
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default PaymentForm;