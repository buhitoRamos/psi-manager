import React from 'react';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';

// Mock external dependencies
jest.mock('../lib/supabaseRest', () => ({
  __esModule: true,
  default: {
    getPaymentsByUserId: jest.fn(),
    getPatientsByUserId: jest.fn(),
    createPayment: jest.fn((data) => Promise.resolve({ id: 3, ...data })),
    updatePayment: jest.fn((id, data) => Promise.resolve({ id, ...data })),
    deletePayment: jest.fn(() => Promise.resolve()),
  },
}));

jest.mock('react-hot-toast', () => ({
  success: jest.fn(),
  error: jest.fn(),
  promise: jest.fn((promise) => promise),
}));

jest.mock('../components/PaymentForm/PaymentForm', () => ({ isOpen, onClose, onSave, patients, existingPayment }) => 
  isOpen ? (
    <div data-testid="payment-form">
      {existingPayment ? 'Editar Pago' : 'Nuevo Pago'}
      <button onClick={() => onSave({ patient_id: 1, payment: 5000, contribution_ob: null })}>Save</button>
      <button onClick={onClose}>Close</button>
    </div>
  ) : null
);

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

import Payments from '../components/Payments/Payments';
import { AuthContext } from '../App';
import supabaseRest from '../lib/supabaseRest';

const mockPayments = [
  { id: 1, patient_id: 1, payment: 5000, contribution_ob: 'Pago parcial', created_at: '2026-01-15T10:00:00' },
  { id: 2, patient_id: 2, payment: 8000, contribution_ob: null, created_at: '2026-02-20T14:00:00' },
];

const mockPatients = [
  { id: 1, name: 'Juan', last_name: 'Perez' },
  { id: 2, name: 'María', last_name: 'García' },
];

const authValue = { isAuthenticated: true, token: 'user-1-123', handleAuth: jest.fn() };

const renderPayments = (authOverride = authValue) => {
  return render(
    <AuthContext.Provider value={authOverride}>
      <Payments />
    </AuthContext.Provider>
  );
};

describe('Payments component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.setItem('token', 'user-1-123');
    supabaseRest.getPaymentsByUserId.mockResolvedValue(mockPayments);
    supabaseRest.getPatientsByUserId.mockResolvedValue(mockPatients);
  });

  afterEach(() => {
    localStorage.clear();
  });

  test('renders payments list after loading', async () => {
    renderPayments();
    await waitFor(() => {
      expect(screen.getByText('Gestión de Pagos')).toBeInTheDocument();
    });
  });

  test('shows not authenticated error when not authenticated', async () => {
    const noAuth = { isAuthenticated: false, token: null, handleAuth: jest.fn() };
    renderPayments(noAuth);
    await waitFor(() => {
      expect(screen.getByText('Error al cargar los pagos')).toBeInTheDocument();
    });
  });

  test('displays patient names in payment cards', async () => {
    renderPayments();
    await waitFor(() => {
      expect(screen.getByText('Juan Perez')).toBeInTheDocument();
      expect(screen.getByText('María García')).toBeInTheDocument();
    });
  });

  test('shows new payment button', async () => {
    renderPayments();
    await waitFor(() => {
      expect(screen.getByText('+ Nuevo Pago')).toBeInTheDocument();
    });
  });

  test('opens payment form when new payment button is clicked', async () => {
    renderPayments();
    await waitFor(() => {
      expect(screen.getByText('+ Nuevo Pago')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('+ Nuevo Pago'));
    expect(screen.getByTestId('payment-form')).toBeInTheDocument();
    expect(screen.getByText('Nuevo Pago')).toBeInTheDocument();
  });

  test('shows search input', async () => {
    renderPayments();
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Buscar por nombre/i)).toBeInTheDocument();
    });
  });

  test('filters payments by search term', async () => {
    renderPayments();
    await waitFor(() => {
      expect(screen.getByText('Juan Perez')).toBeInTheDocument();
    });
    const searchInput = screen.getByPlaceholderText(/Buscar por nombre/i);
    fireEvent.change(searchInput, { target: { value: 'Juan' } });
    expect(screen.getByText('Juan Perez')).toBeInTheDocument();
  });

  test('shows clear button when search term is active', async () => {
    renderPayments();
    await waitFor(() => {
      expect(screen.getByText('Gestión de Pagos')).toBeInTheDocument();
    });
    const searchInput = screen.getByPlaceholderText(/Buscar por nombre/i);
    fireEvent.change(searchInput, { target: { value: 'Juan' } });
    expect(screen.getByTitle('Limpiar búsqueda')).toBeInTheDocument();
  });

  test('shows edit and delete buttons for each payment', async () => {
    renderPayments();
    await waitFor(() => {
      expect(screen.getAllByText('✏️ Editar').length).toBe(2);
      expect(screen.getAllByText('🗑️ Eliminar').length).toBe(2);
    });
  });

  test('shows observation when present', async () => {
    renderPayments();
    await waitFor(() => {
      expect(screen.getByText('Pago parcial')).toBeInTheDocument();
    });
  });

  test('opens edit payment form when edit button is clicked', async () => {
    renderPayments();
    await waitFor(() => {
      expect(screen.getAllByText('✏️ Editar').length).toBe(2);
    });
    const editButtons = screen.getAllByText('✏️ Editar');
    fireEvent.click(editButtons[0]);
    expect(screen.getByTestId('payment-form')).toBeInTheDocument();
    expect(screen.getByText('Editar Pago')).toBeInTheDocument();
  });

  test('opens confirm modal when delete button is clicked', async () => {
    renderPayments();
    await waitFor(() => {
      expect(screen.getAllByText('🗑️ Eliminar').length).toBe(2);
    });
    const deleteButtons = screen.getAllByText('🗑️ Eliminar');
    fireEvent.click(deleteButtons[0]);
    expect(screen.getByTestId('confirm-modal')).toBeInTheDocument();
  });

  test('closes payment form when close is clicked', async () => {
    renderPayments();
    await waitFor(() => {
      expect(screen.getByText('+ Nuevo Pago')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('+ Nuevo Pago'));
    expect(screen.getByTestId('payment-form')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Close'));
    expect(screen.queryByTestId('payment-form')).not.toBeInTheDocument();
  });

  test('shows user ID in header', async () => {
    renderPayments();
    await waitFor(() => {
      expect(screen.getByText(/Usuario ID: 1/)).toBeInTheDocument();
    });
  });
});