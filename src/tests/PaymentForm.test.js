import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';

jest.mock('react-hot-toast', () => ({
  success: jest.fn(),
  error: jest.fn(),
}));

import PaymentForm from '../components/PaymentForm/PaymentForm';

const patients = [
  { id: 1, name: 'Juan', last_name: 'Perez' },
  { id: 2, name: 'María', last_name: 'García' },
];

describe('PaymentForm component', () => {
  const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
    onSave: jest.fn(() => Promise.resolve()),
    patients,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('returns null when isOpen is false', () => {
    const { container } = render(<PaymentForm {...defaultProps} isOpen={false} />);
    expect(container.innerHTML).toBe('');
  });

  test('renders form when isOpen is true', () => {
    render(<PaymentForm {...defaultProps} />);
    expect(screen.getByText('Nuevo Pago')).toBeInTheDocument();
  });

  test('renders Edit title when existingPayment is provided', () => {
    render(<PaymentForm {...defaultProps} existingPayment={{ patient_id: 1, payment: 5000 }} />);
    expect(screen.getByText('Editar Pago')).toBeInTheDocument();
  });

  test('renders patient selector with options', () => {
    render(<PaymentForm {...defaultProps} />);
    const select = screen.getByRole('combobox');
    expect(select).toBeInTheDocument();
    expect(screen.getByText('Juan Perez')).toBeInTheDocument();
    expect(screen.getByText('María García')).toBeInTheDocument();
  });

  test('renders payment input', () => {
    render(<PaymentForm {...defaultProps} />);
    expect(screen.getByPlaceholderText('0.00')).toBeInTheDocument();
  });

  test('renders observations textarea', () => {
    render(<PaymentForm {...defaultProps} />);
    expect(screen.getByPlaceholderText(/Observaciones/i)).toBeInTheDocument();
  });

  test('renders cancel and save buttons', () => {
    render(<PaymentForm {...defaultProps} />);
    expect(screen.getByText('Cancelar')).toBeInTheDocument();
    expect(screen.getByText('Guardar Pago')).toBeInTheDocument();
  });

  test('calls onClose when cancel button is clicked', () => {
    const onClose = jest.fn();
    render(<PaymentForm {...defaultProps} onClose={onClose} />);
    fireEvent.click(screen.getByText('Cancelar'));
    expect(onClose).toHaveBeenCalled();
  });

  test('calls onClose when close (X) button is clicked', () => {
    const onClose = jest.fn();
    render(<PaymentForm {...defaultProps} onClose={onClose} />);
    fireEvent.click(screen.getByText('✕'));
    expect(onClose).toHaveBeenCalled();
  });

  test('shows validation error when submitting without required fields', async () => {
    const { error } = require('react-hot-toast');
    render(<PaymentForm {...defaultProps} />);
    await act(async () => {
      fireEvent.click(screen.getByText('Guardar Pago'));
    });
    expect(error).toHaveBeenCalled();
  });

  test('submits form with valid data', async () => {
    const onSave = jest.fn(() => Promise.resolve());
    const onClose = jest.fn();
    render(<PaymentForm {...defaultProps} onSave={onSave} onClose={onClose} />);
    
    // Select patient
    fireEvent.change(screen.getByRole('combobox'), { target: { value: '1' } });
    // Enter payment amount
    fireEvent.change(screen.getByPlaceholderText('0.00'), { target: { value: '5000' } });
    // Submit
    await act(async () => {
      fireEvent.click(screen.getByText('Guardar Pago'));
    });
    
    expect(onSave).toHaveBeenCalledWith({
      patient_id: 1,
      payment: 5000,
      contribution_ob: null,
    });
  });

  test('pre-fills form when existingPayment is provided', () => {
    render(<PaymentForm {...defaultProps} existingPayment={{ patient_id: 1, payment: 5000, contribution_ob: 'Pago parcial' }} />);
    expect(screen.getByDisplayValue('5000')).toBeInTheDocument();
  });

  test('shows updating text when existingPayment is provided', () => {
    render(<PaymentForm {...defaultProps} existingPayment={{ patient_id: 1, payment: 5000 }} />);
    expect(screen.getByText('Actualizar Pago')).toBeInTheDocument();
  });

  test('renders Observaciones label', () => {
    render(<PaymentForm {...defaultProps} />);
    expect(screen.getByText('Observaciones')).toBeInTheDocument();
  });
});