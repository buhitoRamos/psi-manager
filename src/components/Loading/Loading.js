import React from 'react';
import './Loading.css';

const Loading = ({ 
  message = "Cargando...", 
  size = "medium", 
  overlay = false,
  showSpinner = true,
  children 
}) => {
  const sizeClass = `loading-${size}`;
  const containerClass = overlay ? 'loading-overlay' : 'loading-inline';

  return (
    <div className={`loading-container ${containerClass}`}>
      <div className={`loading-content ${sizeClass}`}>
        {showSpinner && (
          <div className="loading-spinner">
            <div className="spinner"></div>
          </div>
        )}
        <div className="loading-message">
          {message}
        </div>
        {children && (
          <div className="loading-extra-content">
            {children}
          </div>
        )}
      </div>
    </div>
  );
};

export default Loading;