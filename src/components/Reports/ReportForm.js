import React, { useState, useEffect, useContext } from 'react';
import toast from 'react-hot-toast';
import supabaseRest from '../../lib/supabaseRest';
import { AuthContext } from '../../App';

const initialForm = {
  dx_presumptive: '',
  dx_psychiatric: '',
  dx_semesterly: '',
  dx_annual: '',
  patient_id: '',
  medication: '',
};


function ReportForm({ onSubmit }) {
  const [form, setForm] = useState(initialForm);
  const { token, isAuthenticated } = useContext(AuthContext);
  const [userId, setUserId] = useState(null);
    // Extraer userId del token (igual que en Appointments)
    function extractUserIdFromToken(token) {
      if (!token) return null;
      const parts = token.split('-');
      if (parts.length >= 2 && parts[0] === 'user') {
        const userId = parseInt(parts[1], 10);
        return isNaN(userId) ? null : userId;
      }
      return null;
    }

    // Setear userId automáticamente al montar o cuando cambie el token
    useEffect(() => {
      if (isAuthenticated && token) {
        const extractedUserId = extractUserIdFromToken(token);
        setUserId(extractedUserId);
      }
    }, [isAuthenticated, token]);
  const [patientsList, setPatientsList] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);

  function extractUserIdFromToken(token) {
  if (!token) return null;
  
  const parts = token.split('-');
  if (parts.length >= 2 && parts[0] === 'user') {
    const userId = parseInt(parts[1], 10);
    return isNaN(userId) ? null : userId;
  }
  return null;
}

  // Cargar pacientes para el selector al tener userId
  useEffect(() => {
    async function loadPatients() {
      if (!userId) return;
      try {
        const patients = await supabaseRest.getPatientsByUserId(userId);
        setPatientsList(Array.isArray(patients) ? patients : []);
      } catch (err) {
        toast.error('No se pudieron cargar los pacientes');
        setPatientsList([]);
      }
    }
    loadPatients();
  }, [userId]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handlePatientChange = (e) => {
    const patientId = e.target.value;
    setForm((prev) => ({ ...prev, patient_id: patientId }));
    const patient = patientsList.find((p) => String(p.id) === String(patientId));
    setSelectedPatient(patient || null);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(form);
    setForm(initialForm);
    setSelectedPatient(null);
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <label>
        Paciente:
        <select name="patient_id" value={form.patient_id} onChange={handlePatientChange} required>
          <option value="">Seleccionar paciente...</option>
          {patientsList.map((p) => (
            <option key={p.id} value={p.id}>{p.name} {p.last_name}</option>
          ))}
        </select>
      </label>
      {selectedPatient && (
        <div style={{ color: '#555', fontSize: 14, marginBottom: 4 }}>
          <b>Paciente seleccionado:</b> {selectedPatient.name} {selectedPatient.last_name}
        </div>
      )}
      <input name="dx_presumptive" placeholder="DX Presuntivo" value={form.dx_presumptive} onChange={handleChange} />
      <input name="dx_psychiatric" placeholder="DX Psiquiátrico" value={form.dx_psychiatric} onChange={handleChange} />
      <textarea name="dx_semesterly" placeholder="DX Semestral" value={form.dx_semesterly} onChange={handleChange} rows={3} style={{resize:'vertical'}} />
      <textarea name="dx_annual" placeholder="DX Anual" value={form.dx_annual} onChange={handleChange} rows={3} style={{resize:'vertical'}} />
      <textarea name="medication" placeholder="Medicación" value={form.medication} onChange={handleChange} />
      <button type="submit">Cargar informe</button>
    </form>
  );
}

export default ReportForm;
