// Jest setup for psi-manager tests
import '@testing-library/jest-dom/extend-expect';

// Mock supabaseRest used across components
jest.mock('./lib/supabaseRest', () => ({
  getPatientsByUserId: jest.fn().mockResolvedValue([]),
  getAppointmentsByUserId: jest.fn().mockResolvedValue([]),
  getPaymentsByUserId: jest.fn().mockResolvedValue([]),
  createPayment: jest.fn().mockResolvedValue(true),
  updateAppointment: jest.fn().mockResolvedValue(null),
  createRecurringAppointments: jest.fn().mockResolvedValue({ createdCount: 0, appointments: [] }),
  deleteAppointment: jest.fn().mockResolvedValue(true),
  deletePendingAppointmentsByPatient: jest.fn().mockResolvedValue({ deletedCount: 0 })
}));

// Mock googleCalendar functions
jest.mock('./lib/googleCalendar', () => ({
  isAuthorized: () => false,
  deletePatientCalendarEvents: jest.fn().mockResolvedValue({ deleted: 0 }),
  deleteAppointmentCalendarEvents: jest.fn().mockResolvedValue({ deleted: 0 }),
  createCalendarEvent: jest.fn().mockResolvedValue({ created: 0 }),
  createRecurringCalendarEvents: jest.fn().mockResolvedValue({ created: 0 })
}));

// Mock reconnect
jest.mock('./lib/googleCalendarReconnect', () => ({
  reconnectGoogleCalendar: jest.fn().mockResolvedValue(false)
}));

// Mock react-hot-toast with both default and named Toaster
jest.mock('react-hot-toast', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: {
      success: jest.fn(),
      error: jest.fn(),
      promise: (p) => p
    },
    Toaster: (props) => React.createElement('div', { 'data-testid': 'toaster' }, null)
  };
});
