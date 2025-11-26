
import React, { useState, useEffect } from 'react';
import ReportForm from './ReportForm';
import ReportCard from './ReportCard';
import supabaseRest from '../../lib/supabaseRest';
import './Reports.css';

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
    <div className="reports-container">
      <h2 className="reports-title">Informes de Progreso</h2>
      <div className="reports-tabs">
        <button
          className={tab === 'view' ? 'active' : ''}
          onClick={() => setTab('view')}
        >
          Ver informes
        </button>
        <button
          className={tab === 'generate' ? 'active' : ''}
          onClick={() => setTab('generate')}
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
