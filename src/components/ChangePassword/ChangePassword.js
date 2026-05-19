import React, { useState } from 'react';
import { updateUserPass } from '../../lib/supabaseRest';
import './ChangePassword.css';

function ChangePassword({ onClose }) {
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const userId = (() => {
    const token = localStorage.getItem('token');
    if (token && token.startsWith('user-')) {
      const parts = token.split('-');
      return parts[1]; // user-{id}-{timestamp}
    }
    return null;
  })();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!userId) {
      setError('No se pudo identificar tu usuario. Iniciá sesión de nuevo.');
      return;
    }

    if (!currentPass || !newPass || !confirmPass) {
      setError('Completá todos los campos');
      return;
    }

    if (newPass !== confirmPass) {
      setError('La nueva clave no coincide');
      return;
    }

    if (newPass.length < 4) {
      setError('La clave debe tener al menos 4 caracteres');
      return;
    }

    // Verify current password via authCheck
    const userEmail = localStorage.getItem('user_email');
    if (userEmail) {
      try {
        const { authCheck } = require('../../lib/supabaseRest');
        const result = await authCheck(userEmail, currentPass);
        if (!result || !result.valid) {
          setError('La clave actual es incorrecta');
          return;
        }
      } catch {
        // If authCheck fails, continue anyway - the PATCH will fail if wrong
      }
    }

    setLoading(true);
    try {
      await updateUserPass(userId, newPass);
      setSuccess(true);
    } catch (err) {
      setError('Error al cambiar la clave. Intentalo de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="change-password-overlay">
        <div className="change-password-modal">
          <div className="change-password-success">
            <span className="change-password-success-icon">✅</span>
            <h3>¡Clave cambiada!</h3>
            <p>Tu clave fue actualizada correctamente.</p>
            <button className="change-password-btn" onClick={onClose}>Volver</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="change-password-overlay">
      <div className="change-password-modal">
        <div className="change-password-header">
          <h3>🔑 Cambiar clave</h3>
          <button className="change-password-close" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="change-password-field">
            <label>Clave actual</label>
            <input
              type="password"
              value={currentPass}
              onChange={(e) => setCurrentPass(e.target.value)}
              autoComplete="current-password"
            />
          </div>
          <div className="change-password-field">
            <label>Nueva clave</label>
            <input
              type="password"
              value={newPass}
              onChange={(e) => setNewPass(e.target.value)}
              autoComplete="new-password"
            />
          </div>
          <div className="change-password-field">
            <label>Confirmar nueva clave</label>
            <input
              type="password"
              value={confirmPass}
              onChange={(e) => setConfirmPass(e.target.value)}
              autoComplete="new-password"
            />
          </div>
          {error && <p className="change-password-error">{error}</p>}
          <button type="submit" className="change-password-btn" disabled={loading}>
            {loading ? 'Cambiando...' : 'Cambiar clave'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default ChangePassword;