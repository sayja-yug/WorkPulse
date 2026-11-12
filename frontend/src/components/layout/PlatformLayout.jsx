import React from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { usePermissions } from '../../hooks/usePermissions';
import {
  ShieldAlert,
  Building2,
  CreditCard,
  Activity,
  LogOut,
  Terminal,
  LayoutDashboard,
} from 'lucide-react';
import { ROLE_LABELS } from '../../utils/constants';

export const PlatformLayout = () => {
  const { user, activeRole, logout } = useAuth();
  const { isSuperAdmin, isSupportAdmin, isBillingAdmin } = usePermissions();

  const navItems = [
    {
      name: 'Platform Overview',
      path: '/',
      icon: LayoutDashboard,
      visible: true,
    },
    {
      name: 'Tenants & Businesses',
      path: '/platform/tenants',
      icon: Building2,
      visible: isSuperAdmin || isSupportAdmin || isBillingAdmin,
    },
    {
      name: 'Plans & Billing',
      path: '/platform/billing',
      icon: CreditCard,
      visible: isSuperAdmin || isBillingAdmin,
    },
    {
      name: 'System Diagnostics',
      path: '/testing-panel',
      icon: Terminal,
      visible: isSuperAdmin || isSupportAdmin,
    },
  ].filter((item) => item.visible);

  return (
    <div className="min-h-screen bg-slate-100 flex">
      {/* Dedicated Platform Admin Sidebar */}
      <aside className="w-64 bg-slate-950 text-slate-300 flex flex-col h-screen sticky top-0 border-r border-slate-800">
        <div className="h-16 px-6 flex items-center gap-3 border-b border-slate-800">
          <div className="w-8 h-8 rounded-lg bg-rose-600 flex items-center justify-center text-white font-bold shadow-lg shadow-rose-600/30">
            <ShieldAlert className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-white tracking-tight">WorkPulse Cloud</h1>
            <p className="text-[10px] text-rose-400 font-semibold uppercase tracking-wider">Platform Admin</p>
          </div>
        </div>

        <div className="px-4 py-3 border-b border-slate-800 bg-slate-900/60">
          <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Admin Role</p>
          <span className="mt-1 inline-block px-2.5 py-0.5 rounded text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
            {ROLE_LABELS[activeRole] || activeRole}
          </span>
          <p className="text-[11px] text-slate-400 mt-1 truncate">{user?.email}</p>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-rose-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`
              }
            >
              <item.icon className="w-4 h-4" />
              <span>{item.name}</span>
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span className="flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-emerald-400" />
            <span>SaaS Control Plane</span>
          </span>
        </div>
      </aside>

      {/* Main Platform Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-md bg-slate-900 text-white text-xs font-bold">
              PLATFORM PORTAL
            </span>
            <span className="text-xs text-slate-500 hidden sm:inline">
              Global SaaS Governance &amp; Tenant Operations
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right hidden md:block">
              <p className="text-sm font-semibold text-slate-900">{user?.full_name}</p>
              <p className="text-xs text-slate-500">{user?.email}</p>
            </div>
            <button
              onClick={logout}
              title="Logout"
              className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </header>

        <main className="flex-1 p-6 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
