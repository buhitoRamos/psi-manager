import React, { useState } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';


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
                <label>DX Semestral:</label>
                <ReactQuill
                  value={form.dx_semesterly || ''}
                  onChange={value => setForm(prev => ({ ...prev, dx_semesterly: value }))}
                  theme="snow"
                  style={{ marginBottom: 8 }}
                />
                <label>DX Anual:</label>
                <ReactQuill
                  value={form.dx_annual || ''}
                  onChange={value => setForm(prev => ({ ...prev, dx_annual: value }))}
                  theme="snow"
                  style={{ marginBottom: 8 }}
                />
                <label>Medicación:</label>
                <ReactQuill
                  value={form.medication || ''}
                  onChange={value => setForm(prev => ({ ...prev, medication: value }))}
                  theme="snow"
                  style={{ marginBottom: 8 }}
                />
              </div>
              <button onClick={handleSave} style={{ marginTop: 8 }} disabled={saving}>{saving ? 'Guardando...' : 'Guardar'}</button>
              <button onClick={() => { setEdit(false); setForm({ ...report }); }} style={{ marginLeft: 8 }} disabled={saving}>Cancelar</button>
              {error && <div style={{ color: 'red', marginTop: 8 }}>{error}</div>}
            </>
          ) : (
            <>
              {localReport.dx_presumptive && (
                <div><b>Presuntivo:</b> {localReport.dx_presumptive}</div>
              )}
              {localReport.dx_psychiatric && (
                <div><b>Psiquiátrico:</b> {localReport.dx_psychiatric}</div>
              )}
              {localReport.dx_semesterly && (
                <div>
                  <b>Semestral:</b>
                  <div style={{border: '1px solid #eee', borderRadius: 4, padding: 6, margin: '4px 0', background: '#fafafa'}}
                    dangerouslySetInnerHTML={{ __html: localReport.dx_semesterly }} />
                </div>
              )}
              {localReport.dx_annual && (
                <div>
                  <b>Anual:</b>
                  <div style={{border: '1px solid #eee', borderRadius: 4, padding: 6, margin: '4px 0', background: '#fafafa'}}
                    dangerouslySetInnerHTML={{ __html: localReport.dx_annual }} />
                </div>
              )}
              {localReport.medication && (
                <div>
                  <b>Medicación:</b>
                  <div style={{border: '1px solid #eee', borderRadius: 4, padding: 6, margin: '4px 0', background: '#fafafa'}}
                    dangerouslySetInnerHTML={{ __html: localReport.medication }} />
                </div>
              )}
              <button onClick={() => setEdit(true)} style={{ marginTop: 8 }}>Editar</button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default ReportCard;
