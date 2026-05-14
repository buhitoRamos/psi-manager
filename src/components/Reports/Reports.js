
import React, { useState, useEffect, useContext } from 'react';
import ReportForm from './ReportForm';
import ReportCard from './ReportCard';
import supabaseRest from '../../lib/supabaseRest';
import { AuthContext } from '../../App';
import ConfirmModal from '../ConfirmModal/ConfirmModal';
import toast from 'react-hot-toast';
import './Reports.css';

function Reports() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('view'); // 'view' | 'generate'
  const { token } = useContext(AuthContext);
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, reportId: null });

  // Extraer userId del token
  function extractUserIdFromToken(tkn) {
    if (!tkn) return null;
    const parts = tkn.split('-');
    if (parts.length >= 2 && parts[0] === 'user') {
      const id = parseInt(parts[1], 10);
      return isNaN(id) ? null : id;
    }
    return null;
  }

  const userId = extractUserIdFromToken(token);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabaseRest.getProgressReports(userId);
      if (error) throw error;
      setReports(data || []);
    } catch (err) {
      setReports([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (tab === 'view') fetchReports();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

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

  const handleDeleteReport = (reportId) => {
    setDeleteModal({ isOpen: true, reportId });
  };

  const confirmDeleteReport = async () => {
    try {
      await supabaseRest.deleteProgressReport(deleteModal.reportId);
      toast.success('Informe eliminado correctamente');
      fetchReports();
    } catch (err) {
      toast.error('Error al eliminar el informe');
    } finally {
      setDeleteModal({ isOpen: false, reportId: null });
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
            <ReportCard key={r.id} report={r} onUpdate={handleUpdateReport} onDelete={handleDeleteReport} />
          ))}
        </div>
      ))}
      <ConfirmModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, reportId: null })}
        onConfirm={confirmDeleteReport}
        title="Eliminar informe"
        message="¿Estás seguro de que querés eliminar este informe? Esta acción no se puede deshacer."
        confirmText="Eliminar"
        cancelText="Cancelar"
        type="danger"
      />
    </div>
  );
}

export default Reports;
