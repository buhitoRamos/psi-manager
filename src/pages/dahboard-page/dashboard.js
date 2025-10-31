import React, { useContext } from "react";
import { useNavigate } from "react-router-dom";
import "../../styles/Dashboard.css";
import { AuthContext } from "../../App";

const Dashboard = () => {
  const navigate = useNavigate();
  const { handleAuth } = useContext(AuthContext);

  const handleLogout = () => {
    handleAuth(null);
    navigate('/login');
  };

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <h1>
          <img src="/logo.svg" alt="Psi" className="dashboard-logo" />
          Dashboard
        </h1>
        <button onClick={handleLogout} className="logout-button">
          Cerrar Sesión
        </button>
      </header>
      <main className="dashboard-content">
        <h2>Bienvenido al Panel de Control</h2>
        {/* Aquí irá el contenido del dashboard */}
      </main>
    </div>
  );
};

export default Dashboard;
