import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ConfirmModal from '../components/ConfirmModal/ConfirmModal';

describe('ConfirmModal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
    onConfirm: jest.fn(),
    message: '¿Estás seguro?',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders nothing when isOpen is false', () => {
    const { container } = render(<ConfirmModal {...defaultProps} isOpen={false} />);
    expect(container.innerHTML).toBe('');
  });

  test('renders modal with default title', () => {
    render(<ConfirmModal {...defaultProps} />);
    expect(screen.getByText('Confirmar acción')).toBeInTheDocument();
  });

  test('renders modal with custom title', () => {
    render(<ConfirmModal {...defaultProps} title="Eliminar paciente" />);
    expect(screen.getByText('Eliminar paciente')).toBeInTheDocument();
  });

  test('renders message', () => {
    render(<ConfirmModal {...defaultProps} />);
    expect(screen.getByText('¿Estás seguro?')).toBeInTheDocument();
  });

  test('shows default confirm and cancel text', () => {
    render(<ConfirmModal {...defaultProps} />);
    expect(screen.getByRole('button', { name: /confirmar/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cancelar/i })).toBeInTheDocument();
  });

  test('shows custom confirm and cancel text', () => {
    render(<ConfirmModal {...defaultProps} confirmText="Eliminar" cancelText="Volver" />);
    expect(screen.getByRole('button', { name: /eliminar/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /volver/i })).toBeInTheDocument();
  });

  test('calls onClose when cancel button is clicked', () => {
    const onClose = jest.fn();
    render(<ConfirmModal {...defaultProps} onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: /cancelar/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test('calls onConfirm when confirm button is clicked', () => {
    const onConfirm = jest.fn();
    render(<ConfirmModal {...defaultProps} onConfirm={onConfirm} />);
    fireEvent.click(screen.getByRole('button', { name: /confirmar/i }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  test('calls onClose when close button (X) is clicked', () => {
    const onClose = jest.fn();
    render(<ConfirmModal {...defaultProps} onClose={onClose} />);
    fireEvent.click(screen.getByText('✕'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test('calls onClose when backdrop is clicked', () => {
    const onClose = jest.fn();
    render(<ConfirmModal {...defaultProps} onClose={onClose} />);
    fireEvent.click(screen.getByText('¿Estás seguro?').closest('.confirm-modal-overlay'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test('shows danger icon for danger type', () => {
    render(<ConfirmModal {...defaultProps} type="danger" />);
    expect(screen.getByText('⚠️')).toBeInTheDocument();
  });

  test('shows warning icon for warning type', () => {
    render(<ConfirmModal {...defaultProps} type="warning" />);
    expect(screen.getByText('⚡')).toBeInTheDocument();
  });

  test('shows info icon for info type', () => {
    render(<ConfirmModal {...defaultProps} type="info" />);
    expect(screen.getByText('ℹ️')).toBeInTheDocument();
  });

  test('applies danger class by default', () => {
    render(<ConfirmModal {...defaultProps} />);
    const modal = screen.getByText('¿Estás seguro?').closest('.confirm-modal');
    expect(modal.classList.contains('danger')).toBe(true);
  });

  test('applies warning class when type is warning', () => {
    render(<ConfirmModal {...defaultProps} type="warning" />);
    const modal = screen.getByText('¿Estás seguro?').closest('.confirm-modal');
    expect(modal.classList.contains('warning')).toBe(true);
  });
});