import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../App';
import { supabase } from '../../lib/supabaseClient';
import AdminPayments from '../../components/AdminPayments/AdminPayments';
import './AdminDashboard.css';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { handleAuth } = useContext(AuthContext);
  const [currentView, setCurrentView] = useState('payments');
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const token = localStorage.getItem('token');
  let adminId = null;
  if (token) {
    const match = token.match(/^user-(\d+)-/);
    if (match) adminId = match[1];
  }

  useEffect(() => {
    async function fetchUsers() {
      try {
        const { data, error } = await supabase
          .from('users')
          .select('id, user, role')
          .neq('role', 'admin')
          .order('user', { ascending: true });

        if (error) {
          console.error('Error fetching users:', error);
          return;
        }
        setUsers(data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchUsers();
  }, []);

  const handleLogout = () => {
    handleAuth(null);
    navigate('/login');
  };

  const menuItems = [
    { key: 'payments', label: '💰 Membresías', icon: '💰' },
    { key: 'users', label: '👥 Usuarios', icon: '👥' },
  ];

  return (
    <div className="admin-dashboard">
      <header className="admin-header">
        <div className="admin-title" onClick={() => setCurrentView('payments')} style={{ cursor: 'pointer' }}>
          <img src="/logo.svg" alt="Psi" className="admin-logo" />
          <div className="title-content">
            <span className="main-title">Panel Admin</span>
            {currentView === 'payments' && <span className="section-indicator">- Membresías</span>}
            {currentView === 'users' && <span className="section-indicator">- Usuarios</span>}
          </div>
        </div>
        <nav className="admin-nav">
          {menuItems.map((item) => (
            <button
              key={item.key}
              className={`nav-btn ${currentView === item.key ? 'active' : ''}`}
              onClick={() => setCurrentView(item.key)}
            >
              {item.label}
            </button>
          ))}
          <button className="nav-btn logout-btn" onClick={handleLogout}>
            Cerrar sesión
          </button>
        </nav>
      </header>

      <main className="admin-content">
        {currentView === 'payments' && (
          <AdminPayments user={{ id: adminId, role: 'admin' }} />
        )}
        {currentView === 'users' && (
          <div className="users-section">
            <AdminPayments user={{ id: adminId, role: 'admin' }} />
          </div>
        )}
      </main>
    </div>
  );
}