import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom';
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
import { ShieldAlert, ArrowLeft } from 'lucide-react';

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

const RoleRoute: React.FC<{
  children: React.ReactNode;
  allowedRoles: string[];
  moduleName: string;
}> = ({ children, allowedRoles, moduleName }) => {
  const { activeRole, hasRole } = useAuth();

  const isAllowed = allowedRoles.includes(activeRole) || hasRole('BUSINESS_OWNER') || hasRole('SUPER_ADMIN');

  if (!isAllowed) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 shadow-xl p-8 text-center">
          <div className="w-14 h-14 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <ShieldAlert className="w-7 h-7" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">Access Restricted</h3>
          <p className="text-sm text-slate-500 mt-2 leading-relaxed">
            The <strong>{moduleName}</strong> module is restricted to authorized roles (
            {allowedRoles.join(', ')}).
          </p>
          <div className="mt-4 p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600">
            Your current active role is: <span className="font-bold text-slate-900 font-mono">{activeRole}</span>
          </div>
          <div className="mt-6 flex flex-col gap-2">
            <Link
              to="/"
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Return to Dashboard</span>
            </Link>
            <Link
              to="/testing-panel"
              className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium transition-colors"
            >
              Switch Role in Diagnostics
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
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
            <Route
              path="employees"
              element={
                <RoleRoute allowedRoles={['BUSINESS_OWNER', 'HR_MANAGER', 'BRANCH_MANAGER', 'SUPER_ADMIN']} moduleName="Employee Management">
                  <Employees />
                </RoleRoute>
              }
            />
            <Route path="attendance" element={<Attendance />} />
            <Route
              path="shifts"
              element={
                <RoleRoute allowedRoles={['BUSINESS_OWNER', 'HR_MANAGER', 'BRANCH_MANAGER', 'SUPERVISOR', 'SUPER_ADMIN']} moduleName="Shifts & Roster">
                  <Shifts />
                </RoleRoute>
              }
            />
            <Route path="leaves" element={<Leaves />} />
            <Route path="payroll" element={<Payroll />} />
            <Route path="advances" element={<Advances />} />
            <Route
              path="expenses"
              element={
                <RoleRoute allowedRoles={['BUSINESS_OWNER', 'ACCOUNTANT', 'SUPER_ADMIN', 'AUDITOR']} moduleName="Expenses & Cashbook">
                  <Expenses />
                </RoleRoute>
              }
            />
            <Route
              path="reports"
              element={
                <RoleRoute allowedRoles={['BUSINESS_OWNER', 'HR_MANAGER', 'ACCOUNTANT', 'BRANCH_MANAGER', 'AUDITOR', 'SUPER_ADMIN']} moduleName="Reports & Analytics">
                  <Reports />
                </RoleRoute>
              }
            />
            <Route
              path="settings"
              element={
                <RoleRoute allowedRoles={['BUSINESS_OWNER', 'SUPER_ADMIN']} moduleName="Organization Settings">
                  <Settings />
                </RoleRoute>
              }
            />
            <Route path="testing-panel" element={<TestingPanel />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
};
