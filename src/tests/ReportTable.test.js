import React from 'react';
import { render, screen } from '@testing-library/react';
import ReportTable from '../components/Reports/ReportTable';

describe('ReportTable', () => {
  test('shows message when no reports', () => {
    render(<ReportTable reports={[]} />);
    expect(screen.getByText('No hay informes cargados.')).toBeInTheDocument();
  });

  test('renders table with report data', () => {
    const reports = [
      {
        id: 1,
        created_at: '2025-01-15',
        dx_presumptive: 'Ansiedad',
        dx_psychiatric: 'F41.1',
        dx_semesterly: '<p>Semestral</p>',
        dx_annual: '<p>Anual</p>',
        patient: { patient_name: 'José', patient_last_name: 'García' },
        medication: '<p>Sertralina</p>',
      },
    ];
    render(<ReportTable reports={reports} />);
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('Ansiedad')).toBeInTheDocument();
    expect(screen.getByText('F41.1')).toBeInTheDocument();
    expect(screen.getByText('José')).toBeInTheDocument();
    expect(screen.getByText('García')).toBeInTheDocument();
  });

  test('renders multiple reports in rows', () => {
    const reports = [
      {
        id: 1,
        created_at: '2025-01-15',
        dx_presumptive: 'Ansiedad',
        dx_psychiatric: 'F41.1',
        dx_semesterly: '',
        dx_annual: '',
        patient: { patient_name: 'José', patient_last_name: 'García' },
        medication: '',
      },
      {
        id: 2,
        created_at: '2025-02-20',
        dx_presumptive: 'Depresión',
        dx_psychiatric: 'F32.1',
        dx_semesterly: '',
        dx_annual: '',
        patient: { patient_name: 'María', patient_last_name: 'López' },
        medication: '',
      },
    ];
    render(<ReportTable reports={reports} />);
    expect(screen.getByText('Ansiedad')).toBeInTheDocument();
    expect(screen.getByText('Depresión')).toBeInTheDocument();
  });

  test('handles missing patient data gracefully', () => {
    const reports = [
      {
        id: 1,
        created_at: '2025-01-15',
        dx_presumptive: 'Test',
        dx_psychiatric: '',
        dx_semesterly: '',
        dx_annual: '',
        patient: null,
        medication: '',
      },
    ];
    render(<ReportTable reports={reports} />);
    expect(screen.getByText('Test')).toBeInTheDocument();
  });

  test('renders table headers', () => {
    const reports = [
      { id: 1, created_at: '', dx_presumptive: '', dx_psychiatric: '', dx_semesterly: '', dx_annual: '', patient: {}, medication: '' },
    ];
    render(<ReportTable reports={reports} />);
    expect(screen.getByText('id')).toBeInTheDocument();
    expect(screen.getByText('created_at')).toBeInTheDocument();
    expect(screen.getByText('dx_presumptive')).toBeInTheDocument();
    expect(screen.getByText('dx_psychiatric')).toBeInTheDocument();
    expect(screen.getByText('Nombre')).toBeInTheDocument();
    expect(screen.getByText('Apellido')).toBeInTheDocument();
  });
});