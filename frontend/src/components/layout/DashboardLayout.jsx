import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import {
  Menu,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  ChevronDown,
  User,
  Shield,
  LayoutDashboard,
  CalendarCheck2,
  Users,
  Banknote,
  MoreHorizontal,
  HandCoins,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { canOpenPage } from '../../utils/access';
import { ROLE_LABELS } from '../../utils/constants';
import { Dropdown, DropdownItem, DropdownSeparator } from '../ui/Dropdown';

export const DashboardLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try {
      return localStorage.getItem('workpulse_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  const auth = useAuth();
  const { user, business, activeRole, logout } = auth;
  const [search, setSearch] = useState('');
  const navigate = useNavigate();
  const location = useLocation();

  const isEmployeeRole = activeRole === 'EMPLOYEE' || activeRole === 'FIELD_EMPLOYEE';
  const roleLabel = ROLE_LABELS[activeRole] || activeRole;

  const toggleSidebarCollapsed = () => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('workpulse_sidebar_collapsed', String(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  // Close mobile drawer on route change
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  // Mobile bottom navigation items (5 primary touch-friendly destinations)
  const bottomNavItems = [
    {
      name: 'Home',
      path: '/',
      icon: LayoutDashboard,
    },
    {
      name: 'Punch',
      path: '/attendance',
      icon: CalendarCheck2,
    },
    {
      name: isEmployeeRole ? 'Payslips' : 'Employees',
      path: isEmployeeRole ? '/payroll' : '/employees',
      icon: isEmployeeRole ? Banknote : Users,
    },
    {
      name: isEmployeeRole ? 'Advances' : 'Payroll',
      path: isEmployeeRole ? '/advances' : '/payroll',
      icon: isEmployeeRole ? HandCoins : Banknote,
    },
  ].filter((item) => canOpenPage(item.path, auth));
  const profilePath = isEmployeeRole && user?.employee_id ? `/employees/${user.employee_id}` : '/settings';

  return (
    <div className="flex h-screen supports-[height:100dvh]:h-[100dvh] bg-zinc-50 font-sans overflow-hidden relative">
      {/* Mobile Drawer Backdrop */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs lg:hidden transition-opacity duration-200"
          aria-hidden="true"
        />
      )}

      {/* Sidebar (Includes Workspace Switcher, Notifications, Navigation, and User Profile) */}
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        isCollapsed={sidebarCollapsed}
        onToggleCollapse={toggleSidebarCollapsed}
      />

      {/* Main Content Viewport */}
      <div className="flex-1 flex flex-col min-w-0 h-screen supports-[height:100dvh]:h-[100dvh] overflow-hidden bg-zinc-50">
        {/* 1. Desktop Top Bar (Hidden on Mobile) */}
        <header className="hidden lg:flex h-16 bg-white border-b border-zinc-200 px-6 items-center justify-between shrink-0 z-20 transition-colors">
          <div className="flex items-center gap-4 min-w-0">
            <button
              type="button"
              onClick={toggleSidebarCollapsed}
              className="p-2 text-zinc-600 hover:text-zinc-950 hover:bg-zinc-100 rounded-lg transition-colors cursor-pointer"
              title={sidebarCollapsed ? 'Expand navigation' : 'Collapse navigation'}
              aria-label="Toggle Sidebar Navigation"
            >
              {sidebarCollapsed ? (
                <PanelLeftOpen className="w-4 h-4" />
              ) : (
                <PanelLeftClose className="w-4 h-4" />
              )}
            </button>

            {canOpenPage('/employees', auth) ? (
              <form
                role="search"
                className="relative w-64 xl:w-80"
                onSubmit={(event) => {
                  event.preventDefault();
                  navigate(`/employees?search=${encodeURIComponent(search.trim())}`);
                }}
              >
                <Search aria-hidden="true" className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                <input
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  aria-label="Search employees"
                  placeholder="Search employees…"
                  className="w-full pl-9 pr-3 py-2 text-sm bg-zinc-50 border border-zinc-200 rounded-full"
                />
              </form>
            ) : (
              <span className="text-sm text-zinc-700">{business?.name}</span>
            )}
          </div>
          <div className="flex items-center gap-3">
            {/* User Profile Menu */}
            <Dropdown
              align="right"
              trigger={
                <button
                  type="button"
                  className="flex items-center gap-2.5 p-1.5 rounded-lg hover:bg-zinc-100 transition-colors cursor-pointer outline-none"
                >
                  <div className="w-8 h-8 rounded-full bg-zinc-950 text-white flex items-center justify-center font-bold text-xs shadow-2xs">
                    {user?.first_name ? user.first_name[0].toUpperCase() : 'U'}
                  </div>
                  <div className="text-left hidden lg:block leading-tight">
                    <p className="text-xs font-bold text-zinc-950 truncate max-w-[140px]">
                      {user?.full_name || user?.email}
                    </p>
                    <p className="text-[10px] text-zinc-500 font-medium">
                      {roleLabel}
                    </p>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
                </button>
              }
            >
              <div className="px-3.5 py-2.5 border-b border-zinc-100">
                <p className="text-xs font-bold text-zinc-950 truncate">
                  {user?.full_name || 'Signed In'}
                </p>
                <p className="text-2xs text-zinc-500 truncate mt-0.5 font-mono">
                  {user?.email}
                </p>
              </div>
              {canOpenPage(profilePath, auth) && <DropdownItem
                icon={User}
                onClick={() => navigate(profilePath)}
              >
                Profile &amp; Settings
              </DropdownItem>}
              {canOpenPage('/testing-panel', auth) && <DropdownItem icon={Shield} onClick={() => navigate('/testing-panel')}>
                System Diagnostics
              </DropdownItem>}
              <DropdownSeparator />
              <DropdownItem icon={LogOut} danger onClick={logout}>
                Log Out
              </DropdownItem>
            </Dropdown>
          </div>
        </header>

        {/* 2. Responsive Mobile Top Bar (Only visible on small screens) */}
        <header className="lg:hidden h-14 bg-white border-b border-zinc-200 px-3 sm:px-4 flex items-center justify-between shrink-0 z-20">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="p-2 text-zinc-700 hover:text-black hover:bg-zinc-100 rounded-lg transition-colors cursor-pointer min-w-[40px] min-h-[40px] flex items-center justify-center"
              aria-label="Open Navigation Menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-zinc-950 text-white flex items-center justify-center font-black text-xs">
                W
              </div>
              <span className="text-xs font-bold text-zinc-900 tracking-tight">WorkPulse</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-zinc-100 rounded-lg text-xs font-semibold text-zinc-800 border border-zinc-200/60">
              <div className="w-5 h-5 rounded-full bg-zinc-950 text-white flex items-center justify-center text-[10px] font-bold">
                {user?.first_name ? user.first_name[0].toUpperCase() : 'U'}
              </div>
              <span className="max-w-[80px] truncate hidden xs:inline">{user?.first_name || 'User'}</span>
            </div>

            <button
              type="button"
              onClick={logout}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-zinc-700 hover:text-black bg-zinc-100 hover:bg-zinc-200 border border-zinc-200 rounded-lg transition-colors cursor-pointer min-h-[36px] justify-center"
              title="Log out of account"
              aria-label="Logout"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="text-[11px] font-bold hidden sm:inline">Logout</span>
            </button>
          </div>
        </header>

        {/* 3. Dedicated Main Scroll Area */}
        <main className="flex-1 p-4 sm:px-6 sm:pt-3 lg:px-8 overflow-y-auto min-w-0 bg-zinc-50 pb-24 lg:pb-8 transition-colors">
          <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
            <Outlet key={business?.id} />
          </div>
        </main>

        {/* 4. Mobile Bottom Navigation Bar (Large touch targets >= 44x44px) */}
        <nav
          aria-label="Mobile Bottom Navigation"
          className="fixed bottom-0 inset-x-0 z-30 lg:hidden bg-white/95 border-t border-zinc-200 backdrop-blur-md pb-safe"
        >
          <div className="grid grid-flow-col auto-cols-fr h-14">
            {bottomNavItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/'}
                className={({ isActive }) =>
                  `flex flex-col items-center justify-center gap-0.5 text-2xs font-semibold transition-colors min-h-[44px] min-w-[44px] ${
                    isActive
                      ? 'text-zinc-950 font-bold'
                      : 'text-zinc-500 hover:text-zinc-900'
                  }`
                }
              >
                <item.icon className="w-4 h-4" />
                <span className="truncate">{item.name}</span>
              </NavLink>
            ))}

            {/* 5th Mobile Item: Drawer / More Trigger */}
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="flex flex-col items-center justify-center gap-0.5 text-2xs font-semibold text-zinc-500 hover:text-zinc-900 transition-colors min-h-[44px] min-w-[44px] cursor-pointer"
            >
              <MoreHorizontal className="w-4 h-4" />
              <span>More</span>
            </button>
          </div>
        </nav>
      </div>
    </div>
  );
};

export default DashboardLayout;
