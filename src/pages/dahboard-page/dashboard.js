import React, { useContext, useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import "./dashboard.css";
import { AuthContext } from "../../App";
import Patients from "../../components/patients-board/patients";
import Appointments from "../../components/Appointments/Appointments";
import Payments from "../../components/Payments/Payments";
import Reports from "../../components/Reports/Reports";
import Earnings from "../../components/Earnings/Earnings";
import Menu from "../../components/Menu/Menu";
import GoogleCalendarSettings from "../../components/GoogleCalendarSettings/GoogleCalendarSettings";
import ChangePassword from "../../components/ChangePassword/ChangePassword";
import { getAuthStatusByUserId } from '../../lib/authStatusRest';



const Dashboard = () => {
  const navigate = useNavigate();
  const { handleAuth } = useContext(AuthContext);
  const [currentSection, setCurrentSection] = useState('patients');
  const [showGoogleCalendarSettings, setShowGoogleCalendarSettings] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);

  // Redirigir al admin dashboard si el usuario tiene role admin
  useEffect(() => {
    const userRole = localStorage.getItem('user_role');
    if (userRole === 'admin') {
      navigate('/admin', { replace: true });
    }
  }, [navigate]);

  const handleLogout = useCallback(() => {
    handleAuth(null);
    navigate('/login');
  }, [handleAuth, navigate]);

  const handleNavigateToTurnos = () => {
    setCurrentSection('turnos');
  };

  const handleNavigateToPatients = () => {
    setCurrentSection('patients');
  };

  const handleNavigateToPayments = () => {
    setCurrentSection('pagos');
  };
  const handleNavigateToReports = () => {
    setCurrentSection('reports');
  }

  const handleNavigateToEarnings = () => {
    setCurrentSection('earnings');
  }

useEffect(() => {
  const token = localStorage.getItem('token');
  let userId = null;
  if (token) {
    const match = token.match(/^user-(\d+)-/);
    if (match) {
      userId = match[1];
    }
  }
  if (userId) {
    getAuthStatusByUserId(userId).then((result) => {
      // Si el status es false, desloguea inmediatamente
      if (result && result.status === false) {
        handleLogout();
      }
    }).catch((err) => {
      console.error('[Dashboard] Error checking auth status:', err);
    });
  }
  // eslint-disable-next-line
}, [handleLogout]);

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div className="dashboard-title" onClick={handleNavigateToPatients} style={{ cursor: 'pointer' }}>
          <img src="/logo.svg" alt="Psi" className="dashboard-logo" />
          <div className="title-content">
            <span className="main-title">Dashboard</span>
            {currentSection === 'turnos' && <span className="section-indicator">- Turnos</span>}
            {currentSection === 'patients' && <span className="section-indicator">- Pacientes</span>}
            {currentSection === 'pagos' && <span className="section-indicator">- Pagos</span>}
            {currentSection === 'reports' && <span className="section-indicator">- Informes</span>}
          </div>
        </div>
        <Menu 
          onLogout={handleLogout} 
          onNavigateToReports={handleNavigateToReports}
          onNavigateToEarnings={handleNavigateToEarnings}
          onNavigateToTurnos={handleNavigateToTurnos}
          onNavigateToPatients={handleNavigateToPatients}
          onNavigateToPayments={handleNavigateToPayments}
          onOpenGoogleCalendarSettings={() => setShowGoogleCalendarSettings(true)}
          onChangePassword={() => setShowChangePassword(true)}
        />
      </header>
      <main className="dashboard-content">
        {currentSection === 'patients' && (
          <section className="patients-section">
            <Patients />
          </section>
        )}
        {currentSection === 'turnos' && (
          <section className="appointments-section">
            <Appointments />
          </section>
        )}
        {currentSection === 'pagos' && (
          <section className="payments-section">
            <Payments />
          </section>
        )}
        {currentSection === 'reports' && (
          <section className="reports-section">
            <Reports />
          </section>
        )}
        {currentSection === 'earnings' && (
          <section className="earnings-section">
            <Earnings />
          </section>
        )}
      </main>
      {showGoogleCalendarSettings && (
        <GoogleCalendarSettings isOpen={showGoogleCalendarSettings} onClose={() => setShowGoogleCalendarSettings(false)} />
      )}
      {showChangePassword && (
        <ChangePassword onClose={() => setShowChangePassword(false)} />
      )}
    </div>
  );
};

export default Dashboard;
