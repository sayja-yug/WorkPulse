import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DashboardLayout } from './components/layout/DashboardLayout';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Employees } from './pages/Employees';
import { Attendance } from './pages/Attendance';
import { Shifts } from './pages/Shifts';
import { Leaves } from './pages/Leaves';
import { Payroll } from './pages/Payroll';
import { Advances } from './pages/Advances';
import { Expenses } from './pages/Expenses';
import { Reports } from './pages/Reports';
import { Settings } from './pages/Settings';
import { TestingPanel } from './pages/TestingPanel';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs text-slate-400 font-medium tracking-wider uppercase">Loading WorkPulse Session...</p>
        </div>
      </div>
    );
  }

  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
};

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="employees" element={<Employees />} />
            <Route path="attendance" element={<Attendance />} />
            <Route path="shifts" element={<Shifts />} />
            <Route path="leaves" element={<Leaves />} />
            <Route path="payroll" element={<Payroll />} />
            <Route path="advances" element={<Advances />} />
            <Route path="expenses" element={<Expenses />} />
            <Route path="reports" element={<Reports />} />
            <Route path="settings" element={<Settings />} />
            <Route path="testing-panel" element={<TestingPanel />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
};

