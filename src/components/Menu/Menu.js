import React, { useState } from 'react';
import './Menu.css';

function Menu({ onLogout }) {
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
    // TODO: Implementar navegación a turnos
    console.log('Ir a turnos');
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
          <button className="menu-item" onClick={handleTurnos}>
            <span className="menu-icon">📅</span>
            Turnos
          </button>
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