import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Building2, Bell, LogOut, ChevronDown, UserCircle, Plus } from 'lucide-react';
import { ROLE_LABELS, ROLE_BADGE_COLORS } from '../../utils/constants';
import { Modal } from '../ui/Modal';

export const Navbar = () => {
  const { user, business, businesses, switchBusiness, createBusiness, logout, activeRole } = useAuth();
  const [showNewBizModal, setShowNewBizModal] = useState(false);
  const [creatingBiz, setCreatingBiz] = useState(false);
  const [bizForm, setBizForm] = useState({
    name: '',
    email: '',
    phone: '',
    city: '',
    currency: 'INR',
  });

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

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between sticky top-0 z-30">
      <div className="flex items-center gap-2.5">
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

        <button
          type="button"
          onClick={() => setShowNewBizModal(true)}
          title="Add another company"
          className="flex items-center gap-1 px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-semibold transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Add Company</span>
        </button>
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

      {/* Add New Company Modal */}
      <Modal
        isOpen={showNewBizModal}
        onClose={() => setShowNewBizModal(false)}
        title="Add New Company / Tenant"
      >
        <form onSubmit={handleCreateBusiness} className="space-y-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Company Name</label>
            <input
              type="text"
              required
              value={bizForm.name}
              onChange={(e) => setBizForm({ ...bizForm, name: e.target.value })}
              placeholder="e.g. Trinetra Retail Pvt Ltd"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-600 outline-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Business Email</label>
              <input
                type="email"
                value={bizForm.email}
                onChange={(e) => setBizForm({ ...bizForm, email: e.target.value })}
                placeholder="contact@company.com"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-600 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Phone</label>
              <input
                type="tel"
                value={bizForm.phone}
                onChange={(e) => setBizForm({ ...bizForm, phone: e.target.value })}
                placeholder="+91 98765 43210"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-600 outline-none"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">City</label>
              <input
                type="text"
                value={bizForm.city}
                onChange={(e) => setBizForm({ ...bizForm, city: e.target.value })}
                placeholder="e.g. Noida"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-600 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Currency</label>
              <select
                value={bizForm.currency}
                onChange={(e) => setBizForm({ ...bizForm, currency: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-600 outline-none bg-white"
              >
                <option value="INR">INR (₹)</option>
                <option value="USD">USD ($)</option>
              </select>
            </div>
          </div>
          <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
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
              className="px-4 py-1.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-sm disabled:opacity-50"
            >
              {creatingBiz ? 'Creating...' : 'Create & Switch Company'}
            </button>
          </div>
        </form>
      </Modal>
    </header>
  );
};
