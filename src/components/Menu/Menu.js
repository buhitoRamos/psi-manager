import React, { useState } from 'react';
import './Menu.css';

function Menu({ onLogout, onNavigateToTurnos, onNavigateToPatients, onNavigateToPayments, onOpenGoogleCalendarSettings, onNavigateToReports, onNavigateToEarnings, onChangePassword }) {
  const [isOpen, setIsOpen] = useState(false);
  
  console.log('Menu component rendered'); // Debug log

  const toggleMenu = () => {
    console.log('Toggle menu clicked, isOpen:', !isOpen); // Debug log
    setIsOpen(!isOpen);
  };

  const handleLogout = () => {
    console.log('Logout clicked'); // Debug log
    setIsOpen(false);
    onLogout();
  };

  const handleTurnos = () => {
    console.log('Turnos clicked'); // Debug log
    setIsOpen(false);
    if (onNavigateToTurnos) {
      onNavigateToTurnos();
    }
  };

  const handlePatients = () => {
    console.log('Pacientes clicked'); // Debug log
    setIsOpen(false);
    if (onNavigateToPatients) {
      onNavigateToPatients();
    }
  };

  const handlePayments = () => {
    console.log('Pagos clicked'); // Debug log
    setIsOpen(false);
    if (onNavigateToPayments) {
      onNavigateToPayments();
    }
  };

  const handleReports = () => {
    setIsOpen(false);
    if (onNavigateToReports) {
      onNavigateToReports();
    }
  };

  const handleEarnings = () => {
    setIsOpen(false);
    if (onNavigateToEarnings) {
      onNavigateToEarnings();
      return;
    }
    if (window && window.location) {
      window.history.pushState({}, '', '/earnings');
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  };

  return (
    <div className="menu-container">
      {/* Botón hamburguesa */}
      <button 
        className={`hamburger-button ${isOpen ? 'open' : ''}`}
        onClick={toggleMenu}
        aria-label="Menu"
        style={{ border: '1px solid #ccc' }} // Debug: borde temporal para visibilidad
      >
        <span className="hamburger-line"></span>
        <span className="hamburger-line"></span>
        <span className="hamburger-line"></span>
      </button>

      {/* Overlay para cerrar menu al hacer click fuera */}
      {isOpen && (
        <div className="menu-overlay" onClick={() => setIsOpen(false)}></div>
      )}

      {/* Menu desplegable */}
      <div className={`menu-dropdown ${isOpen ? 'open' : ''}`}>
        <nav className="menu-nav">
          <button className="menu-item" onClick={handlePatients}>
            <span className="menu-icon">👥</span>
            Pacientes
          </button>
          <button className="menu-item" onClick={handleTurnos}>
            <span className="menu-icon">📅</span>
            Turnos
          </button>
          <button className="menu-item" onClick={handlePayments}>
            <span className="menu-icon">💰</span>
            Pagos
          </button>
          <button className="menu-item" onClick={handleReports}>
            <span className="menu-icon">📈</span>
            Informes
          </button>
          <button className="menu-item" onClick={handleEarnings}>
            <span className="menu-icon">💹</span>
            Ganancias
          </button>
          <button className="menu-item" onClick={() => { setIsOpen(false); if (onOpenGoogleCalendarSettings) onOpenGoogleCalendarSettings(); }}>
            <span className="menu-icon">🗓️</span>
            Google Calendar
          </button>
          <button className="menu-item" onClick={() => { setIsOpen(false); if (onChangePassword) onChangePassword(); }}>
            <span className="menu-icon">🔑</span>
            Cambiar Clave
          </button>
          <a
            className="menu-item"
            href="https://wa.me/5491139050391?text=Hola%2C%20necesito%20soporte%20con%20Psi%20Manager"
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setIsOpen(false)}
          >
            <span className="menu-icon">💬</span>
            Soporte
          </a>
          <button className="menu-item logout" onClick={handleLogout}>
            <span className="menu-icon">🚪</span>
            Cerrar Sesión
          </button>
        </nav>
      </div>
    </div>
  );
}

export default Menu;