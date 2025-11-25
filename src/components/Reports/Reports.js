
import React, { useState, useEffect } from 'react';
import ReportForm from './ReportForm';
import ReportCard from './ReportCard';
import supabaseRest from '../../lib/supabaseRest';

function Reports() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('view'); // 'view' | 'generate'

  useEffect(() => {
    if (tab === 'view') fetchReports();
  }, [tab]);


  const fetchReports = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabaseRest.getProgressReports();
      if (error) throw error;
      setReports(data || []);
    } catch (err) {
      setReports([]);
    } finally {
      setLoading(false);
    }
  };

  // Update a report and refresh the list
  const handleUpdateReport = async (updated) => {
    try {
      await supabaseRest.updateProgressReport(updated.id, {
        dx_presumptive: updated.dx_presumptive,
        dx_psychiatric: updated.dx_psychiatric,
        dx_semesterly: updated.dx_semesterly,
        dx_annual: updated.dx_annual,
        medication: updated.medication
      });
      fetchReports();
    } catch (err) {
      // Optionally show error feedback
    }
  };

  const handleSubmit = async (form) => {
    try {
      await supabaseRest.insertProgressReport(form);
      setTab('view'); // Cambia a la vista de informes después de generar
    } catch (err) {
      // Manejar error
    }
  };

  return (
    <div style={{ padding: 24 }}>
      <h2>Informes de Progreso</h2>
      <div style={{ display: 'flex', gap: 16, marginBottom: 24 }}>
        <button
          onClick={() => setTab('view')}
          style={{
            padding: '8px 16px',
            borderRadius: 6,
            border: tab === 'view' ? '2px solid #10B981' : '1px solid #ccc',
            background: tab === 'view' ? '#e6f9f2' : '#fff',
            fontWeight: tab === 'view' ? 'bold' : 'normal',
            cursor: 'pointer',
          }}
        >
          Ver informes
        </button>
        <button
          onClick={() => setTab('generate')}
          style={{
            padding: '8px 16px',
            borderRadius: 6,
            border: tab === 'generate' ? '2px solid #10B981' : '1px solid #ccc',
            background: tab === 'generate' ? '#e6f9f2' : '#fff',
            fontWeight: tab === 'generate' ? 'bold' : 'normal',
            cursor: 'pointer',
          }}
        >
          Generar informe
        </button>
      </div>
      {tab === 'generate' && <ReportForm onSubmit={handleSubmit} />}
      {tab === 'view' && (loading ? <div>Cargando...</div> : (
        <div>
          {reports.map((r) => (
            <ReportCard key={r.id} report={r} onUpdate={handleUpdateReport} />
          ))}
        </div>
      ))}
    </div>
  );
}

export default Reports;
