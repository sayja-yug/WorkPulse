import React, { useEffect, useState } from 'react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Building2, MapPin, Layers, Award, Plus } from 'lucide-react';
import { Loader } from '../components/ui/Loader';
import { Modal } from '../components/ui/Modal';
import { Badge } from '../components/ui/Badge';

export const Organization = () => {
  const { business } = useAuth();
  const [activeTab, setActiveTab] = useState('branches');
  const [branches, setBranches] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [designations, setDesignations] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [branchForm, setBranchForm] = useState({ name: '', code: '', city: '', state: '', geofence_radius: 300 });
  const [deptForm, setDeptForm] = useState({ name: '', code: '' });
  const [desigForm, setDesigForm] = useState({ name: '', level: 1 });

  const fetchAll = async () => {
    try {
      setLoading(true);
      const [brRes, deptRes, desigRes] = await Promise.allSettled([
        api.get('/branches/'),
        api.get('/branches/departments/'),
        api.get('/branches/designations/'),
      ]);
      if (brRes.status === 'fulfilled') {
        const d = brRes.value.data?.data || brRes.value.data?.results || [];
        setBranches(Array.isArray(d) ? d : []);
      }
      if (deptRes.status === 'fulfilled') {
        const d = deptRes.value.data?.data || deptRes.value.data?.results || [];
        setDepartments(Array.isArray(d) ? d : []);
      }
      if (desigRes.status === 'fulfilled') {
        const d = desigRes.value.data?.data || desigRes.value.data?.results || [];
        setDesignations(Array.isArray(d) ? d : []);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, [business?.id]);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      if (activeTab === 'branches') {
        await api.post('/branches/', branchForm);
        setBranchForm({ name: '', code: '', city: '', state: '', geofence_radius: 300 });
      } else if (activeTab === 'departments') {
        await api.post('/branches/departments/', deptForm);
        setDeptForm({ name: '', code: '' });
      } else {
        await api.post('/branches/designations/', desigForm);
        setDesigForm({ name: '', level: 1 });
      }
      setShowModal(false);
      fetchAll();
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Failed to save item');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Building2 className="w-5 h-5 text-indigo-600" />
            <span>Organization Structure</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {business?.name || 'Business'} — Branches, departments, and designations
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>
            Add {activeTab === 'branches' ? 'Branch' : activeTab === 'departments' ? 'Department' : 'Designation'}
          </span>
        </button>
      </div>

      {/* Business Overview Strip */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase">Company Name</p>
          <p className="font-bold text-slate-900 mt-0.5">{business?.name || '-'}</p>
        </div>
        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase">Branches</p>
          <p className="font-bold text-indigo-600 mt-0.5">{branches.length} Locations</p>
        </div>
        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase">Departments</p>
          <p className="font-bold text-emerald-600 mt-0.5">{departments.length} Units</p>
        </div>
        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase">Designations</p>
          <p className="font-bold text-amber-600 mt-0.5">{designations.length} Titles</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200 pb-2">
        {[
          { id: 'branches', label: 'Branches', icon: MapPin },
          { id: 'departments', label: 'Departments', icon: Layers },
          { id: 'designations', label: 'Designations', icon: Award },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === tab.id
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <tab.icon className="w-3.5 h-3.5" />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Table Content */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <Loader message="Loading organization structure..." />
        ) : activeTab === 'branches' ? (
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[11px]">
                <th className="py-3 px-4">Branch Name</th>
                <th className="py-3 px-4">Code</th>
                <th className="py-3 px-4">Location</th>
                <th className="py-3 px-4">Geofence Radius</th>
                <th className="py-3 px-4">Type</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {branches.map((b) => (
                <tr key={b.id} className="hover:bg-slate-50">
                  <td className="py-3 px-4 font-semibold text-slate-900">{b.name}</td>
                  <td className="py-3 px-4 font-mono text-slate-600">{b.code}</td>
                  <td className="py-3 px-4 text-slate-600">{b.city ? `${b.city}, ${b.state || ''}` : '-'}</td>
                  <td className="py-3 px-4 font-mono text-slate-700">{b.geofence_radius || 200}m</td>
                  <td className="py-3 px-4">
                    <Badge variant={b.is_head_office ? 'info' : 'default'}>
                      {b.is_head_office ? 'HEAD OFFICE' : 'BRANCH'}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : activeTab === 'departments' ? (
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[11px]">
                <th className="py-3 px-4">Department Name</th>
                <th className="py-3 px-4">Code</th>
                <th className="py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {departments.map((d) => (
                <tr key={d.id} className="hover:bg-slate-50">
                  <td className="py-3 px-4 font-semibold text-slate-900">{d.name}</td>
                  <td className="py-3 px-4 font-mono text-slate-600">{d.code || '-'}</td>
                  <td className="py-3 px-4"><Badge variant="success">ACTIVE</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[11px]">
                <th className="py-3 px-4">Designation Title</th>
                <th className="py-3 px-4">Level</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {designations.map((g) => (
                <tr key={g.id} className="hover:bg-slate-50">
                  <td className="py-3 px-4 font-semibold text-slate-900">{g.name}</td>
                  <td className="py-3 px-4 font-mono text-slate-600">Level {g.level ?? 1}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Create Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={`Add ${activeTab === 'branches' ? 'Branch' : activeTab === 'departments' ? 'Department' : 'Designation'}`}
      >
        <form onSubmit={handleCreate} className="space-y-3">
          {activeTab === 'branches' ? (
            <>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Branch Name *</label>
                <input
                  type="text"
                  required
                  value={branchForm.name}
                  onChange={(e) => setBranchForm({ ...branchForm, name: e.target.value })}
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Code *</label>
                  <input
                    type="text"
                    required
                    value={branchForm.code}
                    onChange={(e) => setBranchForm({ ...branchForm, code: e.target.value })}
                    placeholder="BR-02"
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">City</label>
                  <input
                    type="text"
                    value={branchForm.city}
                    onChange={(e) => setBranchForm({ ...branchForm, city: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg"
                  />
                </div>
              </div>
            </>
          ) : activeTab === 'departments' ? (
            <>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Department Name *</label>
                <input
                  type="text"
                  required
                  value={deptForm.name}
                  onChange={(e) => setDeptForm({ ...deptForm, name: e.target.value })}
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Code *</label>
                <input
                  type="text"
                  required
                  value={deptForm.code}
                  onChange={(e) => setDeptForm({ ...deptForm, code: e.target.value })}
                  placeholder="MKT"
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg"
                />
              </div>
            </>
          ) : (
            <>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Designation Name *</label>
                <input
                  type="text"
                  required
                  value={desigForm.name}
                  onChange={(e) => setDesigForm({ ...desigForm, name: e.target.value })}
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Hierarchy Level</label>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={desigForm.level}
                  onChange={(e) => setDesigForm({ ...desigForm, level: Number(e.target.value) })}
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg"
                />
              </div>
            </>
          )}
          <div className="pt-3 flex justify-end gap-2">
            <button type="button" onClick={() => setShowModal(false)} className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg">
              Cancel
            </button>
            <button type="submit" disabled={submitting} className="px-4 py-1.5 text-xs font-semibold bg-indigo-600 text-white rounded-lg">
              {submitting ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
