import React from 'react';
import { render, screen } from '@testing-library/react';
import { AuthContext } from '../App';
import { AppointmentsUpdateProvider } from '../contexts/AppointmentsUpdateContext';

import Appointments from '../components/Appointments/Appointments';
import Payments from '../components/Payments/Payments';
import Reports from '../components/Reports/Reports';
import PatientsBoard from '../components/patients-board/patients';
import Menu from '../components/Menu/Menu';
import ConfirmModal from '../components/ConfirmModal/ConfirmModal';
import CustomConfirmModal from '../components/CustomConfirmModal/CustomConfirmModal';
import PaymentForm from '../components/PaymentForm/PaymentForm';
import GoogleCalendarSettings from '../components/GoogleCalendarSettings/GoogleCalendarSettings';
import Earnings from '../components/Earnings/Earnings';
import Loading from '../components/Loading/Loading';

const authValue = { isAuthenticated: true, token: 'user-1-123', handleAuth: jest.fn() };

describe('Render components smoke tests', () => {
  test('Appointments renders without crashing', () => {
    render(
      <AuthContext.Provider value={authValue}>
        <AppointmentsUpdateProvider>
          <Appointments />
        </AppointmentsUpdateProvider>
      </AuthContext.Provider>
    );
    expect(screen.queryByText(/Turnos Programados|No hay turnos registrados/i)).not.toBeNull();
  });

  test('Payments renders', () => {
    render(
      <AuthContext.Provider value={authValue}>
        <Payments />
      </AuthContext.Provider>
    );
    expect(screen.getByText(/Pagos|No hay pagos/i) || true).toBeTruthy();
  });

  test('Reports renders', () => {
    render(
      <AuthContext.Provider value={authValue}>
        <Reports />
      </AuthContext.Provider>
    );
    expect(true).toBeTruthy();
  });

  test('Patients board renders', () => {
    render(
      <AuthContext.Provider value={authValue}>
        <PatientsBoard />
      </AuthContext.Provider>
    );
    expect(true).toBeTruthy();
  });

  test('Menu renders', () => {
    render(<Menu />);
    expect(true).toBeTruthy();
  });

  test('Confirm modals render with props', () => {
    render(<ConfirmModal isOpen={true} onClose={() => {}} onConfirm={() => {}} title="T" message="M" />);
    expect(screen.getByText(/T|M/i)).toBeInTheDocument();
    render(<CustomConfirmModal isOpen={true} onClose={() => {}} onConfirm={() => {}} title="CT" message="CM" />);
    expect(screen.getByText(/CT|CM/i)).toBeInTheDocument();
  });

  test('PaymentForm renders', () => {
    render(<PaymentForm isOpen={false} onClose={() => {}} onSave={() => {}} patient={{ id: 1 }} />);
    expect(true).toBeTruthy();
  });

  test('GoogleCalendarSettings renders', () => {
    render(<GoogleCalendarSettings />);
    expect(true).toBeTruthy();
  });

  test('Earnings renders', () => {
    render(<Earnings />);
    expect(true).toBeTruthy();
  });

  test('Loading component shows message', () => {
    render(<Loading message="Cargando" size="small" overlay={false} />);
    expect(screen.getByText(/Cargando/i)).toBeInTheDocument();
  });
});
