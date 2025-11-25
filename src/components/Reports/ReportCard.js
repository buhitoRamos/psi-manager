import React, { useState } from 'react';


import supabaseRest from '../../lib/supabaseRest';

function ReportCard({ report, onUpdate }) {
  const [expanded, setExpanded] = useState(false);
  const [edit, setEdit] = useState(false);
  const [form, setForm] = useState({ ...report });
  const [localReport, setLocalReport] = useState({ ...report });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await onUpdate({ ...form, id: report.id });
      setLocalReport({ ...localReport, ...form });
      setEdit(false);
    } catch (err) {
      setError('Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ border: '1px solid #ccc', borderRadius: 8, margin: '12px 0', padding: 16, background: '#f9f9f9' }}>
      <div style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }} onClick={() => setExpanded((v) => !v)}>
        <span style={{ fontWeight: 600, fontSize: 18, marginRight: 8 }}>
          {localReport.patient?.name || ''} {localReport.patient?.last_name || ''}
        </span>
        <span style={{ color: '#888', fontSize: 13 }}>
          {localReport.created_at?.slice(0, 10)}
        </span>
        <span style={{ marginLeft: 'auto', color: '#10B981', fontWeight: 700 }}>
          {expanded ? '▲' : '▼'}
        </span>
      </div>
      {expanded && (
        <div style={{ marginTop: 12 }}>
          {edit ? (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <input name="dx_presumptive" value={form.dx_presumptive || ''} onChange={handleChange} placeholder="DX Presuntivo" />
                <input name="dx_psychiatric" value={form.dx_psychiatric || ''} onChange={handleChange} placeholder="DX Psiquiátrico" />
                <textarea name="dx_semesterly" value={form.dx_semesterly || ''} onChange={handleChange} placeholder="DX Semestral" rows={3} style={{resize:'vertical'}} />
                <textarea name="dx_annual" value={form.dx_annual || ''} onChange={handleChange} placeholder="DX Anual" rows={3} style={{resize:'vertical'}} />
                <textarea name="medication" value={form.medication || ''} onChange={handleChange} placeholder="Medicación" />
              </div>
              <button onClick={handleSave} style={{ marginTop: 8 }} disabled={saving}>{saving ? 'Guardando...' : 'Guardar'}</button>
              <button onClick={() => { setEdit(false); setForm({ ...report }); }} style={{ marginLeft: 8 }} disabled={saving}>Cancelar</button>
              {error && <div style={{ color: 'red', marginTop: 8 }}>{error}</div>}
            </>
          ) : (
            <>
              <div><b>Presuntivo:</b> {localReport.dx_presumptive}</div>
              <div><b>Psiquiátrico:</b> {localReport.dx_psychiatric}</div>
              <div><b>Semestral:</b> {localReport.dx_semesterly}</div>
              <div><b>Anual:</b> {localReport.dx_annual}</div>
              <div><b>Medicación:</b> {localReport.medication}</div>
              <button onClick={() => setEdit(true)} style={{ marginTop: 8 }}>Editar</button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default ReportCard;
