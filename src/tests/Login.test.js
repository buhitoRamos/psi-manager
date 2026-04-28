import { render, screen } from '@testing-library/react';
import Login from '../components/login/Login';
import { BrowserRouter } from 'react-router-dom';
import { AuthContext } from '../App';

jest.mock('../lib/supabaseRest', () => ({ authCheck: jest.fn().mockResolvedValue({ valid: true, user_id: 1 }) }));
jest.mock('../lib/authStatusRest', () => ({ getAuthStatusByUserId: jest.fn().mockResolvedValue({ status: true }) }));

describe('Login', () => {
  test('muestra inputs y boton', () => {
    const handleAuth = jest.fn();
    render(
      <AuthContext.Provider value={{ handleAuth }}>
        <BrowserRouter>
          <Login />
        </BrowserRouter>
      </AuthContext.Provider>
    );
    expect(screen.getByPlaceholderText(/usuario/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/\*\*\*\*\*\*/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Entrar/i })).toBeInTheDocument();
  });
});
