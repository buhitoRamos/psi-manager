import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';

jest.mock('../lib/supabaseRest', () => ({
  __esModule: true,
  default: {
    getPatientsByUserId: jest.fn(() => Promise.resolve([
      { id: 1, name: 'Juan', last_name: 'Perez' },
      { id: 2, name: 'María', last_name: 'García' },
    ])),
    createAppointment: jest.fn((data) => Promise.resolve({ id: 1, ...data })),
    createRecurringAppointments: jest.fn(),
  },
}));

jest.mock('../lib/googleCalendar', () => ({
  createCalendarEvent: jest.fn(() => Promise.resolve({})),
  isAuthorized: jest.fn(() => false),
}));

jest.mock('react-hot-toast', () => ({
  success: jest.fn(),
  error: jest.fn(),
  promise: jest.fn((promise) => promise),
}));

import AppointmentForm from '../components/AppointmentForm/AppointmentForm';
import { AuthContext } from '../App';

const authValue = { isAuthenticated: true, token: 'user-1-123', handleAuth: jest.fn() };

const renderAppointmentForm = (props = {}) => {
  const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
    onSave: jest.fn(),
    patient: { id: 1, name: 'Juan', last_name: 'Perez' },
  };
  return render(
    <AuthContext.Provider value={authValue}>
      <AppointmentForm {...defaultProps} {...props} />
    </AuthContext.Provider>
  );
};

describe('AppointmentForm component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.setItem('token', 'user-1-123');
  });

  afterEach(() => {
    localStorage.clear();
  });

  test('returns null when isOpen is false', () => {
    const { container } = render(
      <AuthContext.Provider value={authValue}>
        <AppointmentForm isOpen={false} onClose={() => {}} onSave={() => {}} patient={null} />
      </AuthContext.Provider>
    );
    expect(container.innerHTML).toBe('');
  });

  test('renders form when isOpen is true', async () => {
    await act(async () => {
      renderAppointmentForm();
    });
    expect(screen.getByText('Nuevo Turno')).toBeInTheDocument();
  });

  test('renders patient name in header', async () => {
    await act(async () => {
      renderAppointmentForm();
    });
    expect(screen.getByText(/Juan Perez/)).toBeInTheDocument();
  });

  test('shows date and time input', async () => {
    await act(async () => {
      renderAppointmentForm();
    });
    expect(screen.getByLabelText(/Fecha y Hora/i)).toBeInTheDocument();
  });

  test('shows frequency select', async () => {
    await act(async () => {
      renderAppointmentForm();
    });
    expect(screen.getByLabelText(/Frecuencia/i)).toBeInTheDocument();
  });

  test('shows cancel button', async () => {
    await act(async () => {
      renderAppointmentForm();
    });
    // The form has a cancel/close mechanism - test the close button (✕) or Cancelar
    const cancelBtn = screen.getByText('Cancelar') || screen.getByRole('button', { name: /✕/ });
    expect(cancelBtn).toBeTruthy();
  });

  test('calls onClose when cancel is clicked', async () => {
    const onClose = jest.fn();
    await act(async () => {
      renderAppointmentForm({ onClose });
    });
    fireEvent.click(screen.getByText('Cancelar'));
    expect(onClose).toHaveBeenCalled();
  });

  test('shows Guardar button', async () => {
    await act(async () => {
      renderAppointmentForm();
    });
    expect(screen.getByText('Guardar')).toBeInTheDocument();
  });

  test('renders in edit mode when existingAppointment is provided', async () => {
    const existingAppointment = {
      id: 1,
      patient_id: 1,
      date: '2026-06-15T10:00',
      frequency: 'unica',
      observation: 'Test',
      status: 'en_espera',
      amount: 5000,
    };
    await act(async () => {
      renderAppointmentForm({ existingAppointment });
    });
    expect(screen.getByText('Editar Turno')).toBeInTheDocument();
  });
});