import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Menu } from 'lucide-react';

export const DashboardLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen bg-zinc-50/60 font-sans overflow-hidden relative">
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

      {/* Main Content Viewport (No horizontal navbar - full vertical space) */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Minimal Mobile Header (Only visible on small screens to toggle sidebar) */}
        <div className="lg:hidden h-14 bg-white border-b border-zinc-200 px-4 flex items-center justify-between shrink-0 z-20">
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
          <div className="w-8" />
        </div>

        {/* Dedicated Main Scroll Area */}
        <main className="flex-1 p-4 sm:p-6 md:p-8 overflow-y-auto min-w-0 bg-zinc-50/50">
          <div className="max-w-7xl mx-auto space-y-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
