import React from 'react';
import './CustomConfirmModal.css';

function CustomConfirmModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  message, 
  confirmText = 'Confirmar', 
  cancelText = 'Cancelar',
  type = 'primary', // primary, danger, success, warning
  icon = '',
  loading = false 
}) {
  if (!isOpen) return null;

  const getTypeClass = () => {
    switch (type) {
      case 'danger':
        return 'custom-confirm-danger';
      case 'success':
        return 'custom-confirm-success';
      case 'warning':
        return 'custom-confirm-warning';
      default:
        return 'custom-confirm-primary';
    }
  };

  const getDefaultIcon = () => {
    if (icon) return icon;
    switch (type) {
      case 'danger':
        return '⚠️';
      case 'success':
        return '✅';
      case 'warning':
        return '🔔';
      default:
        return '❓';
    }
  };

  return (
    <div className="custom-confirm-overlay" onClick={onClose}>
      <div 
        className={`custom-confirm-modal ${getTypeClass()}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="custom-confirm-header">
          <div className="custom-confirm-title">
            <span className="custom-confirm-icon">{getDefaultIcon()}</span>
            <h3>{title}</h3>
          </div>
        </div>
        
        <div className="custom-confirm-content">
          <p className="custom-confirm-message">{message}</p>
        </div>
        
        <div className="custom-confirm-actions">
          <button
            onClick={onClose}
            className="custom-confirm-btn custom-confirm-cancel"
            disabled={loading}
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={`custom-confirm-btn custom-confirm-confirm ${getTypeClass()}`}
            disabled={loading}
          >
            {loading ? (
              <span className="custom-confirm-loading">
                <span className="custom-confirm-spinner"></span>
                Procesando...
              </span>
            ) : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

export default CustomConfirmModal;