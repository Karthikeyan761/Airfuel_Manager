import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Sidebar from './components/Sidebar';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import FuelPurchasesPage from './pages/FuelPurchasesPage';
import FuelInventoryPage from './pages/FuelInventoryPage';
import AircraftPage from './pages/AircraftPage';
import FlightsPage from './pages/FlightsPage';
import PriceTrendsPage from './pages/PriceTrendsPage';
import TransactionsPage from './pages/TransactionsPage';
import ReportsPage from './pages/ReportsPage';
import DailyUsagePage from './pages/DailyUsagePage';
import UsersPage from './pages/UsersPage';

const ProtectedRoute = ({ children, adminOnly = false }) => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (adminOnly && user.role !== 'admin') return <Navigate to="/" replace />;
  return (
    <div className="main-layout">
      <Sidebar />
      <main className="content-area animate-fade-in">
        {children}
      </main>
    </div>
  );
};

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '16px' }}>
      <div className="spinner" />
      <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Loading AeroFuel…</span>
    </div>
  );

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <LoginPage />} />
      <Route path="/" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
      <Route path="/flights" element={<ProtectedRoute><FlightsPage /></ProtectedRoute>} />
      <Route path="/aircraft" element={<ProtectedRoute><AircraftPage /></ProtectedRoute>} />
      <Route path="/inventory" element={<ProtectedRoute><FuelInventoryPage /></ProtectedRoute>} />
      <Route path="/purchases" element={<ProtectedRoute><FuelPurchasesPage /></ProtectedRoute>} />
      <Route path="/transactions" element={<ProtectedRoute><TransactionsPage /></ProtectedRoute>} />
      <Route path="/trends" element={<ProtectedRoute><PriceTrendsPage /></ProtectedRoute>} />
      <Route path="/reports" element={<ProtectedRoute><ReportsPage /></ProtectedRoute>} />
      <Route path="/daily-usage" element={<ProtectedRoute><DailyUsagePage /></ProtectedRoute>} />
      <Route path="/users" element={<ProtectedRoute adminOnly><UsersPage /></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
