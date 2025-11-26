import React, { useState } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import './Reports.css';
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
    <div className="report-card">
      <div className="report-card-header" onClick={() => setExpanded((v) => !v)}>
        <span className="report-card-title">
          {localReport.patient?.name || ''} {localReport.patient?.last_name || ''}
        </span>
        <span className="report-card-date">
          {localReport.created_at?.slice(0, 10)}
        </span>
        <span className="report-card-arrow">
          {expanded ? '\u25b2' : '\u25bc'}
        </span>
      </div>
      {expanded && (
        <div className="report-card-content" style={{ background: '#f5f7fa', borderRadius: 8, padding: 16 }}>
          {edit ? (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <input name="dx_presumptive" value={form.dx_presumptive || ''} onChange={handleChange} placeholder="DX Presuntivo" />
                <input name="dx_psychiatric" value={form.dx_psychiatric || ''} onChange={handleChange} placeholder="DX Psiquiátrico" />
                <div style={{ textAlign: 'center', marginTop: 12 }}>
                  <label style={{ display: 'block', fontWeight: 500, marginBottom: 4 }}>DX Semestral:</label>
                  <br />
                  <ReactQuill
                    value={form.dx_semesterly || ''}
                    onChange={value => setForm(prev => ({ ...prev, dx_semesterly: value }))}
                    theme="snow"
                  />
                </div>
                <div style={{ textAlign: 'center', marginTop: 12 }}>
                  <label style={{ display: 'block', fontWeight: 500, marginBottom: 4 }}>DX Anual:</label>
                  <br />
                  <ReactQuill
                    value={form.dx_annual || ''}
                    onChange={value => setForm(prev => ({ ...prev, dx_annual: value }))}
                    theme="snow"
                  />
                </div>
                <div style={{ textAlign: 'center', marginTop: 12 }}>
                  <label style={{ display: 'block', fontWeight: 500, marginBottom: 4 }}>Medicación:</label>
                  <br />
                  <ReactQuill
                    value={form.medication || ''}
                    onChange={value => setForm(prev => ({ ...prev, medication: value }))}
                    theme="snow"
                  />
                </div>
              </div>
              <button className="report-card-edit-btn" onClick={handleSave} style={{ marginTop: 8 }} disabled={saving}>{saving ? 'Guardando...' : 'Guardar'}</button>
              <button className="report-card-edit-btn" onClick={() => { setEdit(false); setForm({ ...report }); }} style={{ marginLeft: 8 }} disabled={saving}>Cancelar</button>
              {error && <div style={{ color: 'red', marginTop: 8 }}>{error}</div>}
            </>
          ) : (
            <>
              {localReport.dx_presumptive && (
                <div className="report-card-segment">
                  <span className="report-card-label">Presuntivo:</span>
                  <span className="report-card-value">{localReport.dx_presumptive}</span>
                </div>
              )}
              {localReport.dx_psychiatric && (
                <div className="report-card-segment">
                  <span className="report-card-label">Psiquiátrico:</span>
                  <span className="report-card-value">{localReport.dx_psychiatric}</span>
                </div>
              )}
              {localReport.dx_semesterly && (
                <div className="report-card-segment">
                  <span className="report-card-label">Semestral:</span>
                  <span className="report-card-value" dangerouslySetInnerHTML={{ __html: localReport.dx_semesterly }} />
                </div>
              )}
              {localReport.dx_annual && (
                <div className="report-card-segment">
                  <span className="report-card-label">Anual:</span>
                  <span className="report-card-value" dangerouslySetInnerHTML={{ __html: localReport.dx_annual }} />
                </div>
              )}
              {localReport.medication && (
                <div className="report-card-segment">
                  <span className="report-card-label">Medicación:</span>
                  <span className="report-card-value" dangerouslySetInnerHTML={{ __html: localReport.medication }} />
                </div>
              )}
              <button className="report-card-edit-btn" onClick={() => setEdit(true)} style={{ marginTop: 8 }}>Editar</button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default ReportCard;
