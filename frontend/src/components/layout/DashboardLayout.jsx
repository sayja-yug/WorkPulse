import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Menu, LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const DashboardLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout } = useAuth();

  return (
    <div className="flex h-screen supports-[height:100dvh]:h-[100dvh] bg-zinc-50/60 font-sans overflow-hidden relative">
      {/* Mobile Drawer Backdrop */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs lg:hidden transition-opacity duration-300"
          aria-hidden="true"
        />
      )}

      {/* Sidebar (Includes Workspace Switcher, Notifications, Navigation, and User Profile) */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Content Viewport (Full vertical space, dynamic mobile viewport) */}
      <div className="flex-1 flex flex-col min-w-0 h-screen supports-[height:100dvh]:h-[100dvh] overflow-hidden">
        {/* Responsive Mobile Header */}
        <header className="lg:hidden h-14 bg-white border-b border-zinc-200 px-3 sm:px-4 flex items-center justify-between shrink-0 z-20">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="p-2 text-zinc-700 hover:text-black hover:bg-zinc-100 rounded-lg transition-colors cursor-pointer"
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

          {/* Quick-Access Mobile Right Bar: User Pill + Direct Logout */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-2 py-1 bg-zinc-100 rounded-lg text-xs font-semibold text-zinc-800">
              <div className="w-5 h-5 rounded-full bg-zinc-950 text-white flex items-center justify-center text-[10px] font-bold">
                {user?.first_name ? user.first_name[0].toUpperCase() : 'U'}
              </div>
              <span className="max-w-[70px] truncate hidden xs:inline">{user?.first_name || 'User'}</span>
            </div>
            <button
              type="button"
              onClick={logout}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-zinc-700 hover:text-rose-600 bg-zinc-100 hover:bg-rose-50 border border-zinc-200 rounded-lg transition-colors cursor-pointer"
              title="Log out of account"
              aria-label="Logout"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="text-[11px] font-bold">Logout</span>
            </button>
          </div>
        </header>

        {/* Dedicated Main Scroll Area */}
        <main className="flex-1 p-3.5 sm:p-6 md:p-8 overflow-y-auto min-w-0 bg-zinc-50/50">
          <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
