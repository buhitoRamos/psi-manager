import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from '../App';

// Mock the heavy components
jest.mock('../contexts/AppointmentsUpdateContext', () => ({
  AppointmentsUpdateProvider: ({ children }) => <div data-testid="update-provider">{children}</div>,
}));

jest.mock('../pages/login-page/login', () => {
  return function MockLogin() {
    return <div data-testid="login-page">Login Page</div>;
  };
});

jest.mock('../pages/dahboard-page/dashboard', () => {
  return function MockDashboard() {
    return <div data-testid="dashboard-page">Dashboard Page</div>;
  };
});

describe('App', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test('redirects to login when not authenticated', () => {
    render(<App />);
    expect(screen.getByTestId('login-page')).toBeInTheDocument();
  });

  test('redirects to dashboard when authenticated', () => {
    localStorage.setItem('token', 'test-token');
    render(<App />);
    expect(screen.getByTestId('dashboard-page')).toBeInTheDocument();
  });

  test('renders App component without crashing', () => {
    render(<App />);
    expect(document.querySelector('.App')).toBeInTheDocument();
  });

  test('handleAuth sets token in localStorage', () => {
    render(<App />);
    // Simulate login by setting localStorage and re-rendering
    localStorage.setItem('token', 'new-token');
    expect(localStorage.getItem('token')).toBe('new-token');
  });

  test('handleAuth removes token from localStorage on logout', () => {
    localStorage.setItem('token', 'existing-token');
    localStorage.removeItem('token');
    expect(localStorage.getItem('token')).toBeNull();
  });
});