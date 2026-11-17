import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Building2,
  MapPin,
  Users,
  Briefcase,
  Calendar,
  CalendarCheck2,
  Sparkles,
  Plus,
  Edit3,
  Clock,
  ShieldCheck,
  Check,
  Mail,
  Phone,
  Globe,
  ArrowRight,
} from 'lucide-react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { formatDate } from '../utils/formatters';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Button,
  Input,
  Select,
  Badge,
  Loader,
  Modal,
} from '../components/ui';

const ALL_WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export const Organization = () => {
  const { business } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(true);

  // Data states
  const [bizDetail, setBizDetail] = useState(null);
  const [branches, setBranches] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [designations, setDesignations] = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [workingDays, setWorkingDays] = useState(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']);

  // Modals & form states
  const [showBizEdit, setShowBizEdit] = useState(false);
  const [bizForm, setBizForm] = useState({ name: '', email: '', phone: '', address: '', city: '', state: '', country: 'India' });

  const [showBranchModal, setShowBranchModal] = useState(false);
  const [editingBranch, setEditingBranch] = useState(null);
  const [branchForm, setBranchForm] = useState({ name: '', code: '', address: '', city: '', state: '', geofence_radius: 200 });
  const [selectedBranch, setSelectedBranch] = useState(null);
  const [branchEmployees, setBranchEmployees] = useState([]);
  const [showBranchEmployees, setShowBranchEmployees] = useState(false);

  const [showDeptModal, setShowDeptModal] = useState(false);
  const [editingDept, setEditingDept] = useState(null);
  const [deptForm, setDeptForm] = useState({ name: '', code: '' });
  const [deptUsersModal, setDeptUsersModal] = useState(null);
  const [deptUsers, setDeptUsers] = useState([]);

  const [showDesigModal, setShowDesigModal] = useState(false);
  const [desigForm, setDesigForm] = useState({ name: '', level: 1 });

  const [showHolidayModal, setShowHolidayModal] = useState(false);
  const [holidayForm, setHolidayForm] = useState({ name: '', date: '', type: 'PUBLIC' });

  const [showWorkingDaysModal, setShowWorkingDaysModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Fetch all org data
  const parseApiError = (err, fallback) => {
    const data = err.response?.data;
    if (!data) return fallback;
    if (typeof data === 'string') return data;
    if (data.error?.message) return data.error.message;
    if (data.detail) return data.detail;
    if (data.message) return data.message;
    const firstKey = Object.keys(data)[0];
    if (firstKey) {
      const val = data[firstKey];
      if (Array.isArray(val) && val.length > 0) return `${firstKey}: ${val[0]}`;
      if (typeof val === 'string') return `${firstKey}: ${val}`;
    }
    return fallback;
  };

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
      alert(parseApiError(err, 'Failed to update business profile'));
    } finally {
      setSubmitting(false);
    }
  };

  // 2. Branch Actions
  const openAddBranch = () => {
    setEditingBranch(null);
    setBranchForm({ name: '', code: '', address: '', city: '', state: '', geofence_radius: 200 });
    setShowBranchModal(true);
  };

  const openEditBranch = (b) => {
    setEditingBranch(b);
    setBranchForm({
      name: b.name || '',
      code: b.code || '',
      address: b.address || '',
      city: b.city || '',
      state: b.state || '',
      geofence_radius: b.geofence_radius || 200,
    });
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
      alert(parseApiError(err, 'Failed to save branch'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeactivateBranch = async (b) => {
    const action = b.is_active !== false ? 'deactivate' : 'activate';
    if (!window.confirm(`Are you sure you want to ${action} branch "${b.name}"?`)) return;
    try {
      await api.patch(`/branches/${b.id}/`, { is_active: b.is_active === false });
      await fetchAll();
    } catch (err) {
      alert(parseApiError(err, `Failed to ${action} branch`));
    }
  };

  const handleViewBranchEmployees = async (branch) => {
    try {
      setSelectedBranch(branch);
      setShowBranchEmployees(true);
      const res = await api.get(`/employees/?branch=${branch.id}`);
      const list = res.data?.data || res.data?.results || res.data || [];
      setBranchEmployees(Array.isArray(list) ? list : []);
    } catch (err) {
      console.warn('Could not load branch employees', err);
      setBranchEmployees([]);
    }
  };

  // 3. Department Actions
  const openAddDept = () => {
    setEditingDept(null);
    setDeptForm({ name: '', code: '' });
    setShowDeptModal(true);
  };

  const openEditDept = (d) => {
    setEditingDept(d);
    setDeptForm({ name: d.name || '', code: d.code || '' });
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
      alert(parseApiError(err, 'Failed to save department'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleViewDeptUsers = async (dept) => {
    try {
      setDeptUsersModal(dept);
      const res = await api.get(`/employees/?department=${dept.id}`);
      const list = res.data?.data || res.data?.results || res.data || [];
      setDeptUsers(Array.isArray(list) ? list : []);
    } catch (err) {
      console.warn('Could not load dept users', err);
      setDeptUsers([]);
    }
  };

  // 4. Designation Actions
  const handleSaveDesig = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      await api.post('/branches/designations/', desigForm);
      setShowDesigModal(false);
      setDesigForm({ name: '', level: 1 });
      await fetchAll();
    } catch (err) {
      alert(parseApiError(err, 'Failed to add designation'));
    } finally {
      setSubmitting(false);
    }
  };

  // 5. Working Days Actions
  const toggleDay = (day) => {
    setWorkingDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const handleSaveWorkingDays = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      await api.patch(`/businesses/${(bizDetail || business).id}/`, {
        working_days: workingDays,
      });
      setShowWorkingDaysModal(false);
      await fetchAll();
    } catch (err) {
      alert(parseApiError(err, 'Failed to update working days'));
    } finally {
      setSubmitting(false);
    }
  };

  // 6. Holiday Actions
  const handleSaveHoliday = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      await api.post('/attendance/holidays/', holidayForm);
      setShowHolidayModal(false);
      setHolidayForm({ name: '', date: '', type: 'PUBLIC' });
      await fetchAll();
    } catch (err) {
      alert(parseApiError(err, 'Failed to add holiday'));
    } finally {
      setSubmitting(false);
    }
  };

  const tabs = [
    { id: 'profile', label: 'Business Profile', icon: Building2 },
    { id: 'branches', label: 'Branches', icon: MapPin, count: branches.length },
    { id: 'departments', label: 'Departments', icon: Users, count: departments.length },
    { id: 'designations', label: 'Designations', icon: Briefcase, count: designations.length },
    { id: 'working_days', label: 'Working Days', icon: Calendar },
    { id: 'holidays', label: 'Holidays', icon: Sparkles, count: holidays.length },
  ];

  const currentBizName = bizDetail?.name || business?.name || 'Company Profile';

  return (
    <div className="space-y-6">
      {/* 1. Professional Organization Hero Header */}
      <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
          <div className="flex items-start sm:items-center gap-4 min-w-0">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-zinc-950 text-white flex items-center justify-center font-black text-2xl shadow-sm shrink-0">
              {currentBizName ? currentBizName[0].toUpperCase() : 'C'}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-xl sm:text-2xl font-black text-zinc-950 tracking-tight truncate">
                  {currentBizName}
                </h1>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-zinc-100 text-zinc-800 border border-zinc-200 uppercase tracking-wide shrink-0">
                  <ShieldCheck className="w-3 h-3 text-zinc-700" />
                  Verified Organization
                </span>
              </div>
              <p className="text-xs text-zinc-500 mt-1 flex flex-wrap items-center gap-2 font-mono">
                <span>Tenant ID: <strong className="text-zinc-800 font-bold">{bizDetail?.slug || 'company-slug'}</strong></span>
                <span className="hidden sm:inline text-zinc-300">&bull;</span>
                <span className="font-sans">HQ: <strong className="text-zinc-800 font-semibold">{bizDetail?.city || 'Noida'}, {bizDetail?.state || 'India'}</strong></span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 self-start sm:self-auto">
            <Button
              variant="primary"
              size="sm"
              leftIcon={Edit3}
              onClick={openEditBusiness}
            >
              Edit Profile
            </Button>
          </div>
        </div>

        {/* Quick Enterprise Metrics Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-zinc-100">
          <div className="px-3.5 py-2.5 bg-zinc-50 rounded-xl border border-zinc-200/80">
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">Locations</span>
            <span className="text-sm font-black text-zinc-950 mt-0.5 block">{branches.length} Branches</span>
          </div>
          <div className="px-3.5 py-2.5 bg-zinc-50 rounded-xl border border-zinc-200/80">
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">Departments</span>
            <span className="text-sm font-black text-zinc-950 mt-0.5 block">{departments.length} Divisions</span>
          </div>
          <div className="px-3.5 py-2.5 bg-zinc-50 rounded-xl border border-zinc-200/80">
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">Job Titles</span>
            <span className="text-sm font-black text-zinc-950 mt-0.5 block">{designations.length} Designations</span>
          </div>
          <div className="px-3.5 py-2.5 bg-zinc-50 rounded-xl border border-zinc-200/80">
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">Operating Schedule</span>
            <span className="text-sm font-black text-zinc-950 mt-0.5 block">{workingDays.length} Working Days</span>
          </div>
        </div>
      </div>

      {/* 2. Structured Tab Bar */}
      <div className="flex items-center gap-1 border-b border-zinc-200 overflow-x-auto no-scrollbar pb-px">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === tab.id
                ? 'border-zinc-950 text-zinc-950'
                : 'border-transparent text-zinc-500 hover:text-zinc-900 hover:border-zinc-300'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            <span>{tab.label}</span>
            {tab.count !== undefined && (
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                activeTab === tab.id ? 'bg-zinc-950 text-white' : 'bg-zinc-100 text-zinc-600'
              }`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <Loader message="Loading organization details..." />
      ) : activeTab === 'profile' ? (
        /* ---------------------------------------------------- */
        /* TAB 1: BUSINESS PROFILE (Structured 2-Column Layout) */
        /* ---------------------------------------------------- */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Column 1 & 2: Primary Corporate Legal & Contact Info */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader className="justify-between">
                <div>
                  <CardTitle>Corporate Identity &amp; Contact Details</CardTitle>
                  <CardDescription>Official registered business profile and contact information</CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="xs"
                  leftIcon={Edit3}
                  onClick={openEditBusiness}
                >
                  Edit
                </Button>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-3.5 bg-zinc-50 rounded-xl border border-zinc-200/80">
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">Legal Business Name</span>
                    <p className="text-sm font-bold text-zinc-950 mt-1">{bizDetail?.name || '-'}</p>
                  </div>

                  <div className="p-3.5 bg-zinc-50 rounded-xl border border-zinc-200/80">
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">System Slug / Identifier</span>
                    <p className="text-sm font-mono font-bold text-zinc-900 mt-1">{bizDetail?.slug || '-'}</p>
                  </div>

                  <div className="p-3.5 bg-zinc-50 rounded-xl border border-zinc-200/80">
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
                      <Mail className="w-3 h-3 text-zinc-500" />
                      Official Email Address
                    </span>
                    <p className="text-sm font-bold text-zinc-950 mt-1 break-all">{bizDetail?.email || '-'}</p>
                  </div>

                  <div className="p-3.5 bg-zinc-50 rounded-xl border border-zinc-200/80">
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
                      <Phone className="w-3 h-3 text-zinc-500" />
                      Primary Contact Phone
                    </span>
                    <p className="text-sm font-bold text-zinc-950 mt-1">{bizDetail?.phone || '-'}</p>
                  </div>

                  <div className="p-3.5 bg-zinc-50 rounded-xl border border-zinc-200/80">
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
                      <Globe className="w-3 h-3 text-zinc-500" />
                      Currency &amp; Timezone
                    </span>
                    <p className="text-sm font-bold text-zinc-950 mt-1">
                      {bizDetail?.currency || 'INR'} &bull; {bizDetail?.timezone || 'Asia/Kolkata'}
                    </p>
                  </div>

                  <div className="p-3.5 bg-zinc-50 rounded-xl border border-zinc-200/80">
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">Country</span>
                    <p className="text-sm font-bold text-zinc-950 mt-1">{bizDetail?.country || 'India'}</p>
                  </div>
                </div>

                <div className="p-4 bg-zinc-50 rounded-xl border border-zinc-200/80">
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
                    <MapPin className="w-3 h-3 text-zinc-500" />
                    Registered Corporate Address
                  </span>
                  <p className="text-sm font-bold text-zinc-950 mt-1.5 leading-relaxed">
                    {[bizDetail?.address, bizDetail?.city, bizDetail?.state, bizDetail?.country].filter(Boolean).join(', ') || 'No address configured yet.'}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Column 3: Organizational Directory Snapshot */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Operating Branches ({branches.length})</CardTitle>
                <CardDescription>Configured facility locations</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2.5">
                {branches.slice(0, 4).map((b) => (
                  <div key={b.id} className="p-3 bg-zinc-50 rounded-xl border border-zinc-200/80 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-zinc-900">{b.name}</p>
                      <p className="text-[11px] text-zinc-500">{b.city ? `${b.city}, ${b.state || ''}` : b.code}</p>
                    </div>
                    <Badge variant={b.is_active !== false ? 'inverted' : 'outline'} size="xs">
                      {b.code}
                    </Badge>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setActiveTab('branches')}
                  className="w-full text-center py-2 text-xs font-bold text-zinc-900 hover:underline flex items-center justify-center gap-1 mt-2 cursor-pointer"
                >
                  <span>View All {branches.length} Branches</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Standard Work Schedule</CardTitle>
                <CardDescription>Weekly operational active days</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-1.5">
                  {ALL_WEEKDAYS.map((day) => {
                    const active = workingDays.includes(day);
                    return (
                      <span
                        key={day}
                        className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border ${
                          active
                            ? 'bg-zinc-950 text-white border-zinc-950'
                            : 'bg-zinc-100 text-zinc-400 border-zinc-200'
                        }`}
                      >
                        {day.slice(0, 3)}
                      </span>
                    );
                  })}
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('working_days')}
                  className="text-xs font-bold text-zinc-900 hover:underline flex items-center gap-1 mt-4 cursor-pointer"
                >
                  <span>Manage Work Days &rarr;</span>
                </button>
              </CardContent>
            </Card>
          </div>
        </div>
      ) : activeTab === 'branches' ? (
        /* ---------------------------------------------------- */
        /* TAB 2: BRANCHES                                      */
        /* ---------------------------------------------------- */
        <Card>
          <CardHeader className="justify-between">
            <div>
              <CardTitle>Company Branches ({branches.length})</CardTitle>
              <CardDescription>Manage your company locations, codes, and geofence tracking radii</CardDescription>
            </div>
            <Button
              variant="primary"
              size="sm"
              leftIcon={Plus}
              onClick={openAddBranch}
            >
              Add Branch
            </Button>
          </CardHeader>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-left text-xs border-collapse">
              <thead>
                <tr className="bg-zinc-50 border-b border-zinc-200 text-zinc-600 font-bold uppercase text-[11px] tracking-wider">
                  <th className="py-3 px-4">Branch Name</th>
                  <th className="py-3 px-4">Branch Code</th>
                  <th className="py-3 px-4">Location</th>
                  <th className="py-3 px-4">Geofence Radius</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200">
                {branches.map((b) => (
                  <tr key={b.id} className="hover:bg-zinc-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-zinc-900">
                      <button
                        type="button"
                        onClick={() => { setSelectedBranch(b); setShowBranchEmployees(false); }}
                        className="hover:underline text-left cursor-pointer"
                      >
                        {b.name}
                      </button>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-zinc-700">{b.code}</td>
                    <td className="py-3.5 px-4 text-zinc-600">{b.city ? `${b.city}, ${b.state || ''}` : '-'}</td>
                    <td className="py-3.5 px-4 font-mono font-bold text-zinc-800">{b.geofence_radius || 200}m</td>
                    <td className="py-3.5 px-4">
                      <Badge variant={b.is_active !== false ? 'inverted' : 'outline'}>
                        {b.is_active !== false ? 'ACTIVE' : 'INACTIVE'}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-4 text-right space-x-1.5 whitespace-nowrap">
                      <Button
                        size="xs"
                        variant="primary"
                        leftIcon={CalendarCheck2}
                        onClick={() => navigate(`/attendance?branch=${b.id}&branchName=${encodeURIComponent(b.name)}`)}
                        title={`View attendance for ${b.name}`}
                      >
                        Attendance
                      </Button>
                      <Button
                        size="xs"
                        variant="secondary"
                        onClick={() => { setSelectedBranch(b); setShowBranchEmployees(false); }}
                      >
                        Details
                      </Button>
                      <Button
                        size="xs"
                        variant="outline"
                        onClick={() => handleDeactivateBranch(b)}
                      >
                        {b.is_active !== false ? 'Deactivate' : 'Activate'}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : activeTab === 'departments' ? (
        /* ---------------------------------------------------- */
        /* TAB 3: DEPARTMENTS                                   */
        /* ---------------------------------------------------- */
        <Card>
          <CardHeader className="justify-between">
            <div>
              <CardTitle>Departments &amp; Divisions ({departments.length})</CardTitle>
              <CardDescription>Departmental division codes and employee groupings</CardDescription>
            </div>
            <Button
              variant="primary"
              size="sm"
              leftIcon={Plus}
              onClick={openAddDept}
            >
              Add Department
            </Button>
          </CardHeader>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[500px] text-left text-xs border-collapse">
              <thead>
                <tr className="bg-zinc-50 border-b border-zinc-200 text-zinc-600 font-bold uppercase text-[11px] tracking-wider">
                  <th className="py-3 px-4">Department Name</th>
                  <th className="py-3 px-4">Department Code</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200">
                {departments.map((d) => (
                  <tr key={d.id} className="hover:bg-zinc-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-zinc-900">{d.name}</td>
                    <td className="py-3.5 px-4 font-mono font-bold text-zinc-600">{d.code}</td>
                    <td className="py-3.5 px-4 text-right space-x-2">
                      <Button size="xs" variant="secondary" onClick={() => handleViewDeptUsers(d)}>
                        Users
                      </Button>
                      <Button size="xs" variant="outline" onClick={() => openEditDept(d)}>
                        Edit
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : activeTab === 'designations' ? (
        /* ---------------------------------------------------- */
        /* TAB 4: DESIGNATIONS                                  */
        /* ---------------------------------------------------- */
        <Card>
          <CardHeader className="justify-between">
            <div>
              <CardTitle>Designations &amp; Roles ({designations.length})</CardTitle>
              <CardDescription>Hierarchy levels, seniority bands, and job titles</CardDescription>
            </div>
            <Button
              variant="primary"
              size="sm"
              leftIcon={Plus}
              onClick={() => setShowDesigModal(true)}
            >
              Add Designation
            </Button>
          </CardHeader>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[500px] text-left text-xs border-collapse">
              <thead>
                <tr className="bg-zinc-50 border-b border-zinc-200 text-zinc-600 font-bold uppercase text-[11px] tracking-wider">
                  <th className="py-3 px-4">Designation Name</th>
                  <th className="py-3 px-4">Seniority Level</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200">
                {designations.map((desig) => (
                  <tr key={desig.id} className="hover:bg-zinc-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-zinc-900">{desig.name}</td>
                    <td className="py-3.5 px-4">
                      <Badge variant="default" size="xs">
                        Level {desig.level || 1}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : activeTab === 'working_days' ? (
        /* ---------------------------------------------------- */
        /* TAB 5: WORKING DAYS                                  */
        /* ---------------------------------------------------- */
        <Card>
          <CardHeader className="justify-between">
            <div>
              <CardTitle>Company Operating Schedule</CardTitle>
              <CardDescription>Standard configured active working days for workforce shifts</CardDescription>
            </div>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setShowWorkingDaysModal(true)}
            >
              Configure Schedule
            </Button>
          </CardHeader>

          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 pt-2">
              {ALL_WEEKDAYS.map((day) => {
                const active = workingDays.includes(day);
                return (
                  <div
                    key={day}
                    className={`p-4 rounded-xl border text-center transition-all ${
                      active
                        ? 'bg-zinc-950 text-white border-zinc-950 shadow-xs'
                        : 'bg-zinc-50 text-zinc-500 border-zinc-200'
                    }`}
                  >
                    <p className="text-xs font-bold">{day}</p>
                    <p className={`text-[11px] mt-1 font-semibold ${active ? 'text-zinc-200' : 'text-zinc-400'}`}>
                      {active ? 'Working Day' : 'Weekly Off'}
                    </p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      ) : (
        /* ---------------------------------------------------- */
        /* TAB 6: HOLIDAYS                                      */
        /* ---------------------------------------------------- */
        <Card>
          <CardHeader className="justify-between">
            <div>
              <CardTitle>Company Holidays Calendar ({holidays.length})</CardTitle>
              <CardDescription>Scheduled public, national, and company holidays</CardDescription>
            </div>
            <Button
              variant="primary"
              size="sm"
              leftIcon={Plus}
              onClick={() => setShowHolidayModal(true)}
            >
              Add Holiday
            </Button>
          </CardHeader>

          {holidays.length === 0 ? (
            <div className="p-12 text-center text-xs text-zinc-500">
              No holidays added yet. Click &ldquo;Add Holiday&rdquo; to create your first company holiday.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[500px] text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-zinc-50 border-b border-zinc-200 text-zinc-600 font-bold uppercase text-[11px] tracking-wider">
                    <th className="py-3 px-4">Holiday Name</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Holiday Type</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200">
                  {holidays.map((h) => (
                    <tr key={h.id} className="hover:bg-zinc-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-zinc-900">{h.name}</td>
                      <td className="py-3.5 px-4 text-zinc-700 font-mono font-medium">{formatDate(h.date)}</td>
                      <td className="py-3.5 px-4">
                        <Badge variant={h.type === 'PUBLIC' ? 'inverted' : 'default'} size="xs">
                          {h.type || 'PUBLIC'}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* ---------------------------------------------------- */}
      {/* MODALS: Clean, Standardized Components               */}
      {/* ---------------------------------------------------- */}

      {/* Modal 1: Edit Business Profile */}
      <Modal
        isOpen={showBizEdit}
        onClose={() => setShowBizEdit(false)}
        title="Edit Business Profile"
        subtitle="Update corporate name, contact information, and registered headquarters address"
      >
        <form onSubmit={handleSaveBusiness} className="space-y-4">
          <Input
            label="Legal Business Name"
            required
            value={bizForm.name}
            onChange={(e) => setBizForm({ ...bizForm, name: e.target.value })}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Corporate Email"
              type="email"
              value={bizForm.email}
              onChange={(e) => setBizForm({ ...bizForm, email: e.target.value })}
            />
            <Input
              label="Primary Phone"
              type="tel"
              value={bizForm.phone}
              onChange={(e) => setBizForm({ ...bizForm, phone: e.target.value })}
            />
          </div>

          <Input
            label="Registered Physical Address"
            value={bizForm.address}
            onChange={(e) => setBizForm({ ...bizForm, address: e.target.value })}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="City"
              value={bizForm.city}
              onChange={(e) => setBizForm({ ...bizForm, city: e.target.value })}
            />
            <Input
              label="State / Province"
              value={bizForm.state}
              onChange={(e) => setBizForm({ ...bizForm, state: e.target.value })}
            />
          </div>

          <div className="pt-4 border-t border-zinc-100 flex items-center justify-end gap-2.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowBizEdit(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={submitting}
            >
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal 2: Add / Edit Branch */}
      <Modal
        isOpen={showBranchModal}
        onClose={() => setShowBranchModal(false)}
        title={editingBranch ? 'Edit Branch' : 'Add Branch'}
        subtitle="Configure location code, address, and geofence tracking radius"
      >
        <form onSubmit={handleSaveBranch} className="space-y-4">
          <Input
            label="Branch Name"
            required
            placeholder="e.g. Noida Tech Campus"
            value={branchForm.name}
            onChange={(e) => setBranchForm({ ...branchForm, name: e.target.value })}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Branch Code"
              required
              placeholder="BR-01"
              value={branchForm.code}
              onChange={(e) => setBranchForm({ ...branchForm, code: e.target.value.toUpperCase() })}
            />
            <Input
              label="Geofence Radius (Meters)"
              type="number"
              value={branchForm.geofence_radius}
              onChange={(e) => setBranchForm({ ...branchForm, geofence_radius: Number(e.target.value) })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="City"
              value={branchForm.city}
              onChange={(e) => setBranchForm({ ...branchForm, city: e.target.value })}
            />
            <Input
              label="State"
              value={branchForm.state}
              onChange={(e) => setBranchForm({ ...branchForm, state: e.target.value })}
            />
          </div>

          <div className="pt-4 border-t border-zinc-100 flex items-center justify-end gap-2.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowBranchModal(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={submitting}
            >
              Save Branch
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal 3: Branch Details Inspector */}
      <Modal
        isOpen={Boolean(selectedBranch)}
        onClose={() => setSelectedBranch(null)}
        title={`Branch Details — ${selectedBranch?.name || ''}`}
      >
        {selectedBranch && (
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200">
                <span className="text-[10px] font-bold text-zinc-500 uppercase">Code</span>
                <p className="font-mono font-bold text-zinc-950 mt-1">{selectedBranch.code}</p>
              </div>
              <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200">
                <span className="text-[10px] font-bold text-zinc-500 uppercase">Geofence Radius</span>
                <p className="font-bold text-zinc-950 mt-1">{selectedBranch.geofence_radius || 200}m</p>
              </div>
              <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200 col-span-2">
                <span className="text-[10px] font-bold text-zinc-500 uppercase">Location Address</span>
                <p className="font-bold text-zinc-950 mt-1">
                  {[selectedBranch.address, selectedBranch.city, selectedBranch.state].filter(Boolean).join(', ') || '-'}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 pt-2 border-t border-zinc-100">
              <Button size="xs" variant="primary" onClick={() => openEditBranch(selectedBranch)}>
                Edit Branch
              </Button>
              <Button size="xs" variant="secondary" onClick={() => handleViewBranchEmployees(selectedBranch)}>
                View Employees
              </Button>
              <Button
                size="xs"
                variant="outline"
                leftIcon={CalendarCheck2}
                onClick={() => navigate(`/attendance?branch=${selectedBranch.id}&branchName=${encodeURIComponent(selectedBranch.name)}`)}
              >
                Branch Attendance
              </Button>
            </div>

            {showBranchEmployees && (
              <div className="pt-3 border-t border-zinc-100">
                <p className="font-bold text-zinc-900 mb-2">Branch Employee List ({branchEmployees.length})</p>
                {branchEmployees.length === 0 ? (
                  <p className="text-zinc-500">No employees assigned to this branch.</p>
                ) : (
                  <div className="max-h-48 overflow-y-auto divide-y divide-zinc-200 border border-zinc-200 rounded-xl">
                    {branchEmployees.map((emp) => (
                      <div key={emp.id} className="p-2.5 flex justify-between items-center text-xs">
                        <span className="font-bold text-zinc-900">{emp.full_name || `${emp.first_name} ${emp.last_name}`}</span>
                        <span className="font-mono text-zinc-500 font-semibold">{emp.employee_code}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Modal 4: Add / Edit Department */}
      <Modal
        isOpen={showDeptModal}
        onClose={() => setShowDeptModal(false)}
        title={editingDept ? 'Edit Department' : 'Add Department'}
      >
        <form onSubmit={handleSaveDept} className="space-y-4">
          <Input
            label="Department Name"
            required
            placeholder="e.g. Engineering & Technology"
            value={deptForm.name}
            onChange={(e) => setDeptForm({ ...deptForm, name: e.target.value })}
          />
          <Input
            label="Department Code"
            required
            placeholder="ENG"
            value={deptForm.code}
            onChange={(e) => setDeptForm({ ...deptForm, code: e.target.value.toUpperCase() })}
          />

          <div className="pt-4 border-t border-zinc-100 flex items-center justify-end gap-2.5">
            <Button variant="outline" size="sm" onClick={() => setShowDeptModal(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" isLoading={submitting}>
              Save Department
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal 5: Department Assigned Users */}
      <Modal
        isOpen={Boolean(deptUsersModal)}
        onClose={() => setDeptUsersModal(null)}
        title={`Assigned Users — ${deptUsersModal?.name || ''}`}
      >
        <div className="text-xs">
          {deptUsers.length === 0 ? (
            <p className="text-zinc-500">No users assigned to this department.</p>
          ) : (
            <div className="max-h-60 overflow-y-auto divide-y divide-zinc-200 border border-zinc-200 rounded-xl">
              {deptUsers.map((u) => (
                <div key={u.id} className="p-3 flex justify-between items-center">
                  <span className="font-bold text-zinc-900">{u.full_name || `${u.first_name} ${u.last_name}`}</span>
                  <span className="text-zinc-500 font-medium">{u.email}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </Modal>

      {/* Modal 6: Add Designation */}
      <Modal
        isOpen={showDesigModal}
        onClose={() => setShowDesigModal(false)}
        title="Add Designation"
      >
        <form onSubmit={handleSaveDesig} className="space-y-4">
          <Input
            label="Designation Name"
            required
            placeholder="e.g. Senior Full-Stack Engineer"
            value={desigForm.name}
            onChange={(e) => setDesigForm({ ...desigForm, name: e.target.value })}
          />
          <Input
            label="Seniority Level (1-10)"
            type="number"
            min={1}
            max={10}
            value={desigForm.level}
            onChange={(e) => setDesigForm({ ...desigForm, level: Number(e.target.value) })}
          />

          <div className="pt-4 border-t border-zinc-100 flex items-center justify-end gap-2.5">
            <Button variant="outline" size="sm" onClick={() => setShowDesigModal(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" isLoading={submitting}>
              Save Designation
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal 7: Configure Working Days */}
      <Modal
        isOpen={showWorkingDaysModal}
        onClose={() => setShowWorkingDaysModal(false)}
        title="Configure Working Days"
      >
        <form onSubmit={handleSaveWorkingDays} className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {ALL_WEEKDAYS.map((day) => {
              const selected = workingDays.includes(day);
              return (
                <button
                  type="button"
                  key={day}
                  onClick={() => toggleDay(day)}
                  className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                    selected
                      ? 'bg-zinc-950 text-white border-zinc-950 shadow-xs'
                      : 'bg-zinc-50 text-zinc-700 border-zinc-200 hover:bg-zinc-100'
                  }`}
                >
                  {day}
                </button>
              );
            })}
          </div>

          <div className="pt-4 border-t border-zinc-100 flex items-center justify-end gap-2.5">
            <Button variant="outline" size="sm" onClick={() => setShowWorkingDaysModal(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" isLoading={submitting}>
              Save Working Days
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal 8: Add Holiday */}
      <Modal
        isOpen={showHolidayModal}
        onClose={() => setShowHolidayModal(false)}
        title="Add Company Holiday"
      >
        <form onSubmit={handleSaveHoliday} className="space-y-4">
          <Input
            label="Holiday Name"
            required
            placeholder="e.g. Republic Day"
            value={holidayForm.name}
            onChange={(e) => setHolidayForm({ ...holidayForm, name: e.target.value })}
          />

          <Input
            label="Holiday Date"
            type="date"
            required
            value={holidayForm.date}
            onChange={(e) => setHolidayForm({ ...holidayForm, date: e.target.value })}
          />

          <Select
            label="Holiday Type"
            value={holidayForm.type}
            onChange={(e) => setHolidayForm({ ...holidayForm, type: e.target.value })}
            options={[
              { value: 'PUBLIC', label: 'Public Holiday' },
              { value: 'OPTIONAL', label: 'Optional Holiday' },
              { value: 'COMPANY', label: 'Company Holiday' },
            ]}
          />

          <div className="pt-4 border-t border-zinc-100 flex items-center justify-end gap-2.5">
            <Button variant="outline" size="sm" onClick={() => setShowHolidayModal(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" isLoading={submitting}>
              Save Holiday
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Organization;
