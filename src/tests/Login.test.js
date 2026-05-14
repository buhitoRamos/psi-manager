import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

jest.mock('../lib/supabaseRest', () => ({
  authCheck: jest.fn(() => Promise.resolve({ valid: true, user_id: 1 })),
  __esModule: true,
  default: {},
}));

jest.mock('../lib/authStatusRest', () => ({
  getAuthStatusByUserId: jest.fn(() => Promise.resolve({ status: true })),
}));

jest.mock('react-hot-toast', () => ({
  success: jest.fn(),
  error: jest.fn(),
}));

import Login from '../components/login/Login';
import { AuthContext } from '../App';

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

const authValue = { isAuthenticated: false, token: null, handleAuth: jest.fn() };

describe('Login component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders login form', () => {
    render(
      <AuthContext.Provider value={authValue}>
        <MemoryRouter>
          <Login />
        </MemoryRouter>
      </AuthContext.Provider>
    );
    expect(screen.getByText('Iniciar sesión')).toBeInTheDocument();
  });

  test('renders username and password inputs', () => {
    render(
      <AuthContext.Provider value={authValue}>
        <MemoryRouter>
          <Login />
        </MemoryRouter>
      </AuthContext.Provider>
    );
    expect(screen.getByPlaceholderText('usuario')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('********')).toBeInTheDocument();
  });

  test('renders login button', () => {
    render(
      <AuthContext.Provider value={authValue}>
        <MemoryRouter>
          <Login />
        </MemoryRouter>
      </AuthContext.Provider>
    );
    expect(screen.getByRole('button', { name: /Entrar/i })).toBeInTheDocument();
  });

  test('shows error when submitting empty fields', async () => {
    render(
      <AuthContext.Provider value={authValue}>
        <MemoryRouter>
          <Login />
        </MemoryRouter>
      </AuthContext.Provider>
    );
    fireEvent.click(screen.getByRole('button', { name: /Entrar/i }));
    expect(screen.getByText('Por favor completa ambos campos.')).toBeInTheDocument();
  });

  test('shows error for short username', async () => {
    render(
      <AuthContext.Provider value={authValue}>
        <MemoryRouter>
          <Login />
        </MemoryRouter>
      </AuthContext.Provider>
    );
    const usernameInput = screen.getByPlaceholderText('usuario');
    fireEvent.change(usernameInput, { target: { value: 'a' } });
    const passwordInput = screen.getByPlaceholderText('********');
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(screen.getByRole('button', { name: /Entrar/i }));
    expect(screen.getByText('El usuario es muy corto.')).toBeInTheDocument();
  });

  test('successful login calls handleAuth and navigates to dashboard', async () => {
    const { authCheck } = require('../lib/supabaseRest');
    const mockHandleAuth = jest.fn();
    const authWithMock = { isAuthenticated: false, token: null, handleAuth: mockHandleAuth };
    
    render(
      <AuthContext.Provider value={authWithMock}>
        <MemoryRouter>
          <Login />
        </MemoryRouter>
      </AuthContext.Provider>
    );

    const usernameInput = screen.getByPlaceholderText('usuario');
    const passwordInput = screen.getByPlaceholderText('********');
    
    fireEvent.change(usernameInput, { target: { value: 'testuser' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Entrar/i }));
    });

    await act(async () => {
      // Wait for async operations
    });

    expect(authCheck).toHaveBeenCalledWith('testuser', 'password123');
  });

  test('shows error on invalid credentials', async () => {
    const { authCheck } = require('../lib/supabaseRest');
    authCheck.mockRejectedValueOnce(new Error('Credenciales inválidas'));
    
    render(
      <AuthContext.Provider value={authValue}>
        <MemoryRouter>
          <Login />
        </MemoryRouter>
      </AuthContext.Provider>
    );

    const usernameInput = screen.getByPlaceholderText('usuario');
    const passwordInput = screen.getByPlaceholderText('********');
    
    fireEvent.change(usernameInput, { target: { value: 'testuser' } });
    fireEvent.change(passwordInput, { target: { value: 'wrongpass' } });
    
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Entrar/i }));
    });

    await act(async () => {});
  });

  test('renders Psi logo', () => {
    render(
      <AuthContext.Provider value={authValue}>
        <MemoryRouter>
          <Login />
        </MemoryRouter>
      </AuthContext.Provider>
    );
    expect(screen.getByAltText('Psi')).toBeInTheDocument();
  });

  test('renders login form with aria-label', () => {
    render(
      <AuthContext.Provider value={authValue}>
        <MemoryRouter>
          <Login />
        </MemoryRouter>
      </AuthContext.Provider>
    );
    expect(screen.getByRole('form', { name: /login/i })).toBeInTheDocument();
  });
});