import React, { useState, useEffect } from 'react';
import './AppointmentForm.css';

function AppointmentForm({ isOpen, onClose, onSave, patient, existingAppointment = null }) {
  const [formData, setFormData] = useState({
    patient_id: patient?.id || '',
    date: '',
    frequency: 'unica',
    observation: '',
    status: 'en_espera',
    amount: ''
  });

  const [loading, setLoading] = useState(false);

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

  const handleChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.date || !formData.amount) {
      alert('Por favor complete los campos obligatorios (fecha y honorarios)');
      return;
    }

    setLoading(true);
    try {
      // Preparar datos para enviar
      const appointmentData = {
        ...formData,
        patient_id: patient.id,
        amount: parseFloat(formData.amount),
        date: new Date(formData.date).toISOString()
      };

      await onSave(appointmentData);
      onClose();
    } catch (error) {
      console.error('Error saving appointment:', error);
      alert('Error al guardar el turno');
    } finally {
      setLoading(false);
    }
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
    </div>
  );
}

export default AppointmentForm;