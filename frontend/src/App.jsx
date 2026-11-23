import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import { DashboardLayout } from './components/layout/DashboardLayout';
import { PlatformLayout } from './components/layout/PlatformLayout';
import { Login } from './pages/Login';
import { BusinessSelection } from './pages/BusinessSelection';
import { Dashboard } from './pages/Dashboard';
import { PlatformDashboard } from './pages/PlatformDashboard';
import { Employees } from './pages/Employees';
import { EmployeeProfile } from './pages/EmployeeProfile';
import { Attendance } from './pages/Attendance';
import { Shifts } from './pages/Shifts';
import { Leaves } from './pages/Leaves';
import { Payroll } from './pages/Payroll';
import { Advances } from './pages/Advances';
import { Expenses } from './pages/Expenses';
import { Cashbook } from './pages/Cashbook';
import { Organization } from './pages/Organization';
import { FieldManagement } from './pages/FieldManagement';
import { Notifications } from './pages/Notifications';
import { RolesPermissions } from './pages/RolesPermissions';
import { Subscription } from './pages/Subscription';
import { Reports } from './pages/Reports';
import { Settings } from './pages/Settings';
import { TestingPanel } from './pages/TestingPanel';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import { canOpenPage } from './utils/access';
import { Loader } from './components/ui/Loader';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">
        <Loader message="Loading WorkPulse Session..." size="lg" />
      </div>
    );
  }

  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

const PortalLayoutSwitch = () => {
  const { activeRole, user, needsBusinessSelection } = useAuth();
  const isPlatformAdmin =
    user?.is_superuser ||
    ['SUPER_ADMIN', 'SUPPORT_ADMIN', 'BILLING_ADMIN'].includes(activeRole);

  if (isPlatformAdmin) {
    return <PlatformLayout />;
  }

  if (needsBusinessSelection) {
    return <Navigate to="/select-business" replace />;
  }

  return <DashboardLayout />;
};

const RoleIndexSwitch = () => {
  const { activeRole, user } = useAuth();
  const isPlatformAdmin =
    user?.is_superuser ||
    ['SUPER_ADMIN', 'SUPPORT_ADMIN', 'BILLING_ADMIN'].includes(activeRole);

  return isPlatformAdmin ? <PlatformDashboard view="overview" /> : <Dashboard />;
};

const RoleRoute = ({ children, moduleName }) => {
  const auth = useAuth();
  const { activeRole } = auth;
  const { pathname } = useLocation();
  const isAllowed = canOpenPage(pathname.replace(/\/$/, '') || '/', auth);

  if (!isAllowed) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-2xl border border-zinc-200 shadow-xl p-8 text-center">
          <div className="w-14 h-14 bg-zinc-100 text-zinc-900 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-zinc-200">
            <ShieldAlert className="w-7 h-7" />
          </div>
          <h3 className="text-lg font-bold text-zinc-950">You don't have access to this page</h3>
          <p className="text-xs text-zinc-600 mt-2 leading-relaxed">
            The <strong>{moduleName || 'requested'}</strong> section is only accessible to authorized accounts.
          </p>
          <div className="mt-4 p-3 bg-zinc-50 border border-zinc-200 rounded-lg text-xs text-zinc-600">
            Your current role: <span className="font-bold text-zinc-950">{activeRole}</span>
          </div>
          <div className="mt-6">
            <Link
              to="/"
              className="inline-flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-zinc-900 hover:bg-black text-white rounded-lg text-xs font-bold transition-colors shadow-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Return to Dashboard</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return children;
};

export const App = () => {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <NotificationProvider>
          <AuthProvider>
          <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/select-business"
            element={
              <ProtectedRoute>
                <BusinessSelection />
              </ProtectedRoute>
            }
          />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <PortalLayoutSwitch />
              </ProtectedRoute>
            }
          >
            <Route index element={<RoleIndexSwitch />} />
            {/* Platform Admin Routes */}
            <Route
              path="platform/tenants"
              element={
                <RoleRoute moduleName="Tenant Governance">
                  <PlatformDashboard view="tenants" />
                </RoleRoute>
              }
            />
            <Route
              path="platform/billing"
              element={
                <RoleRoute moduleName="Platform Billing">
                  <PlatformDashboard view="billing" />
                </RoleRoute>
              }
            />
            {/* Business Portal Routes */}
            <Route
              path="organization"
              element={
                <RoleRoute moduleName="Organization Structure">
                  <Organization />
                </RoleRoute>
              }
            />
            <Route
              path="employees"
              element={
                <RoleRoute moduleName="Employee Management">
                  <Employees />
                </RoleRoute>
              }
            />
            <Route
              path="employees/:id"
              element={
                <RoleRoute moduleName="Employee Profile">
                  <EmployeeProfile />
                </RoleRoute>
              }
            />
            <Route path="attendance" element={<RoleRoute moduleName="Attendance"><Attendance /></RoleRoute>} />
            <Route
              path="shifts"
              element={
                <RoleRoute moduleName="Shifts & Roster">
                  <Shifts />
                </RoleRoute>
              }
            />
            <Route path="leaves" element={<RoleRoute moduleName="Leaves"><Leaves /></RoleRoute>} />
            <Route path="payroll" element={<RoleRoute moduleName="Payroll"><Payroll /></RoleRoute>} />
            <Route path="advances" element={<RoleRoute moduleName="Advances"><Advances /></RoleRoute>} />
            <Route
              path="cashbook"
              element={
                <RoleRoute moduleName="Cashbook & Expenses">
                  <Expenses />
                </RoleRoute>
              }
            />
            {/* Backward-compatibility redirect: /expenses -> /cashbook */}
            <Route path="expenses" element={<Navigate to="/cashbook" replace />} />
            <Route
              path="field-management"
              element={
                <RoleRoute moduleName="Field Management">
                  <FieldManagement />
                </RoleRoute>
              }
            />
            <Route
              path="reports"
              element={
                <RoleRoute moduleName="Reports & Analytics">
                  <Reports />
                </RoleRoute>
              }
            />
            <Route path="notifications" element={<Notifications />} />
            <Route
              path="roles"
              element={
                <RoleRoute moduleName="Roles & Permissions">
                  <RolesPermissions />
                </RoleRoute>
              }
            />
            <Route
              path="subscription"
              element={
                <RoleRoute moduleName="Subscription & Billing">
                  <Subscription />
                </RoleRoute>
              }
            />
            <Route
              path="settings"
              element={
                <RoleRoute moduleName="Organization Settings">
                  <Settings />
                </RoleRoute>
              }
            />
            <Route
              path="testing-panel"
              element={
                <RoleRoute moduleName="System Check">
                  <TestingPanel />
                </RoleRoute>
              }
            />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </NotificationProvider>
  </ThemeProvider>
</BrowserRouter>
  );
};
