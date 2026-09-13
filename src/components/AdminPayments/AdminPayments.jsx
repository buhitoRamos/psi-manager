import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { toast } from 'react-hot-toast';
import { getAuthStatusByUserId, updateAuthStatus, insertAuthStatus } from '../../lib/authStatusRest';
import ConfirmModal from '../ConfirmModal/ConfirmModal';
import './AdminPayments.css';

export default function AdminPayments({ user }) {
  const [users, setUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [amount, setAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    const off = d.getTimezoneOffset();
    const local = new Date(d.getTime() - off * 60 * 1000);
    return local.toISOString().slice(0, 16);
  });
  const [payments, setPayments] = useState([]);
  const [allPayments, setAllPayments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [backingUp, setBackingUp] = useState(false);
  const [viewMode, setViewMode] = useState('register');
  const [deleteUserModal, setDeleteUserModal] = useState({
    isOpen: false,
    userId: null,
    userName: '',
  });
  const [deletingUser, setDeletingUser] = useState(false);
  // eslint-disable-next-line no-unused-vars
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  // eslint-disable-next-line no-unused-vars
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);

  useEffect(() => {
    async function fetchUsers() {
      try {
        // Try with role column first; fall back to without if column doesn't exist yet
        let data, error;
        ({ data, error } = await supabase
          .from('users')
          .select('id, user, role')
          .or('role.neq.admin,role.is.null')
          .order('user', { ascending: true }));

        if (error) {
          // Column 'role' may not exist yet — fall back to basic query
          ({ data, error } = await supabase
            .from('users')
            .select('id, user')
            .order('user', { ascending: true }));
        }

        if (error) {
          console.error('Error fetching users:', error);
          toast.error('Error al cargar usuarios');
          return;
        }
        setUsers(data || []);
      } catch (err) {
        console.error(err);
        toast.error('Error inesperado');
      }
    }
    fetchUsers();
  }, []);

  useEffect(() => {
    async function fetchAllPayments() {
      if (viewMode !== 'view') return;
      try {
        let query = supabase
          .from('admin_payments')
          .select('*')
          .order('created_at', { ascending: false });

        if (selectedUserId) {
          query = query.eq('user_id', selectedUserId);
        }

        const { data, error } = await query;
        if (error) {
          console.error('Error fetching all payments:', error);
          return;
        }
        setAllPayments(data || []);
      } catch (err) {
        console.error(err);
      }
    }
    fetchAllPayments();
  }, [selectedUserId, viewMode]);

  useEffect(() => {
    async function fetchPayments() {
      if (!selectedUserId || viewMode !== 'register') {
        setPayments([]);
        return;
      }
      try {
        const startDate = new Date(selectedYear, selectedMonth - 1, 1);
        const endDate = new Date(selectedYear, selectedMonth, 1);

        const { data, error } = await supabase
          .from('admin_payments')
          .select('*')
          .eq('user_id', selectedUserId)
          .gte('created_at', startDate.toISOString())
          .lt('created_at', endDate.toISOString())
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error fetching payments:', error);
          return;
        }
        setPayments(data || []);
      } catch (err) {
        console.error(err);
      }
    }
    fetchPayments();
  }, [selectedUserId, selectedYear, selectedMonth, viewMode]);

  async function handleRegisterPayment(e) {
    e.preventDefault();

    if (!selectedUserId) {
      toast.error('Selecciona un usuario');
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      toast.error('Ingresa un monto válido');
      return;
    }

    setLoading(true);

    try {
      const createdAtIso = new Date(paymentDate).toISOString();
      const { error } = await supabase
        .from('admin_payments')
        .insert([
          {
            user_id: selectedUserId,
            amount: parseFloat(amount),
            created_at: createdAtIso,
          },
        ]);

      if (error) {
        console.error('Error registering payment:', error);
        toast.error('Error al registrar pago');
        setLoading(false);
        return;
      }

      toast.success('Pago registrado correctamente');
      setAmount('');

      const d = new Date(paymentDate);
      const startDate = new Date(d.getFullYear(), d.getMonth(), 1);
      const endDate = new Date(d.getFullYear(), d.getMonth() + 1, 1);
      const { data } = await supabase
        .from('admin_payments')
        .select('*')
        .eq('user_id', selectedUserId)
        .gte('created_at', startDate.toISOString())
        .lt('created_at', endDate.toISOString())
        .order('created_at', { ascending: false });

      setPayments(data || []);
    } catch (err) {
      console.error(err);
      toast.error('Error inesperado');
    } finally {
      setLoading(false);
    }
  }

  async function handleToggleUserStatus(userId, currentStatus) {
    try {
      const newStatus = !currentStatus;

      // Primero verificar si ya existe un registro en auth_status
      const existingStatus = await getAuthStatusByUserId(userId);

      if (existingStatus && existingStatus.id) {
        // Actualizar registro existente usando REST
        await updateAuthStatus(userId, newStatus);
      } else {
        // Crear nuevo registro usando REST
        await insertAuthStatus(userId, newStatus);
      }

      toast.success(newStatus ? 'Usuario activado' : 'Usuario desactivado');

      // Refresh users
      let data, fetchError;
      ({ data, error: fetchError } = await supabase
        .from('users')
        .select('id, user, role')
        .or('role.neq.admin,role.is.null')
        .order('user', { ascending: true }));

      if (fetchError) {
        ({ data } = await supabase
          .from('users')
          .select('id, user')
          .order('user', { ascending: true }));
      }

      if (!fetchError) setUsers(data || []);
    } catch (err) {
      console.error(err);
      toast.error('Error inesperado');
    }
  }

  async function handleDeleteUser(userId, userName) {
    setDeleteUserModal({ isOpen: true, userId, userName });
  }

  async function confirmDeleteUser() {
    const { userId, userName } = deleteUserModal;
    if (!userId) return;

    setDeletingUser(true);
    try {
      // Usar RPC SECURITY DEFINER para eliminar en cascada (bypassea RLS)
      const { error } = await supabase.rpc('delete_user_cascade', {
        user_id_param: userId,
      });

      if (error) {
        console.error('Error deleting user:', error);
        toast.error('Error al eliminar usuario');
        return;
      }

      toast.success(`Usuario "${userName}" eliminado correctamente`);

      // Refrescar lista de usuarios
      let data, fetchError;
      ({ data, error: fetchError } = await supabase
        .from('users')
        .select('id, user, role')
        .or('role.neq.admin,role.is.null')
        .order('user', { ascending: true }));

      if (fetchError) {
        ({ data } = await supabase
          .from('users')
          .select('id, user')
          .order('user', { ascending: true }));
      }

      if (!fetchError) setUsers(data || []);
    } catch (err) {
      console.error(err);
      toast.error('Error inesperado al eliminar usuario');
    } finally {
      setDeletingUser(false);
      setDeleteUserModal({ isOpen: false, userId: null, userName: '' });
    }
  }

  async function handleDeletePayment(paymentId) {
    if (!window.confirm('¿Estás seguro de que querés eliminar este pago?')) return;

    try {
      const { error } = await supabase
        .from('admin_payments')
        .delete()
        .eq('id', paymentId);

      if (error) {
        console.error('Error deleting payment:', error);
        toast.error('Error al eliminar pago');
        return;
      }

      toast.success('Pago eliminado correctamente');

      // Refresh payments in current view
      if (viewMode === 'view') {
        let query = supabase
          .from('admin_payments')
          .select('*')
          .order('created_at', { ascending: false });
        if (selectedUserId) {
          query = query.eq('user_id', selectedUserId);
        }
        const { data } = await query;
        setAllPayments(data || []);
      } else if (viewMode === 'register' && selectedUserId) {
        const startDate = new Date(selectedYear, selectedMonth - 1, 1);
        const endDate = new Date(selectedYear, selectedMonth, 1);
        const { data } = await supabase
          .from('admin_payments')
          .select('*')
          .eq('user_id', selectedUserId)
          .gte('created_at', startDate.toISOString())
          .lt('created_at', endDate.toISOString())
          .order('created_at', { ascending: false });
        setPayments(data || []);
      }
    } catch (err) {
      console.error(err);
      toast.error('Error inesperado al eliminar');
    }
  }

  async function handleBackup() {
    setBackingUp(true);
    try {
      // Tablas de la base de datos a respaldar
      const tables = [
        'users',
        'patients',
        'appointments',
        'contributions',
        'progress',
        'admin_payments',
        'auth_status',
      ];

      const backup = {};
      const errors = [];

      for (const table of tables) {
        try {
          const { data, error } = await supabase.from(table).select('*');
          if (error) {
            errors.push(`${table}: ${error.message}`);
            continue;
          }
          backup[table] = data || [];
        } catch (err) {
          errors.push(`${table}: ${err.message}`);
        }
      }

      if (Object.keys(backup).length === 0) {
        toast.error('No se pudo obtener ningún dato para el backup');
        return;
      }

      // Descargar como archivo JSON
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `backup-${timestamp}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      if (errors.length > 0) {
        toast.error(`Backup parcial: ${errors.length} tabla(s) con error`);
        console.warn('Errores de backup:', errors);
      } else {
        toast.success('Backup descargado correctamente');
      }
    } catch (err) {
      console.error(err);
      toast.error('Error al generar el backup');
    } finally {
      setBackingUp(false);
    }
  }

  function getMonthName(month) {
    const months = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
    ];
    return months[month - 1];
  }

  function groupPaymentsByMonth(paymentsArray) {
    const grouped = {};
    paymentsArray.forEach((payment) => {
      const date = new Date(payment.created_at);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (!grouped[monthKey]) grouped[monthKey] = [];
      grouped[monthKey].push(payment);
    });

    return Object.entries(grouped)
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([monthKey, monthPayments]) => ({
        monthKey,
        payments: monthPayments,
        total: monthPayments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0),
      }));
  }

  const selectedUser = users.find((u) => String(u.id) === String(selectedUserId));
  const totalPayments = payments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);
  const totalAllPayments = allPayments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);
  const groupedPayments = groupPaymentsByMonth(allPayments);

  return (
    <div className="admin-payments">
      <div className="payments-tabs">
        <button
          className={`tab-button ${viewMode === 'register' ? 'active' : ''}`}
          onClick={() => setViewMode('register')}
        >
          Registrar Pago
        </button>
        <button
          className={`tab-button ${viewMode === 'view' ? 'active' : ''}`}
          onClick={() => setViewMode('view')}
        >
          Ver Historial
        </button>
        <button
          className={`tab-button ${viewMode === 'users' ? 'active' : ''}`}
          onClick={() => setViewMode('users')}
        >
          Gestionar Usuarios
        </button>
        <button
          className="tab-button backup-button"
          onClick={handleBackup}
          disabled={backingUp}
          title="Descargar backup de la base de datos"
        >
          {backingUp ? 'Generando...' : '💾 Backup'}
        </button>
      </div>

      <div className="payments-container">
        {viewMode === 'users' && (
          <div className="users-management">
            <h3>Gestión de Usuarios</h3>
            <p className="period-info">Activa o desactiva el acceso de los psicólogos a la plataforma.</p>
            <div className="users-list">
              {users.length === 0 ? (
                <p className="no-payments">No hay usuarios registrados</p>
              ) : (
                users.map((u) => (
                  <UserStatusRow
                    key={u.id}
                    userId={u.id}
                    userName={u.user}
                    onToggle={handleToggleUserStatus}
                    onDelete={handleDeleteUser}
                  />
                ))
              )}
            </div>
          </div>
        )}

        {viewMode === 'view' && (
          <div className="view-payments">
            <h3>Historial Completo de Pagos</h3>
            <p className="period-info">
              {selectedUser ? `Filtrado por: ${selectedUser.user}` : 'Todos los usuarios'}
            </p>

            <div className="user-selection">
              <h4>Filtrar por usuario (opcional)</h4>
              <select
                value={selectedUserId || ''}
                onChange={(e) => setSelectedUserId(e.target.value || null)}
                className="user-select"
              >
                <option value="">-- Mostrar todos --</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.user}
                  </option>
                ))}
              </select>
            </div>

            {groupedPayments.length > 0 ? (
              <>
                <div className="payments-by-month">
                  {groupedPayments.map(({ monthKey, payments: monthPayments, total }) => {
                    const [year, month] = monthKey.split('-');
                    const monthNum = parseInt(month);

                    return (
                      <div key={monthKey} className="month-section">
                        <div className="month-header">
                          <span className="month-title">
                            {getMonthName(monthNum)} {year}
                          </span>
                          <span className="month-total">${total.toFixed(2)}</span>
                        </div>

                        <div className="month-payments">
                          {monthPayments.map((payment) => {
                            const paymentUser = users.find((u) => String(u.id) === String(payment.user_id));
                            return (
                              <div key={payment.id} className="payment-card">
                                <div className="payment-info">
                                  <div className="payment-date">
                                    {new Date(payment.created_at).toLocaleDateString('es-AR', {
                                      day: 'numeric',
                                      month: 'short',
                                      year: 'numeric',
                                    })}
                                  </div>
                                  <div className="payment-user">
                                    {paymentUser?.user || 'Usuario desconocido'}
                                  </div>
                                  <div className="payment-description">
                                    {payment.description || 'Membresía mensual'}
                                  </div>
                                </div>
                                <div className="payment-amount">
                                  ${parseFloat(payment.amount).toFixed(2)}
                                </div>
                                <div className={`payment-status ${payment.status || 'completed'}`}>
                                  {payment.status === 'completed' ? '✓' : 'P'}
                                </div>
                                <button
                                  className="btn-delete-payment"
                                  onClick={() => handleDeletePayment(payment.id)}
                                  title="Eliminar pago"
                                >
                                  ✕
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="payments-grand-total">
                  <strong>Total {selectedUser ? `de ${selectedUser.user}` : 'histórico'}:</strong>
                  <span className="total-amount">${totalAllPayments.toFixed(2)}</span>
                </div>
              </>
            ) : (
              <div className="no-payments">No hay pagos registrados</div>
            )}
          </div>
        )}

        {viewMode === 'register' && (
          <>
            <div className="user-selection">
              <h3>Seleccionar Usuario</h3>
              <select
                value={selectedUserId || ''}
                onChange={(e) => setSelectedUserId(e.target.value || null)}
                className="user-select"
              >
                <option value="">-- Elige un psicólogo --</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.user}
                  </option>
                ))}
              </select>
            </div>

            {selectedUser && (
              <>
                <div className="period-selection">
                  <h3>Fecha del pago</h3>
                  <div className="period-inputs">
                    <div className="input-group">
                      <label>Fecha y hora</label>
                      <input
                        type="datetime-local"
                        value={paymentDate}
                        onChange={(e) => setPaymentDate(e.target.value)}
                        className="date-input"
                      />
                    </div>
                  </div>
                </div>

                <div className="register-payment-form">
                  <h3>Registrar Membresía para {selectedUser.user}</h3>
                  <p className="period-info">
                    {new Date(paymentDate).toLocaleDateString('es-AR', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>

                  <form onSubmit={handleRegisterPayment}>
                    <label>
                      Monto ($)
                      <input
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="0.00"
                        step="0.01"
                        min="0"
                        disabled={loading}
                      />
                    </label>

                    <button
                      type="submit"
                      className="btn-register"
                      disabled={loading || !amount || !paymentDate}
                    >
                      {loading ? 'Registrando...' : 'Registrar Pago'}
                    </button>
                  </form>

                  {payments.length > 0 && (
                    <div className="existing-payments">
                      <h4>Pagos de {getMonthName(selectedMonth)} {selectedYear}</h4>
                      <p className="period-info">Total: ${totalPayments.toFixed(2)}</p>
                      {payments.map((p) => (
                        <div key={p.id} className="payment-card">
                          <div className="payment-info">
                            <div className="payment-date">
                              {new Date(p.created_at).toLocaleDateString('es-AR')}
                            </div>
                            <div className="payment-description">
                              {p.description || 'Membresía mensual'}
                            </div>
                          </div>
                          <div className="payment-amount">${parseFloat(p.amount).toFixed(2)}</div>
                          <button
                            className="btn-delete-payment"
                            onClick={() => handleDeletePayment(p.id)}
                            title="Eliminar pago"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </>
        )}
      </div>

      <ConfirmModal
        isOpen={deleteUserModal.isOpen}
        onClose={() => setDeleteUserModal({ isOpen: false, userId: null, userName: '' })}
        onConfirm={confirmDeleteUser}
        title="Eliminar usuario"
        message={`¿Estás seguro de eliminar al usuario "${deleteUserModal.userName}"?\n\nSe eliminarán en cascada:\n- Pacientes\n- Turnos (appointments)\n- Pagos (admin_payments)\n- Contribuciones\n- Progreso\n- Estado de acceso\n\nEsta acción NO se puede deshacer.`}
        confirmText={deletingUser ? 'Eliminando...' : 'Eliminar'}
        cancelText="Cancelar"
        type="danger"
      />
    </div>
  );
}

function UserStatusRow({ userId, userName, onToggle, onDelete }) {
  const [status, setStatus] = React.useState(null);
  const [loading, setLoading] = React.useState(true);

  useEffect(() => {
    async function fetchStatus() {
      try {
        const data = await getAuthStatusByUserId(userId);
        if (data && data.status !== undefined) {
          setStatus(data.status);
        } else {
          // No hay registro — default a activo
          setStatus(true);
        }
      } catch {
        setStatus(true); // Default to active if table doesn't exist
      } finally {
        setLoading(false);
      }
    }
    fetchStatus();
  }, [userId]);

  async function handleToggle() {
    await onToggle(userId, status);
    setStatus(!status);
  }

  if (loading) return <div className="user-row loading">Cargando...</div>;

  return (
    <div className={`user-row ${status ? 'active' : 'inactive'}`}>
      <div className="user-info">
        <span className="user-name">{userName}</span>
        <span className={`status-badge ${status ? 'badge-active' : 'badge-inactive'}`}>
          {status ? '✓ Activo' : '✗ Inactivo'}
        </span>
      </div>
      <div className="user-row-actions">
        <button
          className={`toggle-btn ${status ? 'btn-deactivate' : 'btn-activate'}`}
          onClick={handleToggle}
        >
          {status ? 'Desactivar' : 'Activar'}
        </button>
        <button
          className="toggle-btn btn-delete-user"
          onClick={() => onDelete(userId, userName)}
          title="Eliminar usuario y todos sus datos"
        >
          Eliminar
        </button>
      </div>
    </div>
  );
}