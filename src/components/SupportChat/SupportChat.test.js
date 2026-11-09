import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import SupportChat from './SupportChat';
import { uploadPaymentReceipt } from '../../lib/membershipPayments';

jest.mock('../../lib/membershipPayments', () => ({
  uploadPaymentReceipt: jest.fn(),
}));

describe('SupportChat payment receipts', () => {
  beforeEach(() => {
    localStorage.clear();
    window.HTMLElement.prototype.scrollIntoView = jest.fn();
    uploadPaymentReceipt.mockResolvedValue({ ok: true });
  });

  it('sends an attached receipt for the signed-in user without confirming payment', async () => {
    const userEmail = 'client@example.test';
    const file = new File(['receipt'], 'receipt.pdf', { type: 'application/pdf' });
    const { container } = render(<SupportChat appId="psi-manager" userEmail={userEmail} />);

    fireEvent.click(screen.getByTitle('Soporte Técnico'));
    fireEvent.change(container.querySelector('input[type="file"]'), {
      target: { files: [file] },
    });

    expect(await screen.findByText(/el pago todavía no está confirmado/i)).toBeInTheDocument();
    expect(uploadPaymentReceipt).toHaveBeenCalledWith(userEmail, file);
  });
});
