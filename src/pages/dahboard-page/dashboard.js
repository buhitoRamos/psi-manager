import React, { useContext, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./dashboard.css";
import { AuthContext } from "../../App";
import Patients from "../../components/patients-board/patients";
import Appointments from "../../components/Appointments/Appointments";
import Menu from "../../components/Menu/Menu";

const Dashboard = () => {
  const navigate = useNavigate();
  const { handleAuth } = useContext(AuthContext);
  const [currentSection, setCurrentSection] = useState('patients');

  const handleLogout = () => {
    handleAuth(null);
    navigate('/login');
  };

  const handleNavigateToTurnos = () => {
    setCurrentSection('turnos');
  };

  const handleNavigateToPatients = () => {
    setCurrentSection('patients');
  };

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div className="dashboard-title" onClick={handleNavigateToPatients} style={{ cursor: 'pointer' }}>
          <img src="/logo.svg" alt="Psi" className="dashboard-logo" />
          <div className="title-content">
            <span className="main-title">Dashboard</span>
            {currentSection === 'turnos' && <span className="section-indicator">- Turnos</span>}
            {currentSection === 'patients' && <span className="section-indicator">- Pacientes</span>}
          </div>
        </div>
        <Menu 
          onLogout={handleLogout} 
          onNavigateToTurnos={handleNavigateToTurnos}
          onNavigateToPatients={handleNavigateToPatients}
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
      </main>
    </div>
  );
};

export default Dashboard;
