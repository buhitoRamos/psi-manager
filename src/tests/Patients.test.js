import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// Mock external dependencies
jest.mock('../lib/supabaseRest', () => ({
  __esModule: true,
  default: {
    getPatientsWithNextAppointment: jest.fn(),
    createPatient: jest.fn((data) => Promise.resolve({ id: 3, ...data })),
    updatePatient: jest.fn((id, data) => Promise.resolve({ id, ...data })),
    deletePatient: jest.fn(() => Promise.resolve({})),
    deletePendingAppointmentsByPatient: jest.fn(() => Promise.resolve()),
    getAppointmentsByUserId: jest.fn(() => Promise.resolve([])),
    createAppointment: jest.fn((data) => Promise.resolve({ id: 1, ...data })),
    createRecurringAppointments: jest.fn((data) => Promise.resolve({ createdCount: 4, deletedCount: 0, appointments: [] })),
  },
}));

jest.mock('../lib/googleCalendar', () => ({
  createCalendarEvent: jest.fn(() => Promise.resolve({})),
  createRecurringCalendarEvents: jest.fn(() => Promise.resolve({ success: true, created: 0, errors: 0 })),
  isAuthorized: jest.fn(() => false),
  deletePatientCalendarEvents: jest.fn(() => Promise.resolve({ deleted: 0 })),
  isGoogleApiReady: jest.fn(() => false),
}));

jest.mock('../lib/googleCalendarReconnect', () => ({
  reconnectGoogleCalendar: jest.fn(() => Promise.resolve(false)),
}));

jest.mock('../components/ConfirmModal/ConfirmModal', () => ({ isOpen, onClose, onConfirm, title, message }) => 
  isOpen ? (
    <div data-testid="confirm-modal">
      <h3>{title}</h3>
      <p>{message}</p>
      <button onClick={onConfirm}>Confirmar</button>
      <button onClick={onClose}>Cancelar</button>
    </div>
  ) : null
);

jest.mock('../components/AppointmentForm/AppointmentForm', () => ({ isOpen, onClose, onSave, patient }) => 
  isOpen ? (
    <div data-testid="appointment-form">
      <span>{patient?.name || 'No patient'}</span>
      <button onClick={() => onSave({ date: '2026-06-15', time: '10:00', patient_id: patient?.id })}>Save Appointment</button>
      <button onClick={onClose}>Close</button>
    </div>
  ) : null
);

jest.mock('../components/GoogleCalendarSettings/GoogleCalendarSettings', () => ({ isOpen, onClose }) => 
  isOpen ? <div data-testid="google-calendar-settings">GCS</div> : null
);

jest.mock('../components/Loading/Loading', () => ({ message }) => <div data-testid="loading">{message}</div>);

jest.mock('react-hot-toast', () => ({
  success: jest.fn(),
  error: jest.fn(),
  promise: jest.fn((promise, msgs) => promise),
}));

import Patients from '../components/patients-board/patients';
import { AuthContext } from '../App';
import { AppointmentsUpdateProvider } from '../contexts/AppointmentsUpdateContext';
import supabaseRest from '../lib/supabaseRest';

const mockPatients = [
  { id: 1, name: 'Juan', last_name: 'Perez', tel: '1234', email: 'juan@test.com', debt: 0, nextAppointment: null },
  { id: 2, name: 'María', last_name: 'García', tel: '5678', health_insurance: 'OSDE', debt: 5000, hasDebt: true, nextAppointment: { date: '2026-06-15T10:00:00' } },
];

const authValue = { isAuthenticated: true, token: 'user-1-123', handleAuth: jest.fn() };

const renderPatients = (authOverride = authValue) => {
  return render(
    <AuthContext.Provider value={authOverride}>
      <AppointmentsUpdateProvider>
        <MemoryRouter>
          <Patients />
        </MemoryRouter>
      </AppointmentsUpdateProvider>
    </AuthContext.Provider>
  );
};

