import { render, screen, fireEvent } from '@testing-library/react';
import Login from '../components/login/Login';
import { BrowserRouter } from 'react-router-dom';

jest.mock('../lib/supabaseRest', () => ({ authCheck: jest.fn().mockResolvedValue({ valid: true, user_id: 1 }) }));
jest.mock('../lib/authStatusRest', () => ({ getAuthStatusByUserId: jest.fn().mockResolvedValue({ status: true }) }));

describe('Login', () => {
  test('muestra inputs y boton', () => {
    render(<BrowserRouter><Login /></BrowserRouter>);
    expect(screen.getByPlaceholderText(/usuario/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/\*\*\*\*\*\*/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Entrar/i })).toBeInTheDocument();
  });
});
