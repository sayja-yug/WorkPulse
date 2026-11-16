import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Building2,
  Users,
  CalendarCheck2,
  Clock,
  CalendarOff,
  Banknote,
  HandCoins,
  Receipt,
  Wallet,
  Navigation,
  BarChart3,
  Bell,
  Shield,
  CreditCard,
  Settings,
  Terminal,
  ShieldCheck,
  UserCheck,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { ROLE_LABELS, ROLE_BADGE_COLORS } from '../../utils/constants';

export const Sidebar = ({ isOpen = false, onClose = () => {} }) => {
  const { user, activeRole, hasPermission } = useAuth();

  const allNavItems = [
    {
      name: 'Dashboard',
      path: '/',
      icon: LayoutDashboard,
    },
    {
      name: 'Organization',
      path: '/organization',
      icon: Building2,
      allowedRoles: ['BUSINESS_OWNER', 'HR_MANAGER', 'BRANCH_MANAGER', 'SUPER_ADMIN'],
    },
    {
      name: 'Employees',
      path: '/employees',
      icon: Users,
      allowedRoles: ['BUSINESS_OWNER', 'HR_MANAGER', 'BRANCH_MANAGER', 'SUPER_ADMIN'],
    },
    {
      name: 'Attendance',
      path: '/attendance',
      icon: CalendarCheck2,
      employeeName: 'Attendance',
    },
    {
      name: 'Shifts & Roster',
      path: '/shifts',
      icon: Clock,
      allowedRoles: ['BUSINESS_OWNER', 'HR_MANAGER', 'BRANCH_MANAGER', 'SUPERVISOR', 'SUPER_ADMIN'],
    },
    {
      name: 'Leave Management',
      path: '/leaves',
      icon: CalendarOff,
      employeeName: 'My Leaves',
    },
    {
      name: 'Payroll',
      path: '/payroll',
      icon: Banknote,
      allowedRoles: ['BUSINESS_OWNER', 'ACCOUNTANT', 'AUDITOR', 'EMPLOYEE', 'FIELD_EMPLOYEE', 'SUPER_ADMIN'],
      employeeName: 'My Payslips',
    },
    {
      name: 'Advances & Loans',
      path: '/advances',
      icon: HandCoins,
      allowedRoles: ['BUSINESS_OWNER', 'ACCOUNTANT', 'EMPLOYEE', 'FIELD_EMPLOYEE', 'SUPER_ADMIN'],
      employeeName: 'Advances & Loans',
    },
    {
      name: 'Cashbook & Expenses',
      path: '/cashbook',
      icon: Wallet,
      allowedRoles: ['BUSINESS_OWNER', 'ACCOUNTANT', 'AUDITOR', 'SUPER_ADMIN'],
    },
    {
      name: 'Field Management',
      path: '/field-management',
      icon: Navigation,
      allowedRoles: ['BUSINESS_OWNER', 'HR_MANAGER', 'BRANCH_MANAGER', 'SUPERVISOR', 'FIELD_EMPLOYEE', 'SUPER_ADMIN'],
    },
    {
      name: 'Reports',
      path: '/reports',
      icon: BarChart3,
      allowedRoles: ['BUSINESS_OWNER', 'HR_MANAGER', 'ACCOUNTANT', 'BRANCH_MANAGER', 'AUDITOR', 'SUPER_ADMIN'],
    },
    {
      name: 'Subscription',
      path: '/subscription',
      icon: CreditCard,
      allowedRoles: ['BUSINESS_OWNER', 'SUPER_ADMIN'],
    },
    {
      name: 'Settings',
      path: '/settings',
      icon: Settings,
      allowedRoles: ['BUSINESS_OWNER', 'SUPER_ADMIN'],
    },
  ];

  const isEmployeeRole = activeRole === 'EMPLOYEE' || activeRole === 'FIELD_EMPLOYEE';

  const visibleNavItems = allNavItems.filter((item) => {
    if (!item.allowedRoles && !item.allowedPermissions) return true;
    if (item.allowedRoles && item.allowedRoles.includes(activeRole)) return true;
    if (item.allowedPermissions && item.allowedPermissions.some((p) => hasPermission(p))) return true;
    return false;
  });

  const roleLabel = ROLE_LABELS[activeRole] || activeRole;
  const roleColor = ROLE_BADGE_COLORS[activeRole] || 'bg-slate-700 text-slate-300 border-slate-600';

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 text-slate-300 flex flex-col h-screen border-r border-slate-800 transition-transform duration-300 ease-in-out lg:translate-x-0 lg:sticky lg:top-0 lg:h-screen lg:shrink-0 lg:z-30 ${
        isOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
      }`}
    >
      {/* Brand Header */}
      <div className="h-16 px-5 flex items-center justify-between border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-indigo-500/30">
            W
          </div>
          <div>
            <h1 className="text-base font-bold text-white tracking-tight">WorkPulse</h1>
            <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Enterprise HRMS</p>
          </div>
        </div>

        {/* Mobile close button */}
        <button
          type="button"
          onClick={onClose}
          className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          aria-label="Close navigation"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Active Role Indicator */}
      <div className="px-4 py-3 border-b border-slate-800 bg-slate-950/40">
        <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1.5">
          <UserCheck className="w-3 h-3 text-indigo-400" />
          <span>Active Role Scope</span>
        </div>
        <div className={`px-2.5 py-1 rounded-md text-xs font-semibold border ${roleColor} inline-block`}>
          {roleLabel}
        </div>
        <p className="text-[11px] text-slate-400 mt-1 truncate">
          {user?.email}
        </p>
      </div>

      {/* Navigation Links Filtered by Role */}
      <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
        {visibleNavItems.map((item) => {
          const displayName = isEmployeeRole && item.employeeName ? item.employeeName : item.name;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-150 ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`
              }
            >
              <item.icon className="w-4 h-4 flex-shrink-0" />
              <span className="truncate">{displayName}</span>
            </NavLink>
          );
        })}

        <div className="pt-3 mt-3 border-t border-slate-800">
          <NavLink
            to="/testing-panel"
            onClick={onClose}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                isActive
                  ? 'bg-emerald-600 text-white'
                  : 'text-emerald-400 hover:text-emerald-300 hover:bg-slate-800/60'
              }`
            }
          >
            <Terminal className="w-4 h-4" />
            <span>Diagnostics</span>
          </NavLink>
        </div>
      </nav>

      {/* Footer Security Badge */}
      <div className="p-3.5 border-t border-slate-800 bg-slate-950/40 flex items-center justify-between text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span className="text-[11px]">Strict RBAC Active</span>
        </div>
        <span className="text-[10px] bg-slate-800 px-1.5 py-0.5 rounded text-slate-400 font-mono">v1.0</span>
      </div>
    </aside>
  );
};
