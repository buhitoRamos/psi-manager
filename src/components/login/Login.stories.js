import React from 'react';
import toast from 'react-hot-toast';
import './Login.css';

// Componente Login simplificado para Storybook
const SimpleLogin = () => {
  const handleSubmit = (e) => {
    e.preventDefault();
    toast.success('Demo de Storybook - Login funcional!');
  };

  return (
    <div className="login-page">
      <form className="login-card" onSubmit={handleSubmit}>
        <h2 className="login-title">
          Psi Manager
          <img src="/logo.svg" alt="Psi" style={{ width: '24px', height: '24px' }} />
        </h2>
        <h2>Iniciar sesión</h2>
        <div className="login-form-content">
          <label>
            Usuario
            <input
              type="text"
              placeholder="usuario"
              defaultValue="admin"
              autoComplete="username"
            />
          </label>
          <label>
            Contraseña
            <input
              type="password"
              placeholder="********"
              defaultValue="admin"
              autoComplete="current-password"
            />
          </label>
          <button type="submit" className="login-btn">
            Entrar
          </button>
        </div>
      </form>
    </div>
  );
};

export default {
  title: 'Components/Login',
  parameters: {
    layout: 'fullscreen',
    backgrounds: {
      default: 'gradient',
      values: [
        {
          name: 'gradient',
          value: 'linear-gradient(180deg,#f6f8fb,#e9eef8)',
        },
      ],
    },
  },
};

// Stories
export const Default = () => (
  <div style={{ 
    minHeight: '100vh', 
    background: 'linear-gradient(180deg,#f6f8fb,#e9eef8)', 
    display: 'flex', 
    alignItems: 'center', 
    justifyContent: 'center',
    padding: '24px'
  }}>
    <SimpleLogin />
  </div>
);

export const WithCredentials = () => (
  <div style={{ 
    minHeight: '100vh', 
    background: 'linear-gradient(180deg,#f6f8fb,#e9eef8)', 
    display: 'flex', 
    alignItems: 'center', 
    justifyContent: 'center',
    padding: '24px'
  }}>
    <div>
      <div style={{ 
        position: 'absolute', 
        top: '10px', 
        left: '10px', 
        background: 'rgba(0,0,0,0.8)', 
        color: 'white', 
        padding: '10px', 
        borderRadius: '5px',
        zIndex: 1000,
        fontSize: '12px'
      }}>
        <strong>Credenciales precargadas:</strong><br />
        admin / admin - ¡Haz clic en Entrar!
      </div>
      <SimpleLogin />
    </div>
  </div>
);

export const WithError = () => (
  <div style={{ 
    minHeight: '100vh', 
    background: 'linear-gradient(180deg,#f6f8fb,#e9eef8)', 
    display: 'flex', 
    alignItems: 'center', 
    justifyContent: 'center',
    padding: '24px'
  }}>
    <div className="login-page">
      <form className="login-card" onSubmit={(e) => e.preventDefault()}>
        <h2 className="login-title">
          Psi Manager
          <img src="/logo.svg" alt="Psi" style={{ width: '24px', height: '24px' }} />
        </h2>
        <h2>Iniciar sesión</h2>
        <div className="login-form-content">
          <label>
            Usuario
            <input
              type="text"
              placeholder="usuario"
              defaultValue="usuario_incorrecto"
              autoComplete="username"
            />
          </label>
          <label>
            Contraseña
            <input
              type="password"
              placeholder="********"
              defaultValue="contraseña_incorrecta"
              autoComplete="current-password"
            />
          </label>
          <div className="login-error">Credenciales inválidas</div>
          <button type="submit" className="login-btn">
            Entrar
          </button>
        </div>
      </form>
    </div>
  </div>
);