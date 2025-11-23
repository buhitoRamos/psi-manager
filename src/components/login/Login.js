import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import './Login.css';
import { authCheck } from '../../lib/supabaseRest';
import { getAuthStatusByUserId } from '../../lib/authStatusRest';
import { AuthContext } from '../../App';

function Login() {
  const navigate = useNavigate();
  const { handleAuth } = useContext(AuthContext);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const validate = () => {
    if (!email || !password) {
      setError('Por favor completa ambos campos.');
      return false;
    }
    // Here 'email' field is used as username — no email format validation.
    if (email.length < 2) {
      setError('El usuario es muy corto.');
      return false;
    }
    setError(null);
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    setError(null);
    try {
      // Query the users table via REST helper
      const username = (email || '').trim();
      // Use RPC auth_check to validate credentials without exposing pass column
      const result = await authCheck(username, password);
      // eslint-disable-next-line no-console
      console.debug('[Login] authCheck result:', result);
      if (!result || !result.valid) throw new Error('Credenciales inválidas');
      const newToken = `user-${result.user_id}-${Date.now()}`;
      // Verificar estado en auth_status antes de continuar
      const authStatus = await getAuthStatusByUserId(result.user_id);
      if (authStatus && authStatus.status === false) {
        setError('Usuario desactivado. Contacte al administrador.');
        // Borra el token si existe
        handleAuth(null);
        return;
      }
      handleAuth(newToken);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Error en el login');
    } finally {
      setLoading(false);
    }
  };

  const renderTitle = () => (
    <h2 className="login-title">
      Psi Manager
      <img src="/logo.svg" alt="Psi" />
    </h2>
  );

  return (
    <div className="login-page">
      <form className="login-card" onSubmit={handleSubmit} aria-label="login-form">
        {renderTitle()}
        
        <h2>Iniciar sesión</h2>

        <div className="login-form-content">
          <label>
            Usuario
            <input
              type="text"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="usuario"
              autoComplete="username"
            />
          </label>

          <label>
            Contraseña
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="********"
              autoComplete="current-password"
            />
          </label>

          {error && <div className="login-error">{error}</div>}

          <button type="submit" className="login-btn" disabled={loading}>
            {loading ? 'Ingresando...' : 'Entrar'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default Login;
