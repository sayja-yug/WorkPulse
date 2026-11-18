import React, { useState, useEffect, useRef } from 'react';
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
  Wallet,
  Navigation,
  BarChart3,
  CreditCard,
  Settings,
  Terminal,
  ShieldCheck,
  UserCheck,
  X,
  Bell,
  CheckCheck,
  LogOut,
  ChevronDown,
  Plus,
  Info,
  Check,
} from 'lucide-react';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { ROLE_LABELS, ROLE_BADGE_COLORS } from '../../utils/constants';
import { Modal } from '../ui/Modal';

export const Sidebar = ({
  isOpen = false,
  onClose = () => {},
  isCollapsed = false,
  onToggleCollapse,
}) => {
  const {
    user,
    activeRole,
    hasPermission,
    business,
    businesses,
    switchBusiness,
    createBusiness,
    logout,
    assignedBranch,
  } = useAuth();

  // Company Switcher State
  const [showCompanyMenu, setShowCompanyMenu] = useState(false);
  const [showNewBizModal, setShowNewBizModal] = useState(false);
  const [creatingBiz, setCreatingBiz] = useState(false);
  const [bizForm, setBizForm] = useState({
    name: '',
    email: '',
    phone: '',
    city: '',
    currency: 'INR',
  });

  const companyMenuRef = useRef(null);

  // Notification Center State
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const notifDropdownRef = useRef(null);

  const isSuperAdmin = activeRole === 'SUPER_ADMIN' || user?.is_superuser;
  const roleLabel = ROLE_LABELS[activeRole] || activeRole;
  const roleColor = ROLE_BADGE_COLORS[activeRole] || 'bg-zinc-800 text-zinc-100 border-zinc-700';

  // Fetch Notifications
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
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [user, business]);

  // Click Outside Handlers
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (companyMenuRef.current && !companyMenuRef.current.contains(e.target)) {
        setShowCompanyMenu(false);
      }
      if (notifDropdownRef.current && !notifDropdownRef.current.contains(e.target)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

  const handleCreateBusiness = async (e) => {
    e.preventDefault();
    if (!bizForm.name.trim()) return;
    try {
      setCreatingBiz(true);
      await createBusiness(bizForm);
      setShowNewBizModal(false);
      setShowCompanyMenu(false);
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Failed to create new company');
    } finally {
      setCreatingBiz(false);
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
      case 'ADVANCE':
        return <Banknote className="w-4 h-4 text-zinc-900" />;
      case 'LEAVE':
        return <CalendarOff className="w-4 h-4 text-zinc-900" />;
      case 'ATTENDANCE':
        return <Clock className="w-4 h-4 text-zinc-900" />;
      default:
        return <Info className="w-4 h-4 text-zinc-900" />;
    }
  };

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

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] bg-zinc-950 text-zinc-300 flex flex-col h-screen supports-[height:100dvh]:h-[100dvh] border-r border-zinc-800/80 transition-all duration-200 ease-in-out lg:translate-x-0 lg:sticky lg:top-0 lg:h-screen lg:shrink-0 lg:z-30 select-none ${
        isCollapsed ? 'lg:w-20' : 'lg:w-64 xl:w-72'
      } ${
        isOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
      }`}
    >
      {/* 1. Header: Brand & Notification Quick Action */}
      <div className={`h-16 px-4 flex items-center justify-between border-b border-zinc-800/80 bg-zinc-950 shrink-0 ${isCollapsed ? 'lg:justify-center lg:px-2' : 'sm:px-5'}`}>
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-white text-zinc-950 flex items-center justify-center font-black text-base shadow-sm shrink-0">
            W
          </div>
          {!isCollapsed && (
            <div className="min-w-0">
              <h1 className="text-sm font-bold text-white tracking-tight leading-none truncate">
                WorkPulse
              </h1>
              <p className="text-[10px] text-zinc-400 font-medium tracking-wider uppercase mt-1 leading-none">
                Enterprise HRMS
              </p>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {!isCollapsed && (
            <div className="relative" ref={notifDropdownRef}>
            <button
              type="button"
              onClick={() => setShowNotifications(!showNotifications)}
              className={`p-2 rounded-lg transition-colors cursor-pointer relative ${
                showNotifications
                  ? 'bg-zinc-800 text-white'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
              }`}
              title="Notifications"
              aria-label="Open Notifications"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 min-w-[16px] h-[16px] px-1 bg-white text-zinc-950 text-[9px] font-black rounded-full flex items-center justify-center shadow-xs">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {/* Notification Popover Dropdown (Aligned within mobile bounds) */}
            {showNotifications && (
              <div className="absolute -right-12 sm:right-0 top-full mt-2 w-[calc(85vw-2rem)] max-w-[300px] sm:max-w-none sm:w-84 bg-white text-zinc-900 rounded-xl shadow-2xl border border-zinc-200 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                {/* Popover Header */}
                <div className="p-3 bg-zinc-50 border-b border-zinc-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs font-bold text-zinc-900 uppercase tracking-wider">
                      Notifications
                    </h3>
                    {unreadCount > 0 ? (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-zinc-900 text-white">
                        {unreadCount} new
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-zinc-100 text-zinc-600">
                        Caught up
                      </span>
                    )}
                  </div>

                  {unreadCount > 0 && (
                    <button
                      type="button"
                      onClick={handleMarkAllRead}
                      className="text-[11px] font-semibold text-zinc-900 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <CheckCheck className="w-3.5 h-3.5" />
                      <span>Mark all read</span>
                    </button>
                  )}
                </div>

                {/* Popover Content */}
                <div className="max-h-[320px] overflow-y-auto divide-y divide-zinc-100">
                  {notifications.length === 0 ? (
                    <div className="p-6 text-center space-y-1.5">
                      <div className="w-8 h-8 rounded-full bg-zinc-100 text-zinc-500 flex items-center justify-center mx-auto">
                        <Bell className="w-4 h-4" />
                      </div>
                      <p className="text-xs font-bold text-zinc-800">You&apos;re all caught up!</p>
                      <p className="text-[11px] text-zinc-400">No new notifications in your queue.</p>
                    </div>
                  ) : (
                    notifications.slice(0, 15).map((n) => {
                      const isUnread = !n.is_read;
                      return (
                        <div
                          key={n.id}
                          onClick={() => isUnread && handleMarkRead(n.id)}
                          className={`p-3 flex items-start gap-2.5 transition-colors cursor-pointer ${
                            isUnread ? 'bg-zinc-50 hover:bg-zinc-100/70' : 'hover:bg-zinc-50 bg-white'
                          }`}
                        >
                          <div
                            className={`p-1.5 rounded-lg shrink-0 mt-0.5 ${
                              isUnread ? 'bg-zinc-200 text-zinc-900' : 'bg-zinc-100 text-zinc-400'
                            }`}
                          >
                            {getNotifIcon(n.type)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-1">
                              <p className={`text-xs truncate ${isUnread ? 'font-bold text-zinc-950' : 'font-medium text-zinc-700'}`}>
                                {n.title || 'System Notification'}
                              </p>
                              <span className="text-[10px] text-zinc-400 shrink-0 font-mono">
                                {formatNotifTime(n.created_at)}
                              </span>
                            </div>
                            <p className="text-[11px] text-zinc-600 line-clamp-2 mt-0.5 leading-relaxed">
                              {n.message || n.body}
                            </p>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Popover Footer */}
                <div className="p-2 bg-zinc-50 border-t border-zinc-100 flex items-center justify-between text-[11px]">
                  <span className="text-[10px] font-medium text-zinc-400">WorkPulse Hub</span>
                  <button
                    type="button"
                    onClick={() => setShowNotifications(false)}
                    className="font-semibold text-zinc-700 hover:text-black px-2 py-0.5 rounded cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
          </div>
          )}

          {/* Mobile close button */}
          <button
            type="button"
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-900 transition-colors cursor-pointer"
            aria-label="Close navigation"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* 2. Workspace / Company Switcher Card */}
      <div className="p-3 border-b border-zinc-800/80 bg-zinc-950 relative shrink-0" ref={companyMenuRef}>
        <button
          type="button"
          onClick={() => setShowCompanyMenu(!showCompanyMenu)}
          className="w-full p-2.5 rounded-lg bg-zinc-900/90 hover:bg-zinc-900 border border-zinc-800 text-left flex items-center justify-between gap-2.5 transition-colors cursor-pointer group"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-md bg-zinc-800 text-zinc-200 flex items-center justify-center shrink-0 border border-zinc-700">
              <Building2 className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] text-zinc-400 uppercase font-semibold tracking-wider leading-none">
                Workspace
              </p>
              <p className="text-xs font-bold text-white truncate mt-1 leading-none group-hover:text-zinc-100">
                {business?.name || 'My Company'}
              </p>
            </div>
          </div>
          <ChevronDown className="w-3.5 h-3.5 text-zinc-400 shrink-0 group-hover:text-white transition-colors" />
        </button>

        {/* Company Dropdown Menu */}
        {showCompanyMenu && (
          <div className="absolute left-3 right-3 top-full mt-1.5 bg-zinc-900 border border-zinc-800 rounded-xl shadow-xl z-50 overflow-hidden py-1">
            <div className="px-3 py-1.5 border-b border-zinc-800 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
              Switch Business
            </div>
            <div className="max-h-48 overflow-y-auto py-1">
              {businesses.map((biz) => {
                const isCurrent = biz.id === business?.id;
                return (
                  <button
                    key={biz.id}
                    type="button"
                    onClick={() => {
                      switchBusiness(biz.id);
                      setShowCompanyMenu(false);
                    }}
                    className={`w-full px-3 py-2 text-left text-xs flex items-center justify-between transition-colors cursor-pointer ${
                      isCurrent
                        ? 'bg-zinc-800 text-white font-semibold'
                        : 'text-zinc-300 hover:bg-zinc-800/60 hover:text-white'
                    }`}
                  >
                    <span className="truncate">{biz.name}</span>
                    {isCurrent && <Check className="w-3.5 h-3.5 text-white shrink-0" />}
                  </button>
                );
              })}
            </div>

            {isSuperAdmin && (
              <div className="p-1.5 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => {
                    setShowCompanyMenu(false);
                    setShowNewBizModal(true);
                  }}
                  className="w-full px-2.5 py-1.5 text-xs font-semibold text-white bg-zinc-800 hover:bg-zinc-700 rounded-lg flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create New Company</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 3. Navigation Menu Items */}
      <nav className={`flex-1 min-h-0 py-3 space-y-1 overflow-y-auto overscroll-contain ${isCollapsed ? 'px-2' : 'px-3'}`}>
        {visibleNavItems.map((item) => {
          const displayName = isEmployeeRole && item.employeeName ? item.employeeName : item.name;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              onClick={onClose}
              title={isCollapsed ? displayName : undefined}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold transition-all duration-150 ${
                  isCollapsed ? 'lg:justify-center lg:px-2' : ''
                } ${
                  isActive
                    ? 'bg-white text-zinc-950 font-bold shadow-xs'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
                }`
              }
            >
              <item.icon className="w-4 h-4 shrink-0" />
              {!isCollapsed && <span className="truncate">{displayName}</span>}
            </NavLink>
          );
        })}

        <div className="pt-2 mt-2 border-t border-zinc-800/80">
          <NavLink
            to="/testing-panel"
            onClick={onClose}
            title={isCollapsed ? "Diagnostics" : undefined}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                isCollapsed ? 'lg:justify-center lg:px-2' : ''
              } ${
                isActive
                  ? 'bg-zinc-800 text-white font-bold'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
              }`
            }
          >
            <Terminal className="w-4 h-4 shrink-0" />
            {!isCollapsed && <span className="truncate">Diagnostics</span>}
          </NavLink>
        </div>
      </nav>

      {/* 4. Bottom User Profile & Logout Bar */}
      <div className={`p-3 border-t border-zinc-800/80 bg-zinc-950 shrink-0 pb-safe pb-4 sm:pb-3 ${isCollapsed ? 'lg:p-2' : ''}`}>
        <div className={`flex items-center justify-between gap-2 p-2.5 rounded-lg bg-zinc-900/80 border border-zinc-800 ${isCollapsed ? 'lg:justify-center lg:p-1.5' : ''}`}>
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className="w-8 h-8 rounded-full bg-white text-zinc-950 flex items-center justify-center font-bold text-xs shrink-0 shadow-xs"
              title={isCollapsed ? `${user?.full_name || user?.email} (${roleLabel})` : undefined}
            >
              {user?.first_name ? user.first_name[0].toUpperCase() : 'U'}
            </div>
            {!isCollapsed && (
              <div className="min-w-0">
                <p className="text-xs font-bold text-white truncate leading-tight">
                  {user?.full_name || user?.email}
                </p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="inline-block px-1.5 py-0.2 rounded text-[10px] font-semibold bg-zinc-800 text-zinc-200 border border-zinc-700 leading-tight">
                    {roleLabel}
                  </span>
                  {activeRole === 'BRANCH_MANAGER' && (assignedBranch?.name || user?.branch_name) && (
                    <span className="text-[10px] font-medium text-zinc-400 truncate max-w-[120px]" title={assignedBranch?.name || user?.branch_name}>
                      • {assignedBranch?.name || user?.branch_name}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          {!isCollapsed && (
            <button
              type="button"
              onClick={() => {
                onClose();
                logout();
              }}
              title="Log out of account"
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-bold text-zinc-200 hover:text-white bg-zinc-800 hover:bg-rose-950/80 hover:text-rose-200 border border-zinc-700 hover:border-rose-800 rounded-lg transition-colors cursor-pointer shrink-0"
              aria-label="Logout"
            >
              <LogOut className="w-3.5 h-3.5 text-zinc-400" />
              <span className="text-[11px] font-bold">Logout</span>
            </button>
          )}
        </div>
      </div>

      {/* 5. Add New Company Modal (Super Admin only) */}
      {isSuperAdmin && (
        <Modal
          isOpen={showNewBizModal}
          onClose={() => setShowNewBizModal(false)}
          title="Add New Platform Tenant Company"
        >
          <form onSubmit={handleCreateBusiness} className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-zinc-700 mb-1">Company Name *</label>
              <input
                type="text"
                required
                value={bizForm.name}
                onChange={(e) => setBizForm({ ...bizForm, name: e.target.value })}
                placeholder="e.g. Acme Industries Ltd"
                className="w-full px-3 py-1.5 text-xs border border-zinc-300 rounded-lg outline-none focus:ring-2 focus:ring-zinc-900"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">Company Email</label>
                <input
                  type="email"
                  value={bizForm.email}
                  onChange={(e) => setBizForm({ ...bizForm, email: e.target.value })}
                  placeholder="contact@company.com"
                  className="w-full px-3 py-1.5 text-xs border border-zinc-300 rounded-lg outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">City</label>
                <input
                  type="text"
                  value={bizForm.city}
                  onChange={(e) => setBizForm({ ...bizForm, city: e.target.value })}
                  placeholder="e.g. Mumbai"
                  className="w-full px-3 py-1.5 text-xs border border-zinc-300 rounded-lg outline-none"
                />
              </div>
            </div>
            <div className="pt-3 border-t border-zinc-200 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowNewBizModal(false)}
                className="px-3 py-1.5 text-xs font-semibold text-zinc-600 hover:bg-zinc-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={creatingBiz}
                className="px-4 py-1.5 text-xs font-bold bg-zinc-900 hover:bg-black text-white rounded-lg shadow-sm"
              >
                {creatingBiz ? 'Creating...' : 'Create Company'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </aside>
  );
};

export default Sidebar;
