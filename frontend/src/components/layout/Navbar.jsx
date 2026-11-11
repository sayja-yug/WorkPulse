import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { Building2, Bell, LogOut, ChevronDown, UserCircle } from 'lucide-react';
import { ROLE_LABELS, ROLE_BADGE_COLORS } from '../../utils/constants';

export const Navbar = () => {
  const { user, business, businesses, switchBusiness, logout, activeRole } = useAuth();

  const roleLabel = ROLE_LABELS[activeRole] || activeRole;
  const roleColor = ROLE_BADGE_COLORS[activeRole] || 'bg-slate-100 text-slate-700 border-slate-200';

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between sticky top-0 z-30">
      <div className="flex items-center gap-4">
        {businesses.length > 0 && (
          <div className="relative flex items-center gap-2 bg-slate-100 hover:bg-slate-200 transition-colors py-1.5 px-3 rounded-lg cursor-pointer">
            <Building2 className="w-4 h-4 text-indigo-600" />
            <select
              className="bg-transparent text-sm font-medium text-slate-800 outline-none cursor-pointer pr-4"
              value={business?.id || ''}
              onChange={(e) => switchBusiness(e.target.value)}
            >
              {businesses.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-500 pointer-events-none -ml-4" />
          </div>
        )}
      </div>

      <div className="flex items-center gap-4">
        {/* Dynamic Role Badge */}
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${roleColor}`}>
          {roleLabel}
        </span>

        <button className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg relative">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full"></span>
        </button>

        <div className="h-6 w-px bg-slate-200"></div>

        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center font-semibold text-sm">
            {user?.first_name ? user.first_name[0] : <UserCircle className="w-5 h-5" />}
          </div>
          <div className="hidden md:block text-left">
            <p className="text-sm font-semibold text-slate-900 leading-tight">{user?.full_name}</p>
            <p className="text-xs text-slate-500 leading-tight">{user?.email}</p>
          </div>

          <button
            onClick={logout}
            title="Logout"
            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors ml-1"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};

