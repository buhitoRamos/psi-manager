import React, { useState } from 'react';
import '../App.css';
import './Login.css';
import { authCheck } from '../lib/supabaseRest';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [token, setToken] = useState(null);

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
  const token = `user-${result.user_id}-${Date.now()}`;
  setToken(token);
  localStorage.setItem('token', token);
    } catch (err) {
      setError(err.message || 'Error en el login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <form className="login-card" onSubmit={handleSubmit} aria-label="login-form">
        <h2>Iniciar sesión</h2>

        {token ? (
          <div className="login-success">
            <p>Autenticado correctamente.</p>
            <pre className="token">{token}</pre>
          </div>
        ) : (
          <>
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
          </>
        )}
      </form>
    </div>
  );
}

export default Login;
