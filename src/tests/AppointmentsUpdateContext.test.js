import React, { useState } from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';

// Mock supabaseClient BEFORE importing context
jest.mock('../lib/supabaseClient', () => ({
  supabase: {
    channel: jest.fn(() => ({
      on: jest.fn(function() { return this; }),
      subscribe: jest.fn(function() { return { unsubscribe: jest.fn() }; }),
    })),
    removeChannel: jest.fn(),
  },
}));

jest.mock('../App', () => {
  const React = require('react');
  return {
    AuthContext: React.createContext({
      token: null,
      isAuthenticated: false,
      handleAuth: jest.fn(),
    }),
  };
});

import { AppointmentsUpdateProvider, useAppointmentsUpdate } from '../contexts/AppointmentsUpdateContext';

describe('AppointmentsUpdateContext', () => {
  test('provides default updateTrigger of 0', () => {
    function TestChild() {
      const { updateTrigger } = useAppointmentsUpdate();
      return <span data-testid="update-trigger">{updateTrigger}</span>;
    }

    render(
      <AppointmentsUpdateProvider>
        <TestChild />
      </AppointmentsUpdateProvider>
    );

    expect(screen.getByTestId('update-trigger')).toHaveTextContent('0');
  });

  test('triggerUpdate increments updateTrigger', () => {
    jest.useFakeTimers();

    function TestChild() {
      const { updateTrigger, triggerUpdate } = useAppointmentsUpdate();
      return (
        <div>
          <span data-testid="update-trigger">{updateTrigger}</span>
          <button onClick={triggerUpdate}>Refresh</button>
        </div>
      );
    }

    render(
      <AppointmentsUpdateProvider>
        <TestChild />
      </AppointmentsUpdateProvider>
    );

    expect(screen.getByTestId('update-trigger')).toHaveTextContent('0');
    
    // triggerUpdate uses debounce (300ms), so we need to advance timers
    fireEvent.click(screen.getByText('Refresh'));
    act(() => {
      jest.advanceTimersByTime(400);
    });

    expect(screen.getByTestId('update-trigger')).toHaveTextContent('1');

    jest.useRealTimers();
  });

  test('onRecurringAppointmentsCreated calls triggerUpdate', () => {
    jest.useFakeTimers();

    function TestChild() {
      const { updateTrigger, onRecurringAppointmentsCreated } = useAppointmentsUpdate();
      return (
        <div>
          <span data-testid="update-trigger">{updateTrigger}</span>
          <button onClick={() => onRecurringAppointmentsCreated({ patientName: 'Test', frequency: 'semanal', createdCount: 3 })}>
            Recurring
          </button>
        </div>
      );
    }

    render(
      <AppointmentsUpdateProvider>
        <TestChild />
      </AppointmentsUpdateProvider>
    );

    expect(screen.getByTestId('update-trigger')).toHaveTextContent('0');
    
    fireEvent.click(screen.getByText('Recurring'));
    act(() => {
      jest.advanceTimersByTime(400);
    });

    expect(screen.getByTestId('update-trigger')).toHaveTextContent('1');

    jest.useRealTimers();
  });

  test('onAppointmentsDeleted calls triggerUpdate', () => {
    jest.useFakeTimers();

    function TestChild() {
      const { updateTrigger, onAppointmentsDeleted } = useAppointmentsUpdate();
      return (
        <div>
          <span data-testid="update-trigger">{updateTrigger}</span>
          <button onClick={() => onAppointmentsDeleted(2, 'Paciente Test')}>
            Delete
          </button>
        </div>
      );
    }

    render(
      <AppointmentsUpdateProvider>
        <TestChild />
      </AppointmentsUpdateProvider>
    );

    expect(screen.getByTestId('update-trigger')).toHaveTextContent('0');
    
    fireEvent.click(screen.getByText('Delete'));
    act(() => {
      jest.advanceTimersByTime(400);
    });

    expect(screen.getByTestId('update-trigger')).toHaveTextContent('1');

    jest.useRealTimers();
  });

  test('throws error when used outside of provider', () => {
    // Suppress console.error for this test
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});

    function TestChild() {
      useAppointmentsUpdate();
      return null;
    }

    expect(() => {
      render(<TestChild />);
    }).toThrow('useAppointmentsUpdate must be used within an AppointmentsUpdateProvider');

    spy.mockRestore();
  });

  test('onRecurringAppointmentsCreated supports old format (individual args)', () => {
    jest.useFakeTimers();

    function TestChild() {
      const { updateTrigger, onRecurringAppointmentsCreated } = useAppointmentsUpdate();
      return (
        <div>
          <span data-testid="update-trigger">{updateTrigger}</span>
          <button onClick={() => onRecurringAppointmentsCreated('Paciente', 'semanal', 3)}>
            Old Format
          </button>
        </div>
      );
    }

    render(
      <AppointmentsUpdateProvider>
        <TestChild />
      </AppointmentsUpdateProvider>
    );

    expect(screen.getByTestId('update-trigger')).toHaveTextContent('0');
    
    fireEvent.click(screen.getByText('Old Format'));
    act(() => {
      jest.advanceTimersByTime(400);
    });

    expect(screen.getByTestId('update-trigger')).toHaveTextContent('1');

    jest.useRealTimers();
  });

  test('debounce: rapid calls only trigger one update', () => {
    jest.useFakeTimers();

    function TestChild() {
      const { updateTrigger, triggerUpdate } = useAppointmentsUpdate();
      return (
        <div>
          <span data-testid="update-trigger">{updateTrigger}</span>
          <button onClick={triggerUpdate}>Refresh</button>
        </div>
      );
    }

    render(
      <AppointmentsUpdateProvider>
        <TestChild />
      </AppointmentsUpdateProvider>
    );

    expect(screen.getByTestId('update-trigger')).toHaveTextContent('0');
    
    // Click rapidly 3 times
    fireEvent.click(screen.getByText('Refresh'));
    fireEvent.click(screen.getByText('Refresh'));
    fireEvent.click(screen.getByText('Refresh'));
    
    // Only one increment should happen (debounce resets timeout)
    act(() => {
      jest.advanceTimersByTime(400);
    });

    // Only 1 increment because debounce cancels previous timeouts
    expect(screen.getByTestId('update-trigger')).toHaveTextContent('1');

    jest.useRealTimers();
  });
});