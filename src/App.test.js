import { render, screen } from '@testing-library/react';
import App from './App';

test('muestra la pantalla de login', () => {
  render(<App />);
  expect(screen.getByText(/Iniciar sesión/i)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /Entrar/i })).toBeInTheDocument();
});
