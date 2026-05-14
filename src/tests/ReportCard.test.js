import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ReportCard from '../components/Reports/ReportCard';

// Mock ReactQuill
jest.mock('react-quill', () => {
  return function MockQuill({ value, onChange }) {
    return (
      <textarea
        data-testid="mock-quill"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    );
  };
});

describe('ReportCard', () => {
  const mockReport = {
    id: 1,
    created_at: '2025-01-15T10:00:00',
    dx_presumptive: 'Ansiedad generalizada',
    dx_psychiatric: 'F41.1',
    dx_semesterly: '<p>Evolución semestral</p>',
    dx_annual: '<p>Evolución anual</p>',
    medication: '<p>Sertralina 50mg</p>',
    patient: { name: 'José', last_name: 'García' },
  };

  const mockOnUpdate = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders patient name in header', () => {
    render(<ReportCard report={mockReport} onUpdate={mockOnUpdate} />);
    expect(screen.getByText('José García')).toBeInTheDocument();
  });

  test('renders date in header', () => {
    render(<ReportCard report={mockReport} onUpdate={mockOnUpdate} />);
    expect(screen.getByText('2025-01-15')).toBeInTheDocument();
  });

  test('does not show content when not expanded', () => {
    render(<ReportCard report={mockReport} onUpdate={mockOnUpdate} />);
    expect(screen.queryByText('Presuntivo:')).not.toBeInTheDocument();
  });

  test('shows content when header is clicked', () => {
    render(<ReportCard report={mockReport} onUpdate={mockOnUpdate} />);
    fireEvent.click(screen.getByText('José García'));
    expect(screen.getByText('Presuntivo:')).toBeInTheDocument();
  });

  test('shows edit button when expanded', () => {
    render(<ReportCard report={mockReport} onUpdate={mockOnUpdate} />);
    fireEvent.click(screen.getByText('José García'));
    expect(screen.getByText('Editar')).toBeInTheDocument();
  });

  test('enters edit mode when Editar is clicked', () => {
    render(<ReportCard report={mockReport} onUpdate={mockOnUpdate} />);
    fireEvent.click(screen.getByText('José García'));
    fireEvent.click(screen.getByText('Editar'));
    expect(screen.getByPlaceholderText('DX Presuntivo')).toBeInTheDocument();
  });

  test('shows all diagnostic fields in view mode', () => {
    render(<ReportCard report={mockReport} onUpdate={mockOnUpdate} />);
    fireEvent.click(screen.getByText('José García'));
    expect(screen.getByText('Ansiedad generalizada')).toBeInTheDocument();
    expect(screen.getByText('F41.1')).toBeInTheDocument();
  });

  test('toggles arrow direction on expand/collapse', () => {
    render(<ReportCard report={mockReport} onUpdate={mockOnUpdate} />);
    // Initially collapsed (down arrow ▼)
    expect(screen.getByText('\u25bc')).toBeInTheDocument();
    // Click to expand
    fireEvent.click(screen.getByText('José García'));
    expect(screen.getByText('\u25b2')).toBeInTheDocument();
  });

  test('calls onUpdate with form data when saving', async () => {
    mockOnUpdate.mockResolvedValue(undefined);
    render(<ReportCard report={mockReport} onUpdate={mockOnUpdate} />);
    fireEvent.click(screen.getByText('José García'));
    fireEvent.click(screen.getByText('Editar'));
    fireEvent.click(screen.getByText('Guardar'));
    expect(mockOnUpdate).toHaveBeenCalledWith(expect.objectContaining({ id: 1 }));
  });

  test('shows Cancelar button in edit mode', () => {
    render(<ReportCard report={mockReport} onUpdate={mockOnUpdate} />);
    fireEvent.click(screen.getByText('José García'));
    fireEvent.click(screen.getByText('Editar'));
    expect(screen.getByText('Cancelar')).toBeInTheDocument();
  });

  test('cancels edit mode when Cancelar is clicked', () => {
    render(<ReportCard report={mockReport} onUpdate={mockOnUpdate} />);
    fireEvent.click(screen.getByText('José García'));
    fireEvent.click(screen.getByText('Editar'));
    fireEvent.click(screen.getByText('Cancelar'));
    expect(screen.getByText('Editar')).toBeInTheDocument();
    expect(screen.queryByText('Guardar')).not.toBeInTheDocument();
  });

  test('shows error message when save fails', async () => {
    mockOnUpdate.mockRejectedValue(new Error('fail'));
    render(<ReportCard report={mockReport} onUpdate={mockOnUpdate} />);
    fireEvent.click(screen.getByText('José García'));
    fireEvent.click(screen.getByText('Editar'));
    fireEvent.click(screen.getByText('Guardar'));
    // Wait for async
    await screen.findByText('Error al guardar');
  });
});