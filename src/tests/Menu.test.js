import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import Menu from '../components/Menu/Menu';

describe('Menu', () => {
  const defaultProps = {
    onLogout: jest.fn(),
    onNavigateToTurnos: jest.fn(),
    onNavigateToPatients: jest.fn(),
    onNavigateToPayments: jest.fn(),
    onNavigateToReports: jest.fn(),
    onNavigateToEarnings: jest.fn(),
    onOpenGoogleCalendarSettings: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders hamburger button', () => {
    render(<Menu {...defaultProps} />);
    expect(screen.getByRole('button', { name: /menu/i })).toBeInTheDocument();
  });

  test('toggles menu open on hamburger click', () => {
    render(<Menu {...defaultProps} />);
    const btn = screen.getByRole('button', { name: /menu/i });
    // Menu items should appear after click
    fireEvent.click(btn);
    expect(screen.getByText('Pacientes')).toBeInTheDocument();
  });

  test('calls onNavigateToPatients when Pacientes is clicked', () => {
    render(<Menu {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: /menu/i }));
    fireEvent.click(screen.getByText('Pacientes'));
    expect(defaultProps.onNavigateToPatients).toHaveBeenCalledTimes(1);
  });

  test('calls onNavigateToTurnos when Turnos is clicked', () => {
    render(<Menu {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: /menu/i }));
    fireEvent.click(screen.getByText('Turnos'));
    expect(defaultProps.onNavigateToTurnos).toHaveBeenCalledTimes(1);
  });

  test('calls onNavigateToPayments when Pagos is clicked', () => {
    render(<Menu {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: /menu/i }));
    fireEvent.click(screen.getByText('Pagos'));
    expect(defaultProps.onNavigateToPayments).toHaveBeenCalledTimes(1);
  });

  test('calls onNavigateToReports when Informes is clicked', () => {
    render(<Menu {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: /menu/i }));
    fireEvent.click(screen.getByText('Informes'));
    expect(defaultProps.onNavigateToReports).toHaveBeenCalledTimes(1);
  });

  test('calls onNavigateToEarnings when Ganancias is clicked', () => {
    render(<Menu {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: /menu/i }));
    fireEvent.click(screen.getByText('Ganancias'));
    expect(defaultProps.onNavigateToEarnings).toHaveBeenCalledTimes(1);
  });

  test('calls onOpenGoogleCalendarSettings when Google Calendar is clicked', () => {
    render(<Menu {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: /menu/i }));
    fireEvent.click(screen.getByText('Google Calendar'));
    expect(defaultProps.onOpenGoogleCalendarSettings).toHaveBeenCalledTimes(1);
  });

  test('calls onLogout when Cerrar Sesión is clicked', () => {
    render(<Menu {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: /menu/i }));
    fireEvent.click(screen.getByText('Cerrar Sesión'));
    expect(defaultProps.onLogout).toHaveBeenCalledTimes(1);
  });

  test('closes menu after clicking a menu item', () => {
    render(<Menu {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: /menu/i }));
    expect(screen.getByText('Pacientes')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Pacientes'));
    expect(defaultProps.onNavigateToPatients).toHaveBeenCalledTimes(1);
  });
});