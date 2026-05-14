import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import CustomConfirmModal from '../components/CustomConfirmModal/CustomConfirmModal';

describe('CustomConfirmModal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
    onConfirm: jest.fn(),
    title: 'Test Title',
    message: 'Test message',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders nothing when isOpen is false', () => {
    const { container } = render(<CustomConfirmModal {...defaultProps} isOpen={false} />);
    expect(container.innerHTML).toBe('');
  });

  test('renders modal when isOpen is true', () => {
    render(<CustomConfirmModal {...defaultProps} />);
    expect(screen.getByText('Test Title')).toBeInTheDocument();
    expect(screen.getByText('Test message')).toBeInTheDocument();
  });

  test('shows default confirm and cancel text', () => {
    render(<CustomConfirmModal {...defaultProps} />);
    expect(screen.getByRole('button', { name: /confirmar/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cancelar/i })).toBeInTheDocument();
  });

  test('shows custom confirm and cancel text', () => {
    render(<CustomConfirmModal {...defaultProps} confirmText="Sí, eliminar" cancelText="No, volver" />);
    expect(screen.getByRole('button', { name: /sí, eliminar/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /no, volver/i })).toBeInTheDocument();
  });

  test('calls onClose when cancel button is clicked', () => {
    const onClose = jest.fn();
    render(<CustomConfirmModal {...defaultProps} onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: /cancelar/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test('calls onConfirm when confirm button is clicked', () => {
    const onConfirm = jest.fn();
    render(<CustomConfirmModal {...defaultProps} onConfirm={onConfirm} />);
    fireEvent.click(screen.getByRole('button', { name: /confirmar/i }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  test('calls onClose when overlay is clicked', () => {
    const onClose = jest.fn();
    render(<CustomConfirmModal {...defaultProps} onClose={onClose} />);
    fireEvent.click(screen.getByText('Test Title').closest('.custom-confirm-overlay'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test('does not call onClose when modal content is clicked', () => {
    const onClose = jest.fn();
    render(<CustomConfirmModal {...defaultProps} onClose={onClose} />);
    fireEvent.click(screen.getByText('Test message'));
    expect(onClose).not.toHaveBeenCalled();
  });

  test('shows danger icon for danger type', () => {
    render(<CustomConfirmModal {...defaultProps} type="danger" />);
    expect(screen.getByText('⚠️')).toBeInTheDocument();
  });

  test('shows success icon for success type', () => {
    render(<CustomConfirmModal {...defaultProps} type="success" />);
    expect(screen.getByText('✅')).toBeInTheDocument();
  });

  test('shows warning icon for warning type', () => {
    render(<CustomConfirmModal {...defaultProps} type="warning" />);
    expect(screen.getByText('🔔')).toBeInTheDocument();
  });

  test('shows default icon for primary type', () => {
    render(<CustomConfirmModal {...defaultProps} type="primary" />);
    expect(screen.getByText('❓')).toBeInTheDocument();
  });

  test('shows custom icon when provided', () => {
    render(<CustomConfirmModal {...defaultProps} icon="🔥" />);
    expect(screen.getByText('🔥')).toBeInTheDocument();
  });

  test('disables buttons when loading is true', () => {
    render(<CustomConfirmModal {...defaultProps} loading={true} />);
    expect(screen.getByRole('button', { name: /cancelar/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /procesando/i })).toBeDisabled();
  });

  test('shows processing text when loading', () => {
    render(<CustomConfirmModal {...defaultProps} loading={true} />);
    expect(screen.getByText(/procesando/i)).toBeInTheDocument();
  });

  test('buttons are enabled when loading is false', () => {
    render(<CustomConfirmModal {...defaultProps} loading={false} />);
    expect(screen.getByRole('button', { name: /confirmar/i })).not.toBeDisabled();
    expect(screen.getByRole('button', { name: /cancelar/i })).not.toBeDisabled();
  });

  test('applies danger class for danger type', () => {
    render(<CustomConfirmModal {...defaultProps} type="danger" />);
    const modal = screen.getByText('Test Title').closest('.custom-confirm-modal');
    expect(modal.classList.contains('custom-confirm-danger')).toBe(true);
  });

  test('applies success class for success type', () => {
    render(<CustomConfirmModal {...defaultProps} type="success" />);
    const modal = screen.getByText('Test Title').closest('.custom-confirm-modal');
    expect(modal.classList.contains('custom-confirm-success')).toBe(true);
  });
});