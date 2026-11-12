import React, { useEffect, useState } from 'react';
import api from '../api/client';
import { ShieldCheck, Plus, Key } from 'lucide-react';
import { Loader } from '../components/ui/Loader';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';

export const RolesPermissions = () => {
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [roleForm, setRoleForm] = useState({ name: '', code: '', description: '' });

  const fetchRbac = async () => {
    try {
      setLoading(true);
      const [rRes, pRes] = await Promise.allSettled([
        api.get('/auth/roles/'),
        api.get('/auth/permissions/'),
      ]);
      if (rRes.status === 'fulfilled') {
        const d = rRes.value.data?.data || rRes.value.data?.results || rRes.value.data || [];
        setRoles(Array.isArray(d) ? d : []);
      }
      if (pRes.status === 'fulfilled') {
        const d = pRes.value.data?.data || pRes.value.data?.results || pRes.value.data || [];
        setPermissions(Array.isArray(d) ? d : []);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRbac();
  }, []);

  const handleCreateRole = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      await api.post('/auth/roles/create/', {
        ...roleForm,
        code: roleForm.code.toUpperCase().replace(/\s+/g, '_'),
      });
      setShowModal(false);
      setRoleForm({ name: '', code: '', description: '' });
      fetchRbac();
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Failed to create role');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-indigo-600" />
            <span>Roles &amp; Permissions (RBAC)</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage system roles, custom business roles, and granular permission contracts
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>Create Custom Role</span>
        </button>
      </div>

      {loading ? (
        <Loader message="Loading RBAC roles and permissions..." />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Roles List */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50/50">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Configured Roles ({roles.length})
              </h3>
            </div>
            <div className="divide-y divide-slate-100 max-h-[480px] overflow-y-auto">
              {roles.map((r) => (
                <div key={r.id} className="p-4 flex items-center justify-between hover:bg-slate-50">
                  <div>
                    <p className="text-sm font-bold text-slate-900">{r.name}</p>
                    <p className="text-[11px] font-mono text-indigo-600">{r.code}</p>
                    {r.description && <p className="text-xs text-slate-500 mt-0.5">{r.description}</p>}
                  </div>
                  <Badge variant={r.is_system ? 'info' : 'success'}>
                    {r.is_system ? 'SYSTEM' : 'CUSTOM'}
                  </Badge>
                </div>
              ))}
            </div>
          </div>

          {/* Global Permissions Registry */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50/50">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-indigo-600" />
                <span>Permission Codes ({permissions.length})</span>
              </h3>
            </div>
            <div className="divide-y divide-slate-100 max-h-[480px] overflow-y-auto">
              {permissions.map((p) => (
                <div key={p.id} className="p-3.5 flex items-center justify-between hover:bg-slate-50">
                  <div>
                    <p className="text-xs font-bold font-mono text-slate-900">{p.code}</p>
                    <p className="text-[11px] text-slate-500">{p.name}</p>
                  </div>
                  <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                    {p.module}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Create Custom Business Role">
        <form onSubmit={handleCreateRole} className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Role Name *</label>
            <input
              type="text"
              required
              value={roleForm.name}
              onChange={(e) => setRoleForm({ ...roleForm, name: e.target.value })}
              placeholder="e.g. Payroll Reviewer"
              className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Role Code *</label>
            <input
              type="text"
              required
              value={roleForm.code}
              onChange={(e) => setRoleForm({ ...roleForm, code: e.target.value })}
              placeholder="PAYROLL_REVIEWER"
              className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg font-mono uppercase"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Description</label>
            <input
              type="text"
              value={roleForm.description}
              onChange={(e) => setRoleForm({ ...roleForm, description: e.target.value })}
              className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg"
            />
          </div>
          <div className="pt-3 flex justify-end gap-2">
            <button type="button" onClick={() => setShowModal(false)} className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg">
              Cancel
            </button>
            <button type="submit" disabled={submitting} className="px-4 py-1.5 text-xs font-semibold bg-indigo-600 text-white rounded-lg">
              {submitting ? 'Creating...' : 'Create Role'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
