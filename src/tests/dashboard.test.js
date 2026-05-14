import React from 'react';

// Mock ALL child components to avoid their internal hooks/effects
jest.mock('../components/patients-board/patients', () => {
  return function MockPatients() {
    return <div data-testid="patients-mock">Patients</div>;
  };
});

jest.mock('../components/Appointments/Appointments', () => {
  return function MockAppointments() {
    return <div data-testid="appointments-mock">Appointments</div>;
  };
});

jest.mock('../components/Payments/Payments', () => {
  return function MockPayments() {
    return <div data-testid="payments-mock">Payments</div>;
  };
});

jest.mock('../components/Reports/Reports', () => {
  return function MockReports() {
    return <div data-testid="reports-mock">Reports</div>;
  };
});

jest.mock('../components/Earnings/Earnings', () => {
  return function MockEarnings() {
    return <div data-testid="earnings-mock">Earnings</div>;
  };
});

jest.mock('../components/GoogleCalendarSettings/GoogleCalendarSettings', () => {
  return function MockGoogleCalendarSettings({ isOpen }) {
    return isOpen ? <div data-testid="gcal-settings-mock">Google Calendar Settings</div> : null;
  };
});

jest.mock('../components/Menu/Menu', () => {
  return function MockMenu({ onLogout }) {
    return <button onClick={onLogout} data-testid="menu-mock">Menu</button>;
  };
});

jest.mock('../lib/authStatusRest', () => ({
  getAuthStatusByUserId: jest.fn(() => Promise.resolve(null)),
}));

import Dashboard from '../pages/dahboard-page/dashboard';
import { AuthContext } from '../App';
import { MemoryRouter } from 'react-router-dom';
import { render, screen, fireEvent } from '@testing-library/react';

const authValue = { isAuthenticated: true, token: 'user-1-123', handleAuth: jest.fn() };

function renderDashboard(authCtx = authValue) {
  return render(
    <MemoryRouter>
      <AuthContext.Provider value={authCtx}>
        <Dashboard />
      </AuthContext.Provider>
    </MemoryRouter>
  );
}

describe('Dashboard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  test('renders Dashboard component with header', () => {
    renderDashboard();
    expect(screen.getByText(/Dashboard/i)).toBeInTheDocument();
  });

  test('renders Patients section by default', () => {
    renderDashboard();
    expect(screen.getByTestId('patients-mock')).toBeInTheDocument();
  });

  test('renders Menu component', () => {
    renderDashboard();
    expect(screen.getByTestId('menu-mock')).toBeInTheDocument();
  });

  test('calls handleAuth on logout', () => {
    const handleAuth = jest.fn();
    const authCtx = { isAuthenticated: true, token: 'user-1-123', handleAuth };
    renderDashboard(authCtx);
    fireEvent.click(screen.getByTestId('menu-mock'));
    expect(handleAuth).toHaveBeenCalledWith(null);
  });
});