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
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const Sidebar: React.FC = () => {
  const { hasRole, user } = useAuth();

  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Employees', path: '/employees', icon: Users },
    { name: 'Attendance', path: '/attendance', icon: CalendarCheck2 },
    { name: 'Shifts & Roster', path: '/shifts', icon: Clock },
    { name: 'Leave Management', path: '/leaves', icon: CalendarOff },
    { name: 'Payroll & Slips', path: '/payroll', icon: Banknote },
    { name: 'Advances & Loans', path: '/advances', icon: HandCoins },
    { name: 'Expenses & Cashbook', path: '/expenses', icon: Receipt },
    { name: 'Reports & Analytics', path: '/reports', icon: BarChart3 },
    { name: 'Organization Settings', path: '/settings', icon: Settings },
  ];

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col h-screen sticky top-0 border-r border-slate-800">
      <div className="h-16 px-6 flex items-center gap-3 border-b border-slate-800">
        <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-indigo-500/30">
          W
        </div>
        <div>
          <h1 className="text-base font-bold text-white tracking-tight">WorkPulse</h1>
          <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Enterprise HRMS</p>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => (
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
            <item.icon className="w-4 h-4" />
            <span>{item.name}</span>
          </NavLink>
        ))}

        <div className="pt-4 mt-4 border-t border-slate-800">
          <p className="px-3 text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
            Developer & Diagnostics
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
            <span>Dev Testing Panel</span>
          </NavLink>
        </div>
      </nav>

      <div className="p-4 border-t border-slate-800 bg-slate-950/40 flex items-center gap-2 text-xs text-slate-400">
        <ShieldCheck className="w-4 h-4 text-indigo-400" />
        <span>Multi-Tenant RBAC Active</span>
      </div>
    </aside>
  );
};

