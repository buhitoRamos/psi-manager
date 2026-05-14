import React from 'react';
import { render, screen } from '@testing-library/react';
import Loading from '../components/Loading/Loading';

describe('Loading', () => {
  test('renders with default message', () => {
    render(<Loading />);
    expect(screen.getByText('Cargando...')).toBeInTheDocument();
  });

  test('renders with custom message', () => {
    render(<Loading message="Por favor espere" />);
    expect(screen.getByText('Por favor espere')).toBeInTheDocument();
  });

  test('renders spinner by default', () => {
    const { container } = render(<Loading />);
    expect(container.querySelector('.loading-spinner')).toBeInTheDocument();
  });

  test('hides spinner when showSpinner is false', () => {
    const { container } = render(<Loading showSpinner={false} />);
    expect(container.querySelector('.loading-spinner')).not.toBeInTheDocument();
  });

  test('renders children when provided', () => {
    render(<Loading>Extra content</Loading>);
    expect(screen.getByText('Extra content')).toBeInTheDocument();
  });

  test('does not render children section when no children provided', () => {
    const { container } = render(<Loading />);
    expect(container.querySelector('.loading-extra-content')).not.toBeInTheDocument();
  });

  test('applies inline class by default', () => {
    const { container } = render(<Loading />);
    expect(container.querySelector('.loading-inline')).toBeInTheDocument();
  });

  test('applies overlay class when overlay is true', () => {
    const { container } = render(<Loading overlay={true} />);
    expect(container.querySelector('.loading-overlay')).toBeInTheDocument();
  });

  test('applies size class based on size prop', () => {
    const { container } = render(<Loading size="large" />);
    expect(container.querySelector('.loading-large')).toBeInTheDocument();
  });

  test('applies medium size class by default', () => {
    const { container } = render(<Loading />);
    expect(container.querySelector('.loading-medium')).toBeInTheDocument();
  });

  test('applies small size class', () => {
    const { container } = render(<Loading size="small" />);
    expect(container.querySelector('.loading-small')).toBeInTheDocument();
  });
});