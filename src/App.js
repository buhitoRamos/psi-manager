import './App.css';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect, createContext } from 'react';
import { Toaster } from 'react-hot-toast';
import { AppointmentsUpdateProvider } from './contexts/AppointmentsUpdateContext';
import LoginPage from './pages/login-page/login';
import Dashboard from './pages/dahboard-page/dashboard';


export const AuthContext = createContext(null);

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem('token'));
  const [token, setToken] = useState(localStorage.getItem('token'));

  const handleAuth = (newToken) => {
    if (newToken) {
      localStorage.setItem('token', newToken);
      setToken(newToken);
    } else {
      localStorage.removeItem('token');
      setToken(null);
    }
    setIsAuthenticated(!!newToken);
  };

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    setToken(storedToken);
    setIsAuthenticated(!!storedToken);
  }, []);

  useEffect(() => {
    window.navigateToReports = () => {
      window.location.hash = '#/reports';
      window.history.pushState({}, '', '/reports');
    };
    return () => { delete window.navigateToReports; };
  }, []);

  return (
    <AuthContext.Provider value={{ isAuthenticated, token, handleAuth }}>
      <AppointmentsUpdateProvider>
        <Router>
          <div className="App">
            <Routes>
              <Route path="/login" element={!isAuthenticated ? <LoginPage /> : <Navigate to="/dashboard" />} />
              <Route path="/dashboard" element={isAuthenticated ? <Dashboard /> : <Navigate to="/login" />} />
              <Route path="/" element={<Navigate to={isAuthenticated ? "/dashboard" : "/login"} />} />
            </Routes>
            <Toaster 
              position="top-right"
              reverseOrder={false}
              toastOptions={{
                duration: 4000,
                style: {
                  background: '#363636',
                  color: '#fff',
                  borderRadius: '10px',
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
                  fontSize: '14px',
                  fontWeight: '500',
                  padding: '16px',
                  maxWidth: '400px',
                },
                success: {
                  duration: 3000,
                  iconTheme: {
                    primary: '#10B981',
                    secondary: '#fff',
                  },
                  style: {
                    background: 'linear-gradient(135deg, #10B981, #059669)',
                    color: '#fff',
                  },
                },
                error: {
                  duration: 3000,
                  iconTheme: {
                    primary: '#EF4444',
                    secondary: '#fff',
                  },
                  style: {
                    background: 'linear-gradient(135deg, #EF4444, #DC2626)',
                    color: '#fff',
                  },
                },
              }}
            />
          </div>
        </Router>
      </AppointmentsUpdateProvider>
    </AuthContext.Provider>
  );
}

export default App;
