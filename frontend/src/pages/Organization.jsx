import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import {
  Building2,
  MapPin,
  Layers,
  Award,
  Plus,
  CalendarDays,
  CalendarOff,
  Edit3,
  Eye,
  Users,
  Power,
  Search,
} from 'lucide-react';
import { Loader } from '../components/ui/Loader';
import { Modal } from '../components/ui/Modal';
import { Badge } from '../components/ui/Badge';
import { formatDate } from '../utils/formatters';

const ALL_WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export const Organization = () => {
  const { business } = useAuth();
  const [activeTab, setActiveTab] = useState('profile'); // 'profile' | 'branches' | 'departments' | 'designations' | 'working-days' | 'holidays'

  const [bizDetail, setBizDetail] = useState(null);
  const [branches, setBranches] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [designations, setDesignations] = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deptSearch, setDeptSearch] = useState('');

  // Business Edit Modal
  const [showBizEdit, setShowBizEdit] = useState(false);
  const [bizForm, setBizForm] = useState({ name: '', email: '', phone: '', address: '', city: '', state: '', country: 'India' });

  // Branch Create / Edit / Detail / Employees
  const [showBranchModal, setShowBranchModal] = useState(false);
  const [editingBranch, setEditingBranch] = useState(null);
  const [branchForm, setBranchForm] = useState({ name: '', code: '', address: '', city: '', state: '', geofence_radius: 300 });
  const [selectedBranch, setSelectedBranch] = useState(null);
  const [branchEmployees, setBranchEmployees] = useState([]);
  const [showBranchEmployees, setShowBranchEmployees] = useState(false);

  // Department Create / Edit / Users
  const [showDeptModal, setShowDeptModal] = useState(false);
  const [editingDept, setEditingDept] = useState(null);
  const [deptForm, setDeptForm] = useState({ name: '', code: '' });
  const [deptUsersModal, setDeptUsersModal] = useState(null);
  const [deptUsers, setDeptUsers] = useState([]);

  // Designation Create
  const [showDesigModal, setShowDesigModal] = useState(false);
  const [desigForm, setDesigForm] = useState({ name: '', level: 1 });

  // Working Days Configure Modal
  const [showWorkingDaysModal, setShowWorkingDaysModal] = useState(false);
  const [workingDays, setWorkingDays] = useState(['Mon', 'Tue', 'Wed', 'Thu', 'Fri']);

  // Holiday Create Modal
  const [showHolidayModal, setShowHolidayModal] = useState(false);
  const [holidayForm, setHolidayForm] = useState({ name: '', date: new Date().toISOString().split('T')[0], type: 'PUBLIC' });

  const [submitting, setSubmitting] = useState(false);

  const fetchAll = async () => {
    try {
      setLoading(true);
      const calls = [
        api.get('/branches/'),
        api.get('/branches/departments/'),
        api.get('/branches/designations/'),
        api.get('/attendance/holidays/'),
      ];
      if (business?.id) {
        calls.push(api.get(`/businesses/${business.id}/`));
      }
      const results = await Promise.allSettled(calls);

      if (results[0].status === 'fulfilled') {
        const d = results[0].value.data?.data || results[0].value.data?.results || [];
        setBranches(Array.isArray(d) ? d : []);
      }
      if (results[1].status === 'fulfilled') {
        const d = results[1].value.data?.data || results[1].value.data?.results || [];
        setDepartments(Array.isArray(d) ? d : []);
      }
      if (results[2].status === 'fulfilled') {
        const d = results[2].value.data?.data || results[2].value.data?.results || [];
        setDesignations(Array.isArray(d) ? d : []);
      }
      if (results[3].status === 'fulfilled') {
        const d = results[3].value.data?.data || results[3].value.data?.results || [];
        setHolidays(Array.isArray(d) ? d : []);
      }
      if (results[4] && results[4].status === 'fulfilled') {
        const b = results[4].value.data?.data || results[4].value.data;
        setBizDetail(b);
        if (Array.isArray(b?.working_days)) {
          setWorkingDays(b.working_days);
        }
      } else if (business) {
        setBizDetail(business);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, [business?.id]);

  // 1. Business Profile Save
  const openEditBusiness = () => {
    const src = bizDetail || business || {};
    setBizForm({
      name: src.name || '',
      email: src.email || '',
      phone: src.phone || '',
      address: src.address || '',
      city: src.city || '',
      state: src.state || '',
      country: src.country || 'India',
    });
    setShowBizEdit(true);
  };

  const handleSaveBusiness = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      await api.patch(`/businesses/${(bizDetail || business).id}/`, bizForm);
      setShowBizEdit(false);
      await fetchAll();
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Failed to update business profile');
    } finally {
      setSubmitting(false);
    }
  };

  // 2. Branch Actions
  const openAddBranch = () => {
    setEditingBranch(null);
    setBranchForm({ name: '', code: '', address: '', city: '', state: '', geofence_radius: 300 });
    setShowBranchModal(true);
  };

  const openEditBranch = (br) => {
    setEditingBranch(br);
    setBranchForm({
      name: br.name || '',
      code: br.code || '',
      address: br.address || '',
      city: br.city || '',
      state: br.state || '',
      geofence_radius: br.geofence_radius || 300,
    });
    setSelectedBranch(null);
    setShowBranchModal(true);
  };

  const handleSaveBranch = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      if (editingBranch) {
        await api.patch(`/branches/${editingBranch.id}/`, branchForm);
      } else {
        await api.post('/branches/', branchForm);
      }
      setShowBranchModal(false);
      await fetchAll();
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Failed to save branch');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeactivateBranch = async (br) => {
    if (!confirm(`Are you sure you want to ${br.is_active !== false ? 'deactivate' : 'activate'} branch "${br.name}"?`)) {
      return;
    }
    try {
      await api.patch(`/branches/${br.id}/`, { is_active: br.is_active === false });
      await fetchAll();
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Failed to update branch status');
    }
  };

  const handleViewBranchEmployees = async (br) => {
    setShowBranchEmployees(true);
    try {
      const res = await api.get('/employees/', { params: { branch: br.id } });
      const list = res.data?.data || res.data?.results || [];
      setBranchEmployees(Array.isArray(list) ? list : []);
    } catch {
      setBranchEmployees([]);
    }
  };

  // 3. Department Actions
  const openAddDept = () => {
    setEditingDept(null);
    setDeptForm({ name: '', code: '' });
    setShowDeptModal(true);
  };

  const openEditDept = (dept) => {
    setEditingDept(dept);
    setDeptForm({ name: dept.name || '', code: dept.code || '' });
    setShowDeptModal(true);
  };

  const handleSaveDept = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      if (editingDept) {
        await api.patch(`/branches/departments/${editingDept.id}/`, deptForm);
      } else {
        await api.post('/branches/departments/', deptForm);
      }
      setShowDeptModal(false);
      await fetchAll();
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Failed to save department');
    } finally {
      setSubmitting(false);
    }
  };

  const handleViewDeptUsers = async (dept) => {
    setDeptUsersModal(dept);
    try {
      const res = await api.get('/employees/', { params: { department: dept.id } });
      const list = res.data?.data || res.data?.results || [];
      setDeptUsers(Array.isArray(list) ? list : []);
    } catch {
      setDeptUsers([]);
    }
  };

  // 4. Designation Create
  const handleSaveDesig = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      await api.post('/branches/designations/', desigForm);
      setShowDesigModal(false);
      setDesigForm({ name: '', level: 1 });
      await fetchAll();
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Failed to create designation');
    } finally {
      setSubmitting(false);
    }
  };

  // 5. Working Days Configure
  const toggleDay = (day) => {
    setWorkingDays((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]));
  };

  const handleSaveWorkingDays = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      await api.patch(`/businesses/${(bizDetail || business).id}/`, { working_days: workingDays });
      setShowWorkingDaysModal(false);
      await fetchAll();
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Failed to update working days');
    } finally {
      setSubmitting(false);
    }
  };

  // 6. Holiday Create
  const handleSaveHoliday = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      await api.post('/attendance/holidays/', holidayForm);
      setShowHolidayModal(false);
      setHolidayForm({ name: '', date: new Date().toISOString().split('T')[0], type: 'PUBLIC' });
      await fetchAll();
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Failed to add holiday');
    } finally {
      setSubmitting(false);
    }
  };

  const tabs = [
    { id: 'profile', label: 'Business Profile', icon: Building2 },
    { id: 'branches', label: 'Branches', icon: MapPin },
    { id: 'departments', label: 'Departments', icon: Layers },
    { id: 'designations', label: 'Designations', icon: Award },
    { id: 'working-days', label: 'Working Days', icon: CalendarDays },
    { id: 'holidays', label: 'Holidays', icon: CalendarOff },
  ];

  const filteredDepts = departments.filter((d) =>
    d.name?.toLowerCase().includes(deptSearch.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Building2 className="w-5 h-5 text-indigo-600" />
            <span>Organization Management</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {(bizDetail || business)?.name || 'Business'} — Profile, branches, departments, designations, working days &amp; holidays
          </p>
        </div>
      </div>

      {/* 6 Sub-Section Tabs */}
      <div className="flex flex-wrap gap-1.5 border-b border-slate-200 pb-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
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

      {loading ? (
        <Loader message="Loading organization details..." />
      ) : activeTab === 'profile' ? (
        /* 1. Business Profile */
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">{bizDetail?.name}</h3>
              <p className="text-xs text-slate-500 font-mono">{bizDetail?.slug}</p>
            </div>
            <button
              onClick={openEditBusiness}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Edit</span>
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
            <div className="p-3 bg-slate-50 rounded-lg">
              <p className="text-[10px] font-bold text-slate-400 uppercase">Email</p>
              <p className="font-semibold text-slate-800 mt-1">{bizDetail?.email || '-'}</p>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg">
              <p className="text-[10px] font-bold text-slate-400 uppercase">Phone</p>
              <p className="font-semibold text-slate-800 mt-1">{bizDetail?.phone || '-'}</p>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg">
              <p className="text-[10px] font-bold text-slate-400 uppercase">Currency &amp; Timezone</p>
              <p className="font-semibold text-slate-800 mt-1">{bizDetail?.currency || 'INR'} • {bizDetail?.timezone || 'Asia/Kolkata'}</p>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg sm:col-span-2 lg:col-span-3">
              <p className="text-[10px] font-bold text-slate-400 uppercase">Registered Address</p>
              <p className="font-semibold text-slate-800 mt-1">
                {[bizDetail?.address, bizDetail?.city, bizDetail?.state, bizDetail?.country].filter(Boolean).join(', ') || '-'}
              </p>
            </div>
          </div>
        </div>
      ) : activeTab === 'branches' ? (
        /* 2. Branches */
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Branches ({branches.length})</h3>
            <button
              onClick={openAddBranch}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Branch</span>
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[11px]">
                  <th className="py-3 px-4">Branch Name</th>
                  <th className="py-3 px-4">Code</th>
                  <th className="py-3 px-4">Location</th>
                  <th className="py-3 px-4">Geofence</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {branches.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4">
                      <button
                        onClick={() => { setSelectedBranch(b); setShowBranchEmployees(false); }}
                        className="font-semibold text-indigo-700 hover:underline text-left"
                      >
                        {b.name}
                      </button>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-600">{b.code}</td>
                    <td className="py-3 px-4 text-slate-600">{b.city ? `${b.city}, ${b.state || ''}` : '-'}</td>
                    <td className="py-3 px-4 font-mono text-slate-700">{b.geofence_radius || 200}m</td>
                    <td className="py-3 px-4">
                      <Badge variant={b.is_active !== false ? 'success' : 'danger'}>
                        {b.is_active !== false ? 'ACTIVE' : 'INACTIVE'}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-right space-x-2 whitespace-nowrap">
                      <button
                        onClick={() => { setSelectedBranch(b); setShowBranchEmployees(false); }}
                        className="text-indigo-600 hover:text-indigo-800 font-semibold text-xs px-2 py-1 rounded hover:bg-indigo-50"
                      >
                        View
                      </button>
                      <button
                        onClick={() => handleDeactivateBranch(b)}
                        className="text-rose-600 hover:text-rose-800 font-semibold text-xs px-2 py-1 rounded hover:bg-rose-50"
                      >
                        {b.is_active !== false ? 'Deactivate' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : activeTab === 'departments' ? (
        /* 3. Departments */
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search departments..."
                value={deptSearch}
                onChange={(e) => setDeptSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
              />
            </div>
            <button
              onClick={openAddDept}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold self-start sm:self-auto"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Department</span>
            </button>
          </div>
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[11px]">
                <th className="py-3 px-4">Department Name</th>
                <th className="py-3 px-4">Code</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredDepts.map((d) => (
                <tr key={d.id} className="hover:bg-slate-50">
                  <td className="py-3 px-4 font-semibold text-slate-900">{d.name}</td>
                  <td className="py-3 px-4 font-mono text-slate-600">{d.code || '-'}</td>
                  <td className="py-3 px-4 text-right space-x-2">
                    <button
                      onClick={() => handleViewDeptUsers(d)}
                      className="text-indigo-600 hover:underline font-semibold text-xs"
                    >
                      View assigned users
                    </button>
                    <button
                      onClick={() => openEditDept(d)}
                      className="text-slate-700 hover:text-indigo-700 font-semibold text-xs px-2 py-1 rounded hover:bg-slate-100"
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : activeTab === 'designations' ? (
        /* 4. Designations */
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Designations ({designations.length})</h3>
            <button
              onClick={() => setShowDesigModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Designation</span>
            </button>
          </div>
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[11px]">
                <th className="py-3 px-4">Designation Title</th>
                <th className="py-3 px-4">Hierarchy Level</th>
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
        </div>
      ) : activeTab === 'working-days' ? (
        /* 5. Working Days */
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900">Configured Working Days</h3>
              <p className="text-xs text-slate-500">Weekly schedule used for attendance and payroll proration</p>
            </div>
            <button
              onClick={() => setShowWorkingDaysModal(true)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold"
            >
              Configure
            </button>
          </div>
          <div className="grid grid-cols-7 gap-2 pt-2">
            {ALL_WEEKDAYS.map((day) => {
              const active = workingDays.includes(day);
              return (
                <div
                  key={day}
                  className={`p-3 rounded-xl border text-center ${
                    active ? 'bg-indigo-50 border-indigo-300 text-indigo-700' : 'bg-slate-50 border-slate-200 text-slate-400'
                  }`}
                >
                  <p className="text-xs font-bold">{day}</p>
                  <p className="text-[10px] mt-1">{active ? 'Working' : 'Off'}</p>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* 6. Holidays */
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Company Holidays ({holidays.length})</h3>
            <button
              onClick={() => setShowHolidayModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Holiday</span>
            </button>
          </div>
          {holidays.length === 0 ? (
            <div className="p-10 text-center text-xs text-slate-500">No holidays added yet. Click Add Holiday to create one.</div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[11px]">
                  <th className="py-3 px-4">Holiday Name</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Type</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {holidays.map((h) => (
                  <tr key={h.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-semibold text-slate-900">{h.name}</td>
                    <td className="py-3 px-4 text-slate-600">{formatDate(h.date)}</td>
                    <td className="py-3 px-4"><Badge variant="info">{h.type || 'PUBLIC'}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Edit Business Modal */}
      <Modal isOpen={showBizEdit} onClose={() => setShowBizEdit(false)} title="Edit Business Profile">
        <form onSubmit={handleSaveBusiness} className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Business Name *</label>
            <input type="text" required value={bizForm.name} onChange={(e) => setBizForm({ ...bizForm, name: e.target.value })} className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Email</label>
              <input type="email" value={bizForm.email} onChange={(e) => setBizForm({ ...bizForm, email: e.target.value })} className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Phone</label>
              <input type="tel" value={bizForm.phone} onChange={(e) => setBizForm({ ...bizForm, phone: e.target.value })} className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Address</label>
            <input type="text" value={bizForm.address} onChange={(e) => setBizForm({ ...bizForm, address: e.target.value })} className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">City</label>
              <input type="text" value={bizForm.city} onChange={(e) => setBizForm({ ...bizForm, city: e.target.value })} className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">State</label>
              <input type="text" value={bizForm.state} onChange={(e) => setBizForm({ ...bizForm, state: e.target.value })} className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg" />
            </div>
          </div>
          <div className="pt-3 flex justify-end gap-2">
            <button type="button" onClick={() => setShowBizEdit(false)} className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg">Cancel</button>
            <button type="submit" disabled={submitting} className="px-4 py-1.5 text-xs font-semibold bg-indigo-600 text-white rounded-lg">{submitting ? 'Saving...' : 'Save Changes'}</button>
          </div>
        </form>
      </Modal>

      {/* Add / Edit Branch Modal */}
      <Modal isOpen={showBranchModal} onClose={() => setShowBranchModal(false)} title={editingBranch ? 'Edit Branch' : 'Add Branch'}>
        <form onSubmit={handleSaveBranch} className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Branch Name *</label>
            <input type="text" required value={branchForm.name} onChange={(e) => setBranchForm({ ...branchForm, name: e.target.value })} className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Branch Code *</label>
              <input type="text" required value={branchForm.code} onChange={(e) => setBranchForm({ ...branchForm, code: e.target.value })} placeholder="BR-02" className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Geofence (m)</label>
              <input type="number" value={branchForm.geofence_radius} onChange={(e) => setBranchForm({ ...branchForm, geofence_radius: Number(e.target.value) })} className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">City</label>
              <input type="text" value={branchForm.city} onChange={(e) => setBranchForm({ ...branchForm, city: e.target.value })} className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">State</label>
              <input type="text" value={branchForm.state} onChange={(e) => setBranchForm({ ...branchForm, state: e.target.value })} className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg" />
            </div>
          </div>
          <div className="pt-3 flex justify-end gap-2">
            <button type="button" onClick={() => setShowBranchModal(false)} className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg">Cancel</button>
            <button type="submit" disabled={submitting} className="px-4 py-1.5 text-xs font-semibold bg-indigo-600 text-white rounded-lg">{submitting ? 'Saving...' : 'Save Branch'}</button>
          </div>
        </form>
      </Modal>

      {/* Branch Detail Modal (Edit, Employees, Attendance/Settings links) */}
      <Modal isOpen={!!selectedBranch} onClose={() => setSelectedBranch(null)} title={`Branch Details — ${selectedBranch?.name || ''}`}>
        {selectedBranch && (
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div className="p-2.5 bg-slate-50 rounded-lg">
                <p className="text-[10px] font-bold text-slate-400 uppercase">Code</p>
                <p className="font-mono font-semibold text-slate-900 mt-0.5">{selectedBranch.code}</p>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-lg">
                <p className="text-[10px] font-bold text-slate-400 uppercase">Geofence Radius</p>
                <p className="font-semibold text-slate-900 mt-0.5">{selectedBranch.geofence_radius || 200}m</p>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-lg col-span-2">
                <p className="text-[10px] font-bold text-slate-400 uppercase">Location</p>
                <p className="font-semibold text-slate-900 mt-0.5">{[selectedBranch.address, selectedBranch.city, selectedBranch.state].filter(Boolean).join(', ') || '-'}</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100">
              <button onClick={() => openEditBranch(selectedBranch)} className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg font-semibold">Edit</button>
              <button onClick={() => handleViewBranchEmployees(selectedBranch)} className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg font-semibold">Employees</button>
              <Link to="/attendance" className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg font-semibold">Attendance</Link>
              <Link to="/settings" className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg font-semibold">Settings</Link>
            </div>

            {showBranchEmployees && (
              <div className="pt-3 border-t border-slate-100">
                <p className="font-bold text-slate-800 mb-2">Branch Employee List ({branchEmployees.length})</p>
                {branchEmployees.length === 0 ? (
                  <p className="text-slate-500">No employees assigned to this branch.</p>
                ) : (
                  <div className="max-h-40 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-lg">
                    {branchEmployees.map((emp) => (
                      <div key={emp.id} className="p-2 flex justify-between">
                        <span className="font-medium text-slate-800">{emp.full_name || `${emp.first_name} ${emp.last_name}`}</span>
                        <span className="font-mono text-slate-500">{emp.employee_code}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Add / Edit Department Modal */}
      <Modal isOpen={showDeptModal} onClose={() => setShowDeptModal(false)} title={editingDept ? 'Edit Department' : 'Add Department'}>
        <form onSubmit={handleSaveDept} className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Department Name *</label>
            <input type="text" required value={deptForm.name} onChange={(e) => setDeptForm({ ...deptForm, name: e.target.value })} className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Code *</label>
            <input type="text" required value={deptForm.code} onChange={(e) => setDeptForm({ ...deptForm, code: e.target.value })} className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg" />
          </div>
          <div className="pt-3 flex justify-end gap-2">
            <button type="button" onClick={() => setShowDeptModal(false)} className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg">Cancel</button>
            <button type="submit" disabled={submitting} className="px-4 py-1.5 text-xs font-semibold bg-indigo-600 text-white rounded-lg">{submitting ? 'Saving...' : 'Save Department'}</button>
          </div>
        </form>
      </Modal>

      {/* Department Assigned Users Modal */}
      <Modal isOpen={!!deptUsersModal} onClose={() => setDeptUsersModal(null)} title={`Assigned Users — ${deptUsersModal?.name || ''}`}>
        <div className="text-xs">
          {deptUsers.length === 0 ? (
            <p className="text-slate-500">No users assigned to this department.</p>
          ) : (
            <div className="max-h-60 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-lg">
              {deptUsers.map((u) => (
                <div key={u.id} className="p-2.5 flex justify-between">
                  <span className="font-semibold text-slate-900">{u.full_name || `${u.first_name} ${u.last_name}`}</span>
                  <span className="text-slate-500">{u.email}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </Modal>

      {/* Add Designation Modal */}
      <Modal isOpen={showDesigModal} onClose={() => setShowDesigModal(false)} title="Add Designation">
        <form onSubmit={handleSaveDesig} className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Designation Name *</label>
            <input type="text" required value={desigForm.name} onChange={(e) => setDesigForm({ ...desigForm, name: e.target.value })} className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Level</label>
            <input type="number" min={1} max={10} value={desigForm.level} onChange={(e) => setDesigForm({ ...desigForm, level: Number(e.target.value) })} className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg" />
          </div>
          <div className="pt-3 flex justify-end gap-2">
            <button type="button" onClick={() => setShowDesigModal(false)} className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg">Cancel</button>
            <button type="submit" disabled={submitting} className="px-4 py-1.5 text-xs font-semibold bg-indigo-600 text-white rounded-lg">{submitting ? 'Saving...' : 'Save Designation'}</button>
          </div>
        </form>
      </Modal>

      {/* Configure Working Days Modal */}
      <Modal isOpen={showWorkingDaysModal} onClose={() => setShowWorkingDaysModal(false)} title="Configure Working Days">
        <form onSubmit={handleSaveWorkingDays} className="space-y-4">
          <div className="grid grid-cols-4 gap-2">
            {ALL_WEEKDAYS.map((day) => {
              const selected = workingDays.includes(day);
              return (
                <button
                  type="button"
                  key={day}
                  onClick={() => toggleDay(day)}
                  className={`py-2 rounded-lg text-xs font-bold border ${
                    selected ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-slate-50 text-slate-600 border-slate-200'
                  }`}
                >
                  {day}
                </button>
              );
            })}
          </div>
          <div className="pt-3 flex justify-end gap-2">
            <button type="button" onClick={() => setShowWorkingDaysModal(false)} className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg">Cancel</button>
            <button type="submit" disabled={submitting} className="px-4 py-1.5 text-xs font-semibold bg-indigo-600 text-white rounded-lg">{submitting ? 'Saving...' : 'Save Working Days'}</button>
          </div>
        </form>
      </Modal>

      {/* Add Holiday Modal */}
      <Modal isOpen={showHolidayModal} onClose={() => setShowHolidayModal(false)} title="Add Company Holiday">
        <form onSubmit={handleSaveHoliday} className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Holiday Name *</label>
            <input type="text" required value={holidayForm.name} onChange={(e) => setHolidayForm({ ...holidayForm, name: e.target.value })} placeholder="e.g. Republic Day" className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Date *</label>
              <input type="date" required value={holidayForm.date} onChange={(e) => setHolidayForm({ ...holidayForm, date: e.target.value })} className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Type</label>
              <select value={holidayForm.type} onChange={(e) => setHolidayForm({ ...holidayForm, type: e.target.value })} className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white">
                <option value="PUBLIC">Public Holiday</option>
                <option value="OPTIONAL">Optional Holiday</option>
                <option value="COMPANY">Company Holiday</option>
              </select>
            </div>
          </div>
          <div className="pt-3 flex justify-end gap-2">
            <button type="button" onClick={() => setShowHolidayModal(false)} className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg">Cancel</button>
            <button type="submit" disabled={submitting} className="px-4 py-1.5 text-xs font-semibold bg-indigo-600 text-white rounded-lg">{submitting ? 'Saving...' : 'Save Holiday'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
