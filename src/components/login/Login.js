import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import './Login.css';
import { authCheck } from '../../lib/supabaseRest';
import { supabase } from '../../lib/supabaseClient';
import { getAuthStatusByUserId } from '../../lib/authStatusRest';
import { AuthContext } from '../../App';

function Login() {
  const navigate = useNavigate();
  const { handleAuth } = useContext(AuthContext);
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [dni, setDni] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const validate = () => {
    if (isRegistering) {
      if (!email || !password || !firstName || !lastName || !dni) {
        setError('Por favor completa todos los campos.');
        return false;
      }
      if (email.length < 2) {
        setError('El usuario es muy corto.');
        return false;
      }
    } else {
      if (!email || !password) {
        setError('Por favor completa ambos campos.');
        return false;
      }
      if (email.length < 2) {
        setError('El usuario es muy corto.');
        return false;
      }
    }
    setError(null);
    return true;
  };

  const handleRegister = async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Check if DNI already exists
      const { data: existingUser, error: dniError } = await supabase
        .from('users')
        .select('id')
        .eq('dni', dni.trim())
        .single();

      if (dniError && dniError.code !== 'PGRST116') throw dniError;
      if (existingUser) {
        throw new Error('Este DNI ya tiene una cuenta gratis');
      }

      // 2. Create user
      const { data: newUser, error: userError } = await supabase
        .from('users')
        .insert([
          {
            user: email.trim(),
            pass: password,
            first_name: firstName.trim(),
            last_name: lastName.trim(),
            dni: dni.trim(),
            role: 'user',
          },
        ])
        .select()
        .single();

      if (userError) throw userError;

      // 3. Create auth_status as active
      const { error: statusError } = await supabase
        .from('auth_status')
        .insert([{ user_id: newUser.id, status: true }]);

      if (statusError) throw statusError;

      // 4. Log them in automatically
      const newToken = `user-${newUser.id}-${Date.now()}`;
      handleAuth(newToken);
      localStorage.setItem('user_role', 'user');
      localStorage.setItem('user_email', email);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Error al crear la cuenta');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    
    if (isRegistering) {
      await handleRegister();
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const username = (email || '').trim();
      const result = await authCheck(username, password);
      if (!result || !result.valid) throw new Error('Credenciales inválidas');
      const newToken = `user-${result.user_id}-${Date.now()}`;
      
      let userRole = 'user';
      try {
        const { data: userData } = await supabase
          .from('users')
          .select('role')
          .eq('id', result.user_id)
          .single();
        if (userData && userData.role) {
          userRole = userData.role;
        }
      } catch (roleErr) {
        console.warn('[Login] Could not fetch user role:', roleErr);
      }

      const authStatus = await getAuthStatusByUserId(result.user_id);
      if (authStatus && authStatus.status === false) {
        setError('Usuario desactivado. Contacte al administrador.');
        handleAuth(null);
        return;
      }
      if (!authStatus) {
        try {
          await supabase
            .from('auth_status')
            .insert([{ user_id: result.user_id, status: true }]);
        } catch (insertErr) {
          console.warn('[Login] Could not create auth_status row:', insertErr);
        }
      }
      handleAuth(newToken);
      localStorage.setItem('user_role', userRole || 'user');
      localStorage.setItem('user_email', email);
      if (userRole === 'admin') {
        navigate('/admin');
      } else {
        navigate('/dashboard');
      }
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
        
        <h2>{isRegistering ? 'Crear Cuenta' : 'Iniciar sesión'}</h2>

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

          {isRegistering && (
            <>
              <label>
                Nombre
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Nombre"
                />
              </label>
              <label>
                Apellido
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Apellido"
                />
              </label>
              <label>
                DNI
                <input
                  type="text"
                  value={dni}
                  onChange={(e) => setDni(e.target.value)}
                  placeholder="DNI"
                />
              </label>
            </>
          )}

          {error && <div className="login-error">{error}</div>}

          <button type="submit" className="login-btn" disabled={loading}>
            {loading ? 'Procesando...' : isRegistering ? 'Registrarse' : 'Entrar'}
          </button>

          <div className="login-footer">
            {isRegistering ? (
              <button 
                type="button" 
                className="login-toggle-btn" 
                onClick={() => { setIsRegistering(false); setError(null); }}
              >
                ¿Ya tenés cuenta? <strong>Iniciar sesión</strong>
              </button>
            ) : (
              <button 
                type="button" 
                className="login-toggle-btn" 
                onClick={() => { setIsRegistering(true); setError(null); }}
              >
                ¿No tenés cuenta? <strong>Crear cuenta gratis</strong>
              </button>
            )}
            <a
              className="login-support-link"
              href="https://wa.me/5491139050391?text=Hola%2C%20quiero%20soporte%20de%20Psi%20Manager"
              target="_blank"
              rel="noopener noreferrer"
            >
              📱 Soporte Técnico
            </a>
          </div>
        </div>
      </form>
    </div>
  );
}

export default Login;
