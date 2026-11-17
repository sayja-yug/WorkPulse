import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Building2, ArrowRight, Plus, LogOut, ShieldCheck } from 'lucide-react';
import { Modal } from '../components/ui/Modal';
import { Button } from '../components/ui/Button';

export const BusinessSelection = () => {
  const { user, businesses, selectBusiness, createBusiness, logout } = useAuth();
  const navigate = useNavigate();

  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', phone: '', city: '', currency: 'INR' });

  const handleSelect = async (bizId) => {
    await selectBusiness(bizId);
    navigate('/');
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    try {
      setCreating(true);
      await createBusiness(form);
      setShowCreate(false);
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Failed to create company');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-3 sm:p-6 relative select-none">
      <div className="max-w-2xl w-full bg-white rounded-2xl shadow-modal border border-zinc-200 overflow-hidden transition-colors">
        <div className="bg-black px-5 sm:px-6 py-4 sm:py-5 text-white flex items-center justify-between border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white text-zinc-950 flex items-center justify-center font-black text-lg shadow-xs">
              W
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight text-white leading-tight">Select Business Organization</h2>
              <p className="text-xs text-zinc-400 mt-0.5">Signed in as {user?.email}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={logout}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-zinc-300 hover:text-white hover:bg-zinc-900 rounded-lg transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        </div>

        <div className="p-5 sm:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <p className="text-xs text-zinc-600 ">
              Choose an organization workspace to load your role-specific dashboard and permissions:
            </p>
            <button
              type="button"
              onClick={() => setShowCreate(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-zinc-950 hover:bg-zinc-800   text-white  rounded-lg text-xs font-bold shadow-2xs transition-colors self-start sm:self-auto cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Company</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {businesses.map((biz) => (
              <button
                key={biz.id}
                type="button"
                onClick={() => handleSelect(biz.id)}
                className="text-left p-4 rounded-xl border border-zinc-200  hover:border-zinc-950  bg-white  hover:bg-zinc-50  transition-all group flex items-center justify-between cursor-pointer shadow-subtle"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-lg bg-zinc-100  text-zinc-900  flex items-center justify-center shrink-0 border border-zinc-200/80 ">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-zinc-950  truncate group-hover:text-black ">{biz.name}</p>
                    <p className="text-[11px] text-zinc-500  truncate mt-0.5">
                      {biz.city || biz.slug} • {biz.currency || 'INR'}
                    </p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-zinc-400 group-hover:text-zinc-950  shrink-0 transition-colors" />
              </button>
            ))}
          </div>

          <div className="pt-3 border-t border-zinc-100  flex items-center justify-center gap-2 text-[11px] text-zinc-500 ">
            <ShieldCheck className="w-3.5 h-3.5 text-zinc-700 " />
            <span>Strict Multi-Tenant Data Isolation Enabled</span>
          </div>
        </div>
      </div>

      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Create New Company">
        <form onSubmit={handleCreate} className="space-y-3">
          <div>
            <label className="block text-xs font-bold text-zinc-800  mb-1">Company Name *</label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Trinetra Retail Pvt Ltd"
              className="w-full px-3 py-2 border border-zinc-300  bg-white  text-zinc-900  rounded-lg text-base sm:text-xs focus:ring-1 focus:ring-zinc-950  outline-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-zinc-800  mb-1">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full px-3 py-2 border border-zinc-300  bg-white  text-zinc-900  rounded-lg text-base sm:text-xs focus:ring-1 focus:ring-zinc-950  outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-zinc-800  mb-1">City</label>
              <input
                type="text"
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
                className="w-full px-3 py-2 border border-zinc-300  bg-white  text-zinc-900  rounded-lg text-base sm:text-xs focus:ring-1 focus:ring-zinc-950  outline-none"
              />
            </div>
          </div>
          <div className="pt-3 flex justify-end gap-2 border-t border-zinc-100 ">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowCreate(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={creating}
            >
              {creating ? 'Creating...' : 'Create & Enter'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default BusinessSelection;
