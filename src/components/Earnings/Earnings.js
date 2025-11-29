import React, { useEffect, useState, useContext } from 'react';
import supabaseRest from '../../lib/supabaseRest';
import './Earnings.css';
import { AuthContext } from '../../App';

function formatMonthKey(dateStr) {
  const d = new Date(dateStr);
  const month = d.toLocaleString('default', { month: 'short' });
  const year = d.getFullYear();
  return `${month} ${year}`;
}

function Earnings() {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState([]);
  const { token, isAuthenticated } = useContext(AuthContext);

  // extract userId from token (same simple parser used elsewhere)
  function extractUserIdFromToken(token) {
    if (!token) return null;
    const parts = token.split('-');
    if (parts.length >= 2 && parts[0] === 'user') {
      const userId = parseInt(parts[1], 10);
      return isNaN(userId) ? null : userId;
    }
    return null;
  }

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const userId = extractUserIdFromToken(token);
        if (!userId) {
          setSummary([]);
          return;
        }

        const [appointments, payments] = await Promise.all([
          supabaseRest.getAppointmentsByUserId(userId),
          supabaseRest.getPaymentsByUserId(userId)
        ]);

        // Group appointments by month (use appointment.date or created_at)
        const months = {};

        (appointments || []).forEach(a => {
          const key = formatMonthKey(a.date || a.created_at || a.appointment_date || new Date());
          if (!months[key]) months[key] = { earnings: 0, debt: 0 };
          months[key].earnings += parseFloat(a.amount || 0) || 0;
        });

        // Sum payments per month. If payment is linked to an appointment, prefer its appointment_date
        (payments || []).forEach(p => {
          const key = formatMonthKey(p.appointment_date || p.payment_date || p.created_at || new Date());
          if (!months[key]) months[key] = { earnings: 0, debt: 0 };
          months[key].earnings += parseFloat(p.amount || p.payment || 0) || 0;
        });

        // Calculate debt per month: debt = appointments amounts (due) - payments
        // We will approximate debt by subtracting payments from appointments in a month
        const monthList = Object.keys(months).map(key => ({ month: key, earnings: months[key].earnings, debt: months[key].debt || 0 }));

        // To be more accurate, compute debts by comparing appointments and payments totals
        const appByMonth = {};
        (appointments || []).forEach(a => {
          // only consider appointments that should generate a charge (mirroring getPatientDebt)
          if (!(a.status === 'finalizado' || a.status === 'cancelado')) return;
          const key = formatMonthKey(a.date || a.created_at || a.appointment_date || new Date());
          appByMonth[key] = (appByMonth[key] || 0) + (parseFloat(a.amount || 0) || 0);
        });
        const payByMonth = {};
        (payments || []).forEach(p => {
          const key = formatMonthKey(p.appointment_date || p.payment_date || p.created_at || new Date());
          payByMonth[key] = (payByMonth[key] || 0) + (parseFloat(p.amount || p.payment || 0) || 0);
        });

        const allKeys = new Set([...Object.keys(appByMonth), ...Object.keys(payByMonth)]);
        const result = Array.from(allKeys).map(k => ({
          month: k,
          earnings: payByMonth[k] || 0,
          due: Math.max(0, (appByMonth[k] || 0) - (payByMonth[k] || 0))
        })).sort((a,b) => {
          // sort by month descending (attempt parse)
          return new Date(b.month) - new Date(a.month);
        });

        setSummary(result);
      } catch (err) {
        console.error('Earnings load error', err);
        setSummary([]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [token, isAuthenticated]);

  // Filters state
  const [filterYear, setFilterYear] = useState('');
  const [fromMonth, setFromMonth] = useState('');
  const [toMonth, setToMonth] = useState('');

  // Derived filtered summary and totals
  const filtered = summary.filter(s => {
    if (filterYear) {
      return s.month.includes(filterYear);
    }
    if (fromMonth && toMonth) {
      // month keys like 'Nov 2025' -> compare by yyyy-mm
      const mk = new Date(s.month);
      const fm = new Date(fromMonth + '-01');
      const tm = new Date(toMonth + '-01');
      return mk >= fm && mk <= tm;
    }
    return true;
  });

  const totalEarnings = filtered.reduce((sum, x) => sum + (x.earnings || 0), 0);
  const totalDebt = filtered.reduce((sum, x) => sum + (x.due || 0), 0);

  if (loading) return <div className="earnings-container">Cargando ganancias...</div>;

  return (
    <div className="earnings-container">
      <h2>Ganancias por Mes</h2>
      <div className="earnings-controls">
        <select value={filterYear} onChange={e => setFilterYear(e.target.value)}>
          <option value="">Todos los años</option>
          {/* build year options from summary */}
          {[...new Set(summary.map(s => s.month.split(' ').pop()))].map(y => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
        <label>Desde:</label>
        <input type="month" value={fromMonth} onChange={e => setFromMonth(e.target.value)} />
        <label>Hasta:</label>
        <input type="month" value={toMonth} onChange={e => setToMonth(e.target.value)} />
      </div>

      <div className="earnings-totals">
        <div className="earnings-total-value">Total: ${totalEarnings.toFixed(2)}</div>
        <div className="earnings-total-debt">Total deuda: ${totalDebt.toFixed(2)}</div>
      </div>

      {summary.length === 0 ? (
        <div className="earnings-empty">No hay datos de sesiones o pagos.</div>
      ) : (
        <div className="earnings-list">
          {filtered.map((s) => (
            <div key={s.month} className="earnings-card">
              <div className="earnings-header">
                <div className="earnings-month">{s.month}</div>
                <div className="earnings-value">${(s.earnings || 0).toFixed(2)}</div>
                {s.due > 0 && <div className="earnings-debt">Deuda: ${s.due.toFixed(2)}</div>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Earnings;
