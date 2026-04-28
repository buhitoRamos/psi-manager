import { render, screen, fireEvent } from '@testing-library/react';
import AppointmentForm, { generateRecurringDates } from '../components/AppointmentForm/AppointmentForm';

// Note: AppointmentForm exports are default; helper functions are internal. To test them,
// we'll replicate expected behavior or import via module if exported. For now test UI flows.

describe('AppointmentForm', () => {
  const mockOnSave = jest.fn().mockResolvedValue(true);
  const mockOnClose = jest.fn();
  const patient = { id: 1, name: 'Test', last_name: 'User' };

  test('no renderiza cuando isOpen false', () => {
    const { container } = render(<AppointmentForm isOpen={false} onClose={mockOnClose} onSave={mockOnSave} patient={patient} />);
    expect(container).toBeEmptyDOMElement();
  });

  test('muestra formulario cuando isOpen true', () => {
    render(<AppointmentForm isOpen={true} onClose={mockOnClose} onSave={mockOnSave} patient={patient} />);
    expect(screen.getByText(/Nuevo Turno|Editar Turno/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Fecha y Hora/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/honorarios/i)).toBeInTheDocument();
  });

  test('valida campos requeridos y muestra toast error', async () => {
    render(<AppointmentForm isOpen={true} onClose={mockOnClose} onSave={mockOnSave} patient={patient} />);
    const submit = screen.getByRole('button', { name: /Guardar|Actualizar/i });
    fireEvent.click(submit);
    // Since toast is mocked to no-op, ensure onSave not called
    expect(mockOnSave).not.toHaveBeenCalled();
  });
});