describe('Patients component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.setItem('token', 'user-1-123');
    supabaseRest.getPatientsWithNextAppointment.mockResolvedValue(mockPatients);
  });

  afterEach(() => {
    localStorage.clear();
  });

  test('renders patients list after loading', async () => {
    renderPatients();
    await waitFor(() => {
      expect(screen.getByText('Lista de Pacientes')).toBeInTheDocument();
    });
    expect(screen.getByText('Juan')).toBeInTheDocument();
    expect(screen.getByText('María')).toBeInTheDocument();
  });

  test('shows not authenticated message when not authenticated', async () => {
    const noAuth = { isAuthenticated: false, token: null, handleAuth: jest.fn() };
    renderPatients(noAuth);
    expect(screen.getByText('Debes estar autenticado para ver los pacientes.')).toBeInTheDocument();
  });

  test('shows error state on failure', async () => {
    supabaseRest.getPatientsWithNextAppointment.mockRejectedValueOnce(new Error('Network error'));
    renderPatients();
    await waitFor(() => {
      expect(screen.getByText('Error')).toBeInTheDocument();
    });
  });

  test('displays search input', async () => {
    renderPatients();
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Buscar paciente/i)).toBeInTheDocument();
    });
  });

  test('filters patients by search term', async () => {
    renderPatients();
    await waitFor(() => {
      expect(screen.getByText('Juan')).toBeInTheDocument();
    });
    const searchInput = screen.getByPlaceholderText(/Buscar paciente/i);
    fireEvent.change(searchInput, { target: { value: 'Juan' } });
    expect(screen.getByText('Juan')).toBeInTheDocument();
  });

  test('shows clear button when search term is entered', async () => {
    renderPatients();
    await waitFor(() => {
      expect(screen.getByText('Juan')).toBeInTheDocument();
    });
    const searchInput = screen.getByPlaceholderText(/Buscar paciente/i);
    fireEvent.change(searchInput, { target: { value: 'Juan' } });
    expect(screen.getByTitle('Limpiar búsqueda')).toBeInTheDocument();
  });

  test('clears search term when clear button is clicked', async () => {
    renderPatients();
    await waitFor(() => {
      expect(screen.getByText('Juan')).toBeInTheDocument();
    });
    const searchInput = screen.getByPlaceholderText(/Buscar paciente/i);
    fireEvent.change(searchInput, { target: { value: 'Juan' } });
    fireEvent.click(screen.getByTitle('Limpiar búsqueda'));
    expect(searchInput.value).toBe('');
  });

  test('shows add patient button when patients exist', async () => {
    renderPatients();
    await waitFor(() => {
      expect(screen.getByText('Agregar Paciente')).toBeInTheDocument();
    });
  });

  test('toggles patient details on click', async () => {
    renderPatients();
    await waitFor(() => {
      expect(screen.getByText('Juan')).toBeInTheDocument();
    });
    const viewButton = screen.getAllByText('Ver')[0];
    fireEvent.click(viewButton);
    expect(screen.getByText('Ocultar')).toBeInTheDocument();
    expect(screen.getByText('Editar')).toBeInTheDocument();
    expect(screen.getByText('Eliminar')).toBeInTheDocument();
  });

  test('shows appointment button for each patient', async () => {
    renderPatients();
    await waitFor(() => {
      expect(screen.getByText('Juan')).toBeInTheDocument();
    });
    const appointmentBtns = screen.getAllByTitle('Programar turno');
    expect(appointmentBtns.length).toBe(2);
  });

  test('opens new patient form when add button is clicked', async () => {
    renderPatients();
    await waitFor(() => {
      expect(screen.getByText('Agregar Paciente')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Agregar Paciente'));
    expect(screen.getByText('Nuevo Paciente')).toBeInTheDocument();
  });

  test('shows debt indicator for patient with debt', async () => {
    renderPatients();
    await waitFor(() => {
      expect(screen.getByText(/Debe/)).toBeInTheDocument();
    });
  });

  test('shows next appointment date for patient', async () => {
    renderPatients();
    await waitFor(() => {
      expect(screen.getByText(/jun/i)).toBeInTheDocument();
    });
  });

  test('shows "Sin turnos programados" for patient without appointments', async () => {
    renderPatients();
    await waitFor(() => {
      expect(screen.getByText('Sin turnos programados')).toBeInTheDocument();
    });
  });

  test('opens appointment form when calendar button is clicked', async () => {
    renderPatients();
    await waitFor(() => {
      expect(screen.getByText('Juan')).toBeInTheDocument();
    });
    const appointmentBtns = screen.getAllByTitle('Programar turno');
    fireEvent.click(appointmentBtns[0]);
    expect(screen.getByTestId('appointment-form')).toBeInTheDocument();
  });

  test('closes appointment form when close is clicked', async () => {
    renderPatients();
    await waitFor(() => {
      expect(screen.getByText('Juan')).toBeInTheDocument();
    });
    const appointmentBtns = screen.getAllByTitle('Programar turno');
    fireEvent.click(appointmentBtns[0]);
    expect(screen.getByTestId('appointment-form')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Close'));
    expect(screen.queryByTestId('appointment-form')).not.toBeInTheDocument();
  });

  test('shows empty state when no patients match search', async () => {
    renderPatients();
    await waitFor(() => {
      expect(screen.getByText('Juan')).toBeInTheDocument();
    });
    const searchInput = screen.getByPlaceholderText(/Buscar paciente/i);
    fireEvent.change(searchInput, { target: { value: 'XYZNOTFOUND' } });
    expect(screen.getByText(/No se encontraron pacientes/i)).toBeInTheDocument();
  });

  test('shows user ID in header', async () => {
    renderPatients();
    await waitFor(() => {
      expect(screen.getByText(/Usuario ID: 1/)).toBeInTheDocument();
    });
  });
});