import React, { useState } from 'react';
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
  Menu,
  X,
} from 'lucide-react';
import { ROLE_LABELS } from '../../utils/constants';

export const PlatformLayout = () => {
  const { user, activeRole, logout } = useAuth();
  const { isSuperAdmin, isSupportAdmin, isBillingAdmin } = usePermissions();
  const [sidebarOpen, setSidebarOpen] = useState(false);

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
    <div className="h-screen supports-[height:100dvh]:h-[100dvh] bg-zinc-50 text-zinc-900 flex overflow-hidden relative">
      {/* Mobile Backdrop */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-xs lg:hidden transition-opacity duration-200"
          aria-hidden="true"
        />
      )}

      {/* Dedicated Platform Admin Sidebar */}
      <aside
        className={`workspace-sidebar fixed inset-y-0 left-0 z-50 w-64 bg-zinc-950 text-zinc-300 flex flex-col h-screen supports-[height:100dvh]:h-[100dvh] border-r border-zinc-800 transition-transform duration-200 ease-in-out lg:translate-x-0 lg:sticky lg:top-0 lg:h-screen lg:shrink-0 lg:z-30 select-none ${
          sidebarOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
        }`}
      >
        <div className="h-16 px-5 flex items-center justify-between border-b border-zinc-800 bg-zinc-950 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-white text-zinc-950 flex items-center justify-center font-black text-base shadow-xs">
              <ShieldAlert className="w-4 h-4 text-zinc-950" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-white tracking-tight leading-none">WorkPulse Cloud</h1>
              <p className="text-[10px] text-zinc-400 font-semibold uppercase tracking-wider mt-1">Platform Admin</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-900 transition-colors cursor-pointer"
            aria-label="Close navigation"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-4 py-3 border-b border-zinc-800 bg-zinc-900/60 shrink-0">
          <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">Admin Role</p>
          <span className="mt-1 inline-block px-2 py-0.5 rounded text-xs font-bold bg-zinc-800 text-zinc-200 border border-zinc-700">
            {ROLE_LABELS[activeRole] || activeRole}
          </span>
          <p className="text-[11px] text-zinc-400 mt-1 truncate font-mono">{user?.email}</p>
        </div>

        <nav className="flex-1 min-h-0 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-white text-zinc-950 shadow-xs font-bold'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
                }`
              }
            >
              <item.icon className="w-4 h-4 shrink-0" />
              <span>{item.name}</span>
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-zinc-800 shrink-0 flex items-center justify-between text-xs text-zinc-400 pb-safe pb-4">
          <span className="flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-zinc-300" />
            <span className="text-[11px] font-semibold">SaaS Control Plane</span>
          </span>
          <button
            type="button"
            onClick={logout}
            className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-900 rounded-lg transition-colors cursor-pointer"
            title="Log Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {/* Main Platform Content */}
      <div className="flex-1 flex flex-col min-w-0 h-screen supports-[height:100dvh]:h-[100dvh] overflow-hidden bg-zinc-50">
        <header className="h-16 bg-white border-b border-zinc-200 px-3 sm:px-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setSidebarOpen((prev) => !prev)}
              className="lg:hidden p-2 text-zinc-700 hover:text-black hover:bg-zinc-100 rounded-lg transition-colors cursor-pointer"
              aria-label="Toggle navigation"
            >
              <Menu className="w-5 h-5" />
            </button>
            <span className="px-2.5 py-1 rounded-md bg-zinc-950 text-white text-xs font-bold shadow-2xs">
              PLATFORM PORTAL
            </span>
            <span className="text-xs text-zinc-500 hidden sm:inline">
              Global SaaS Governance &amp; Tenant Operations
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right hidden md:block">
              <p className="text-xs font-bold text-zinc-900">{user?.full_name}</p>
              <p className="text-[10px] text-zinc-500 font-mono">{user?.email}</p>
            </div>
            <button
              type="button"
              onClick={logout}
              title="Logout"
              className="p-2 text-zinc-600 hover:text-black hover:bg-zinc-100 rounded-lg transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </header>

        <main className="flex-1 p-3.5 sm:p-6 md:p-8 max-w-7xl w-full mx-auto overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default PlatformLayout;
