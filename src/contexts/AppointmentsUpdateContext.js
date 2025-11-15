import { createContext, useContext, useState, useEffect } from 'react';

// Contexto para manejar actualizaciones de appointments
export const AppointmentsUpdateContext = createContext(null);

// Hook personalizado para usar el contexto
export const useAppointmentsUpdate = () => {
  const context = useContext(AppointmentsUpdateContext);
  if (!context) {
    throw new Error('useAppointmentsUpdate must be used within an AppointmentsUpdateProvider');
  }
  return context;
};

// Proveedor del contexto
export const AppointmentsUpdateProvider = ({ children }) => {
  const [updateTrigger, setUpdateTrigger] = useState(0);
  const [debounceTimeout, setDebounceTimeout] = useState(null);
  
  // Función para disparar actualizaciones con debounce
  const triggerUpdate = () => {
    // Limpiar timeout anterior si existe
    if (debounceTimeout) {
      clearTimeout(debounceTimeout);
    }
    
    // Crear nuevo timeout
    const newTimeout = setTimeout(() => {
      setUpdateTrigger(prev => prev + 1);
    }, 300); // Debounce de 300ms
    
    setDebounceTimeout(newTimeout);
  };
  
  // Función específica para cuando se crean turnos recurrentes
  const onRecurringAppointmentsCreated = (...args) => {
    if (typeof args[0] === 'object' && args[0] !== null) {
      // Nuevo formato: objeto con propiedades
      const data = args[0];
      console.log(`[AppointmentsUpdate] Turnos ${data.frequency} creados para ${data.patientName}: ${data.createdCount} nuevos, ${data.deletedCount || 0} eliminados`);
    } else {
      // Formato anterior: argumentos individuales (para compatibilidad)
      const [patientName, frequency, createdCount, deletedCount = 0] = args;
      console.log(`[AppointmentsUpdate] Turnos ${frequency} creados para ${patientName}: ${createdCount} nuevos, ${deletedCount} eliminados`);
    }
    triggerUpdate();
  };
  
  // Función para cuando se eliminan turnos
  const onAppointmentsDeleted = (count, patientName = '') => {
    console.log(`[AppointmentsUpdate] ${count} turnos eliminados${patientName ? ` de ${patientName}` : ''}`);
    triggerUpdate();
  };
  
  const value = {
    updateTrigger,
    triggerUpdate,
    onRecurringAppointmentsCreated,
    onAppointmentsDeleted
  };

  // Limpiar timeout al desmontar
  useEffect(() => {
    return () => {
      if (debounceTimeout) {
        clearTimeout(debounceTimeout);
      }
    };
  }, [debounceTimeout]);
  
  return (
    <AppointmentsUpdateContext.Provider value={value}>
      {children}
    </AppointmentsUpdateContext.Provider>
  );
};