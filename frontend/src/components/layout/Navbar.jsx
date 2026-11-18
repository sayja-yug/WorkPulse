import React, { useState, useEffect, useRef } from 'react';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import {
  Building2,
  Bell,
  LogOut,
  ChevronDown,
  UserCircle,
  Plus,
  Menu,
  CheckCheck,
  Banknote,
  CalendarOff,
  Clock,
  Info,
} from 'lucide-react';
import { ROLE_LABELS, ROLE_BADGE_COLORS } from '../../utils/constants';
import { Modal } from '../ui/Modal';

export const Navbar = ({ onToggleSidebar = () => {} }) => {
  const { user, business, businesses, switchBusiness, createBusiness, logout, activeRole, assignedBranch } = useAuth();
  const [showNewBizModal, setShowNewBizModal] = useState(false);
  const [creatingBiz, setCreatingBiz] = useState(false);
  const [bizForm, setBizForm] = useState({
    name: '',
    email: '',
    phone: '',
    city: '',
    currency: 'INR',
  });

  const isSuperAdmin = activeRole === 'SUPER_ADMIN' || user?.is_superuser;
  const roleLabel = ROLE_LABELS[activeRole] || activeRole;
  const roleColor = ROLE_BADGE_COLORS[activeRole] || 'bg-slate-100 text-slate-700 border-slate-200';

  const handleCreateBusiness = async (e) => {
    e.preventDefault();
    if (!bizForm.name.trim()) return;
    try {
      setCreatingBiz(true);
      await createBusiness(bizForm);
      setShowNewBizModal(false);
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Failed to create new company');
    } finally {
      setCreatingBiz(false);
    }
  };

  // Notification Center State & Handlers
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const notifDropdownRef = useRef(null);

  const fetchNotifications = async () => {
    try {
      const res = await api.get('/notifications/');
      const data = res.data?.data || res.data?.results || res.data || [];
      setNotifications(Array.isArray(data) ? data : []);
    } catch (err) {
      console.warn('Could not load notifications', err);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 45000);
    return () => clearInterval(interval);
  }, [user, business]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (notifDropdownRef.current && !notifDropdownRef.current.contains(e.target)) {
        setShowNotifications(false);
      }
    };
    if (showNotifications) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showNotifications]);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const handleMarkRead = async (id, e) => {
    if (e) e.stopPropagation();
    try {
      await api.patch(`/notifications/${id}/read/`);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
    } catch {
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.post('/notifications/mark-all-read/');
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch {
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    }
  };

  const formatNotifTime = (dateString) => {
    if (!dateString) return '';
    try {
      const d = new Date(dateString);
      const now = new Date();
      const diffMs = now - d;
      const diffMins = Math.floor(diffMs / 60000);
      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours}h ago`;
      return d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
    } catch {
      return '';
    }
  };

  const getNotifIcon = (type) => {
    switch (type) {
      case 'PAYROLL':
        return <Banknote className="w-4 h-4 text-emerald-600" />;
      case 'LEAVE':
        return <CalendarOff className="w-4 h-4 text-amber-600" />;
      case 'ATTENDANCE':
        return <Clock className="w-4 h-4 text-blue-600" />;
      default:
        return <Info className="w-4 h-4 text-indigo-600" />;
    }
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-3 sm:px-6 flex items-center justify-between sticky top-0 z-30">
      <div className="flex items-center gap-1.5 sm:gap-2.5 min-w-0">
        {/* Hamburger Mobile Menu Button */}
        <button
          type="button"
          onClick={onToggleSidebar}
          className="lg:hidden p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors shrink-0 cursor-pointer"
          aria-label="Toggle navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Company Workspace Indicator */}
        <div className="flex items-center gap-1.5 sm:gap-2 bg-slate-50 border border-slate-200 py-1.5 px-2.5 sm:px-3 rounded-lg text-slate-800 min-w-0 max-w-[150px] xs:max-w-[210px] sm:max-w-xs">
          <Building2 className="w-4 h-4 text-indigo-600 shrink-0" />
          {businesses.length > 1 ? (
            <div className="relative flex items-center min-w-0 truncate">
              <select
                className="bg-transparent text-xs sm:text-sm font-semibold text-slate-800 outline-none cursor-pointer pr-4 truncate"
                value={business?.id || ''}
                onChange={(e) => switchBusiness(e.target.value)}
              >
                {businesses.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-500 pointer-events-none -ml-3 shrink-0" />
            </div>
          ) : (
            <span className="text-xs sm:text-sm font-semibold text-slate-900 tracking-tight truncate">
              {business?.name || 'Company Workspace'}
            </span>
          )}
        </div>

        {/* "+ Add Company" is strictly reserved for Platform Super Admins managing tenants */}
        {isSuperAdmin && (
          <button
            type="button"
            onClick={() => setShowNewBizModal(true)}
            title="Create New Platform Tenant Company (Super Admin Only)"
            className="flex items-center gap-1 px-2 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-semibold transition-colors shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Add Company</span>
          </button>
        )}
      </div>

      <div className="flex items-center gap-2 sm:gap-4 shrink-0">
        {/* Dynamic Role Badge (hidden on extra small screens to save header space) */}
        <span className={`text-[10px] sm:text-xs font-semibold px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full border ${roleColor} hidden xs:inline-block truncate max-w-[150px] sm:max-w-none`}>
          {roleLabel}{activeRole === 'BRANCH_MANAGER' && (assignedBranch?.name || user?.branch_name) ? ` • ${assignedBranch?.name || user?.branch_name}` : ''}
        </span>

        {/* Notification Bell Button & Popover Dropdown */}
        <div className="relative" ref={notifDropdownRef}>
          <button
            type="button"
            onClick={() => setShowNotifications(!showNotifications)}
            className={`p-1.5 sm:p-2 rounded-xl transition-all cursor-pointer relative ${
              showNotifications
                ? 'bg-indigo-50 text-indigo-700'
                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
            }`}
            aria-label="Notifications"
            title="Open Notifications"
          >
            <Bell className="w-4 h-4 sm:w-5 sm:h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-0.5 right-0.5 min-w-[18px] h-[18px] px-1 bg-rose-500 text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-white shadow-xs">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {/* Notification Dropdown Popover */}
          {showNotifications && (
            <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
              {/* Dropdown Header */}
              <div className="p-3.5 bg-slate-50/90 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Notifications
                  </h3>
                  {unreadCount > 0 ? (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                      {unreadCount} new
                    </span>
                  ) : (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Caught up
                    </span>
                  )}
                </div>

                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={handleMarkAllRead}
                    className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                    <span>Mark all read</span>
                  </button>
                )}
              </div>

              {/* Notification Items List */}
              <div className="max-h-[380px] overflow-y-auto divide-y divide-slate-100">
                {notifications.length === 0 ? (
                  <div className="p-8 text-center space-y-2">
                    <div className="w-10 h-10 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
                      <Bell className="w-5 h-5 text-indigo-500" />
                    </div>
                    <p className="text-xs font-bold text-slate-800">You&apos;re all caught up!</p>
                    <p className="text-[11px] text-slate-400">No new notifications in your queue right now.</p>
                  </div>
                ) : (
                  notifications.slice(0, 15).map((n) => {
                    const isUnread = !n.is_read;
                    return (
                      <div
                        key={n.id}
                        onClick={() => isUnread && handleMarkRead(n.id)}
                        className={`p-3.5 flex items-start gap-3 transition-colors cursor-pointer ${
                          isUnread
                            ? 'bg-indigo-50/30 hover:bg-indigo-50/60'
                            : 'hover:bg-slate-50/80 bg-white'
                        }`}
                      >
                        <div
                          className={`p-2 rounded-xl shrink-0 mt-0.5 ${
                            isUnread ? 'bg-indigo-100/70 border border-indigo-200/60' : 'bg-slate-100 text-slate-400'
                          }`}
                        >
                          {getNotifIcon(n.type)}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-1">
                            <p className={`text-xs truncate ${isUnread ? 'font-bold text-slate-900' : 'font-medium text-slate-700'}`}>
                              {n.title || 'System Notification'}
                            </p>
                            <span className="text-[10px] text-slate-400 shrink-0 font-mono">
                              {formatNotifTime(n.created_at)}
                            </span>
                          </div>

                          <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5 leading-relaxed">
                            {n.message || n.body}
                          </p>

                          {isUnread && (
                            <div className="mt-1.5 flex items-center justify-between">
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-600">
                                <span className="w-1.5 h-1.5 rounded-full bg-indigo-600"></span>
                                New
                              </span>
                              <button
                                type="button"
                                onClick={(e) => handleMarkRead(n.id, e)}
                                className="text-[10px] font-semibold text-slate-400 hover:text-indigo-600 hover:underline cursor-pointer"
                              >
                                Mark read
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Dropdown Footer */}
              <div className="p-2.5 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                <span className="text-[10px] font-medium text-slate-400">WorkPulse Notification Hub</span>
                <button
                  type="button"
                  onClick={() => setShowNotifications(false)}
                  className="font-semibold text-slate-600 hover:text-slate-900 px-2.5 py-0.5 rounded hover:bg-slate-200/60 transition-colors cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="h-5 sm:h-6 w-px bg-slate-200"></div>

        <div className="flex items-center gap-2 sm:gap-3">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center font-semibold text-xs sm:text-sm shrink-0">
            {user?.first_name ? user.first_name[0] : <UserCircle className="w-4 h-4 sm:w-5 sm:h-5" />}
          </div>
          <div className="hidden md:block text-left max-w-[140px] lg:max-w-[180px] truncate">
            <p className="text-xs sm:text-sm font-semibold text-slate-900 leading-tight truncate">{user?.full_name}</p>
            <p className="text-[11px] text-slate-500 leading-tight truncate">{user?.email}</p>
          </div>

          <button
            onClick={logout}
            title="Logout"
            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Add New Company Modal (Platform Super Admin only) */}
      {isSuperAdmin && (
        <Modal
          isOpen={showNewBizModal}
          onClose={() => setShowNewBizModal(false)}
          title="Add New Platform Tenant Company"
        >
          <form onSubmit={handleCreateBusiness} className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Company Name *</label>
              <input
                type="text"
                required
                value={bizForm.name}
                onChange={(e) => setBizForm({ ...bizForm, name: e.target.value })}
                placeholder="e.g. Acme Industries Ltd"
                className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-600"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Company Email</label>
                <input
                  type="email"
                  value={bizForm.email}
                  onChange={(e) => setBizForm({ ...bizForm, email: e.target.value })}
                  placeholder="contact@company.com"
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">City</label>
                <input
                  type="text"
                  value={bizForm.city}
                  onChange={(e) => setBizForm({ ...bizForm, city: e.target.value })}
                  placeholder="e.g. Mumbai"
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg outline-none"
                />
              </div>
            </div>
            <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowNewBizModal(false)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={creatingBiz}
                className="px-4 py-1.5 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-sm"
              >
                {creatingBiz ? 'Creating...' : 'Create Company'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </header>
  );
};

export default Navbar;
