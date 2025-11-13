import React from 'react';
import './ConfirmModal.css';

function ConfirmModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title = "Confirmar acción", 
  message, 
  confirmText = "Confirmar",
  cancelText = "Cancelar",
  type = "danger" // danger, warning, info
}) {
  if (!isOpen) return null;

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="confirm-modal-overlay" onClick={handleBackdropClick}>
      <div className={`confirm-modal ${type}`}>
        <div className="confirm-modal-header">
          <h3 className="confirm-modal-title">{title}</h3>
          <button className="confirm-modal-close" onClick={onClose}>
            ✕
          </button>
        </div>
        
        <div className="confirm-modal-body">
          <div className="confirm-modal-icon">
            {type === 'danger' && '⚠️'}
            {type === 'warning' && '⚡'}
            {type === 'info' && 'ℹ️'}
          </div>
          <p className="confirm-modal-message">{message}</p>
        </div>
        
        <div className="confirm-modal-footer">
          <button 
            className="confirm-modal-btn confirm-modal-cancel"
            onClick={onClose}
          >
            {cancelText}
          </button>
          <button 
            className={`confirm-modal-btn confirm-modal-confirm ${type}`}
            onClick={onConfirm}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmModal;