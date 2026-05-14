import React from 'react';
import { render, screen } from '@testing-library/react';
import { AuthContext } from '../App';
import { AppointmentsUpdateProvider } from '../contexts/AppointmentsUpdateContext';
import Menu from '../components/Menu/Menu';
import ConfirmModal from '../components/ConfirmModal/ConfirmModal';
import CustomConfirmModal from '../components/CustomConfirmModal/CustomConfirmModal';
import Loading from '../components/Loading/Loading';
import Reports from '../components/Reports/Reports';

const authValue = { isAuthenticated: true, token: 'user-1-123', handleAuth: jest.fn() };

describe('Render components smoke tests', () => {
  test('Menu renders', () => {
    render(<Menu onLogout={jest.fn()} />);
    expect(screen.getByRole('button', { name: /menu/i })).toBeInTheDocument();
  });

  test('ConfirmModal renders with props', () => {
    render(<ConfirmModal isOpen={true} onClose={jest.fn()} onConfirm={jest.fn()} title="T" message="M" />);
    expect(screen.getByText('T')).toBeInTheDocument();
  });

  test('CustomConfirmModal renders with props', () => {
    render(<CustomConfirmModal isOpen={true} onClose={jest.fn()} onConfirm={jest.fn()} title="CT" message="CM" />);
    expect(screen.getByText('CT')).toBeInTheDocument();
  });

  test('Loading component shows message', () => {
    render(<Loading message="Cargando" size="small" overlay={false} />);
    expect(screen.getByText(/Cargando/i)).toBeInTheDocument();
  });

  test('Reports renders', () => {
    render(
      <AuthContext.Provider value={authValue}>
        <Reports />
      </AuthContext.Provider>
    );
    expect(true).toBeTruthy();
  });
});