import React, { useEffect, useState } from 'react';
import { fetchMembershipStatus } from '../../lib/membershipPayments';
import './MembershipReminder.css';

function formatDate(value) {
  const [year, month, day] = value.split('-');
  return `${day}/${month}/${year}`;
}

export default function MembershipReminder({ userEmail, onOpenChat }) {
  const [membership, setMembership] = useState(null);

  useEffect(() => {
    if (!userEmail) {
      setMembership(null);
      return undefined;
    }

    let active = true;
    const checkMembership = async () => {
      try {
        const status = await fetchMembershipStatus(userEmail);
        if (active) setMembership(status.show ? status : null);
      } catch (error) {
        console.error('[MembershipReminder]', error);
      }
    };

    checkMembership();
    const interval = window.setInterval(checkMembership, 6 * 60 * 60 * 1000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [userEmail]);

  if (!membership) return null;

  return (
    <aside className="membership-reminder" role="status">
      <div className="membership-reminder-copy">
        <strong>💳 Renovación de {membership.plan}</strong>
        <span>
          {membership.is_first_month
            ? `Tu primer mes gratis termina el ${formatDate(membership.due_date)}.`
            : `Tu membresía vence el ${formatDate(membership.due_date)}.`}
          {' '}Transferí ${membership.amount.toLocaleString('es-AR')} al alias{' '}
          <strong>{membership.alias}</strong> para continuar.
        </span>
      </div>
      <button type="button" onClick={onOpenChat}>
        Enviar comprobante
      </button>
    </aside>
  );
}
