import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  CalendarCheck2,
  Clock,
  CalendarOff,
  Banknote,
  HandCoins,
  Receipt,
  BarChart3,
  Settings,
  Terminal,
  ShieldCheck,
  UserCheck,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface NavItemConfig {
  name: string;
  path: string;
  icon: any;
  allowedRoles?: string[];
  allowedPermissions?: string[];
  employeeName?: string; // customized label for employee self-service
}

export const Sidebar: React.FC = () => {
  const { user, activeRole, hasRole, hasPermission } = useAuth();

  const allNavItems: NavItemConfig[] = [
    {
      name: 'Dashboard',
      path: '/',
      icon: LayoutDashboard,
      // Everyone has dashboard
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
      employeeName: 'My Attendance & Clock-In',
      // Everyone has attendance (self or management)
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
      employeeName: 'My Leave Applications',
      // Everyone has leave access
    },
    {
      name: 'Payroll & Slips',
      path: '/payroll',
      icon: Banknote,
      allowedRoles: ['BUSINESS_OWNER', 'ACCOUNTANT', 'SUPER_ADMIN', 'AUDITOR', 'EMPLOYEE', 'FIELD_EMPLOYEE'],
      employeeName: 'My Payslips',
    },
    {
      name: 'Advances & Loans',
      path: '/advances',
      icon: HandCoins,
      allowedRoles: ['BUSINESS_OWNER', 'ACCOUNTANT', 'SUPER_ADMIN', 'EMPLOYEE', 'FIELD_EMPLOYEE'],
      employeeName: 'Salary Advance Requests',
    },
    {
      name: 'Expenses & Cashbook',
      path: '/expenses',
      icon: Receipt,
      allowedRoles: ['BUSINESS_OWNER', 'ACCOUNTANT', 'SUPER_ADMIN', 'AUDITOR'],
    },
    {
      name: 'Reports & Analytics',
      path: '/reports',
      icon: BarChart3,
      allowedRoles: ['BUSINESS_OWNER', 'HR_MANAGER', 'ACCOUNTANT', 'BRANCH_MANAGER', 'AUDITOR', 'SUPER_ADMIN'],
    },
    {
      name: 'Organization Settings',
      path: '/settings',
      icon: Settings,
      allowedRoles: ['BUSINESS_OWNER', 'SUPER_ADMIN'],
    },
  ];

  const isEmployeeRole = activeRole === 'EMPLOYEE' || activeRole === 'FIELD_EMPLOYEE';

  // Filter items strictly based on role
  const visibleNavItems = allNavItems.filter((item) => {
    if (!item.allowedRoles && !item.allowedPermissions) return true;
    if (item.allowedRoles && item.allowedRoles.includes(activeRole)) return true;
    if (item.allowedPermissions && item.allowedPermissions.some((p) => hasPermission(p))) return true;
    return false;
  });

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'BUSINESS_OWNER':
        return { label: 'Business Owner', color: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40' };
      case 'HR_MANAGER':
        return { label: 'HR Manager', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' };
      case 'ACCOUNTANT':
        return { label: 'Accountant', color: 'bg-blue-500/20 text-blue-300 border-blue-500/40' };
      case 'BRANCH_MANAGER':
        return { label: 'Branch Manager', color: 'bg-amber-500/20 text-amber-300 border-amber-500/40' };
      case 'SUPERVISOR':
        return { label: 'Team Supervisor', color: 'bg-orange-500/20 text-orange-300 border-orange-500/40' };
      case 'FIELD_EMPLOYEE':
        return { label: 'Field Employee (GPS)', color: 'bg-purple-500/20 text-purple-300 border-purple-500/40' };
      case 'EMPLOYEE':
        return { label: 'Employee (Self-Service)', color: 'bg-sky-500/20 text-sky-300 border-sky-500/40' };
      case 'AUDITOR':
        return { label: 'Auditor (Read-Only)', color: 'bg-rose-500/20 text-rose-300 border-rose-500/40' };
      case 'SUPER_ADMIN':
        return { label: 'Super Admin', color: 'bg-zinc-700 text-zinc-200 border-zinc-600' };
      default:
        return { label: role, color: 'bg-slate-700 text-slate-300 border-slate-600' };
    }
  };

  const badge = getRoleBadge(activeRole);

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col h-screen sticky top-0 border-r border-slate-800">
      {/* Brand Header */}
      <div className="h-16 px-6 flex items-center gap-3 border-b border-slate-800">
        <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-indigo-500/30">
          W
        </div>
        <div>
          <h1 className="text-base font-bold text-white tracking-tight">WorkPulse</h1>
          <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Enterprise HRMS</p>
        </div>
      </div>

      {/* Active Role Indicator */}
      <div className="px-4 py-3 border-b border-slate-800 bg-slate-950/40">
        <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1.5">
          <UserCheck className="w-3 h-3 text-indigo-400" />
          <span>Active Role Scope</span>
        </div>
        <div className={`px-2.5 py-1 rounded-md text-xs font-semibold border ${badge.color} inline-block`}>
          {badge.label}
        </div>
        <p className="text-[11px] text-slate-400 mt-1 truncate">
          {user?.email}
        </p>
      </div>

      {/* Navigation Links Filtered by Role */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {visibleNavItems.map((item) => {
          const displayName = (isEmployeeRole && item.employeeName) ? item.employeeName : item.name;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
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

        <div className="pt-4 mt-4 border-t border-slate-800">
          <p className="px-3 text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
            Diagnostics & Role Switcher
          </p>
          <NavLink
            to="/testing-panel"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? 'bg-emerald-600 text-white'
                  : 'text-emerald-400 hover:text-emerald-300 hover:bg-slate-800/60'
              }`
            }
          >
            <Terminal className="w-4 h-4" />
            <span>Role Switch & Diagnostics</span>
          </NavLink>
        </div>
      </nav>

      {/* Footer Security Badge */}
      <div className="p-4 border-t border-slate-800 bg-slate-950/40 flex items-center justify-between text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span className="text-[11px]">Strict RBAC Active</span>
        </div>
        <span className="text-[10px] bg-slate-800 px-1.5 py-0.5 rounded text-slate-400 font-mono">v1.0</span>
      </div>
    </aside>
  );
};
