import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import api from '../api/client';
import { usePermissions } from '../hooks/usePermissions';
import { useNotification } from '../context/NotificationContext';
import {
  Users,
  Search,
  Plus,
  Mail,
  Phone,
  Upload,
  Download,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  User,
  Edit2,
  CheckCircle2,
  XCircle,
  FileSpreadsheet,
  Copy,
  ExternalLink,
  Filter,
  RotateCcw,
  Building2,
  Briefcase,
  MapPin,
  Check,
  Trash2,
} from 'lucide-react';
import { Modal } from '../components/ui/Modal';
import { Badge } from '../components/ui/Badge';
import { Loader } from '../components/ui/Loader';
import { formatDate } from '../utils/formatters';

const INITIAL_FORM = () => ({
  first_name: '',
  last_name: '',
  gender: 'PREFER_NOT_TO_SAY',
  date_of_birth: '',
  email: '',
  phone: '',
  address: '',
  city: '',
  employment_type: 'FULL_TIME',
  salary_type: 'MONTHLY',
  joining_date: new Date().toISOString().split('T')[0],
  branch: '',
  department: '',
  designation: '',
  base_salary: '',
  shift_id: '',
  pan_number: '',
  aadhaar_number: '',
  send_invite: true,
});

export const Employees = () => {
  const { canCreateEmployee, isOwner, isHR } = usePermissions();
  const { toast, confirm } = useNotification();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [employees, setEmployees] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(false);
  const [hasPrev, setHasPrev] = useState(false);

  const [branches, setBranches] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [designations, setDesignations] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters (Image 2)
  const [search, setSearch] = useState('');
  const [branchFilter, setBranchFilter] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [desigFilter, setDesigFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modals & Popups
  const [showModal, setShowModal] = useState(searchParams.get('action') === 'add');
  const [showImportModal, setShowImportModal] = useState(false);
  const [contactModalEmp, setContactModalEmp] = useState(null);
  const [editModalEmp, setEditModalEmp] = useState(null);
  const [activeMenuId, setActiveMenuId] = useState(null);
  const [copiedItem, setCopiedItem] = useState('');

  // Form Submissions
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [editFormData, setEditFormData] = useState({});
  const [importing, setImporting] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importResult, setImportResult] = useState(null);
  const [exporting, setExporting] = useState(false);

  const menuRef = useRef(null);

  // Close "More" dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setActiveMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const res = await api.get('/employees/', {
        params: {
          page,
          search: search || undefined,
          branch: branchFilter || undefined,
          department: deptFilter || undefined,
          designation: desigFilter || undefined,
          status: statusFilter || undefined,
        },
      });
      const list = res.data?.results || res.data?.data || res.data || [];
      setEmployees(Array.isArray(list) ? list : []);
      setTotalCount(res.data?.count ?? (Array.isArray(list) ? list.length : 0));
      setHasNext(!!res.data?.next);
      setHasPrev(!!res.data?.previous);
    } catch (err) {
      console.error('Failed to load employees', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, [page, search, branchFilter, deptFilter, desigFilter, statusFilter]);

  useEffect(() => {
    Promise.allSettled([
      api.get('/branches/'),
      api.get('/branches/departments/'),
      api.get('/branches/designations/'),
      api.get('/shifts/'),
    ]).then(([bRes, dRes, gRes, sRes]) => {
      if (bRes.status === 'fulfilled') setBranches(bRes.value.data?.results || bRes.value.data?.data || []);
      if (dRes.status === 'fulfilled') setDepartments(dRes.value.data?.results || dRes.value.data?.data || []);
      if (gRes.status === 'fulfilled') setDesignations(gRes.value.data?.results || gRes.value.data?.data || []);
      if (sRes.status === 'fulfilled') setShifts(sRes.value.data?.results || sRes.value.data?.data || []);
    });
  }, []);

  const resetFilters = () => {
    setSearch('');
    setBranchFilter('');
    setDeptFilter('');
    setDesigFilter('');
    setStatusFilter('');
    setPage(1);
  };

  const hasActiveFilters = Boolean(search || branchFilter || deptFilter || desigFilter || statusFilter);

  // Copy helper
  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text);
    setCopiedItem(label);
    setTimeout(() => setCopiedItem(''), 2000);
  };

  // Status toggle (Activate / Deactivate)
  const handleToggleStatus = async (emp) => {
    if (!isOwner && !isHR) {
      toast.warning('Only Business Owners and HR Managers can modify employee status.');
      return;
    }
    const isActivating = emp.status !== 'ACTIVE';
    const action = isActivating ? 'activate' : 'deactivate';
    const confirmed = await confirm({
      title: `${isActivating ? 'Activate' : 'Deactivate'} Employee`,
      message: `Are you sure you want to ${isActivating ? 'activate' : 'deactivate'} ${emp.first_name} ${emp.last_name} (${emp.employee_code})?`,
      confirmText: isActivating ? 'Activate Employee' : 'Deactivate Employee',
      type: isActivating ? 'primary' : 'warning',
    });
    if (!confirmed) return;

    try {
      await api.post(`/employees/${emp.id}/${action}/`);
      toast.success(`${emp.first_name} ${emp.last_name} has been ${isActivating ? 'activated' : 'deactivated'}.`);
      fetchEmployees();
    } catch (err) {
      toast.error(err.response?.data?.error?.message || `Failed to ${action} employee.`);
    }
  };

  // Add Employee Submission
  const submitEmployee = async (mode) => {
    if (!formData.first_name.trim() || !formData.email.trim()) {
      toast.warning('First Name and Email are required.');
      return;
    }
    try {
      setSubmitting(true);
      const payload = {
        ...formData,
        status: mode === 'draft' ? 'INACTIVE' : 'ACTIVE',
      };
      if (!payload.branch) delete payload.branch;
      if (!payload.department) delete payload.department;
      if (!payload.designation) delete payload.designation;
      if (!payload.date_of_birth) delete payload.date_of_birth;
      if (!payload.base_salary) delete payload.base_salary;
      if (!payload.shift_id) delete payload.shift_id;

      const res = await api.post('/employees/', payload);
      const created = res.data?.data || res.data;

      if (mode === 'another') {
        setFormData(INITIAL_FORM());
        fetchEmployees();
        toast.success('Employee onboarded! Ready to add another.');
      } else if (mode === 'draft') {
        setShowModal(false);
        setFormData(INITIAL_FORM());
        fetchEmployees();
        toast.info('Employee saved as draft (Inactive).');
      } else {
        setShowModal(false);
        setFormData(INITIAL_FORM());
        toast.success(`Employee ${formData.first_name} onboarded successfully!`);
        if (created?.id) {
          navigate(`/employees/${created.id}`);
        } else {
          fetchEmployees();
        }
      }
    } catch (err) {
      const errData = err.response?.data;
      const msg =
        errData?.error?.message ||
        errData?.detail ||
        (typeof errData === 'object'
          ? Object.entries(errData)
              .map(([k, v]) => `${k}: ${Array.isArray(v) ? v[0] : v}`)
              .join('\n')
          : null) ||
        'Failed to save employee';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  // Quick Edit Modal
  const openEditModal = (emp) => {
    setEditModalEmp(emp);
    setEditFormData({
      first_name: emp.first_name || '',
      last_name: emp.last_name || '',
      email: emp.email || '',
      phone: emp.phone || '',
      branch: emp.branch || '',
      department: emp.department || '',
      designation: emp.designation || '',
      status: emp.status || 'ACTIVE',
      joining_date: emp.joining_date || '',
    });
    setActiveMenuId(null);
  };

  const handleUpdateEmployee = async (e) => {
    e.preventDefault();
    if (!editModalEmp) return;
    try {
      setSubmitting(true);
      const payload = { ...editFormData };
      if (!payload.branch) delete payload.branch;
      if (!payload.department) delete payload.department;
      if (!payload.designation) delete payload.designation;

      await api.patch(`/employees/${editModalEmp.id}/`, payload);
      setEditModalEmp(null);
      fetchEmployees();
      toast.success('Employee updated successfully!');
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Failed to update employee');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteEmployee = async (emp) => {
    if (!emp) return;
    const empName = `${emp.first_name || ''} ${emp.last_name || ''}`.trim() || 'this employee';
    const confirmed = await confirm({
      title: 'Remove Employee',
      message: `Are you sure you want to permanently remove ${empName} from the company? This action cannot be undone and will delete all associated profile data.`,
      confirmText: 'Remove Employee',
      cancelText: 'Cancel',
      type: 'danger',
    });
    if (!confirmed) return;

    try {
      await api.delete(`/employees/${emp.id}/`);
      toast.success(`Employee ${empName} has been removed successfully.`);
      fetchEmployees();
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Failed to remove employee');
    }
  };

  // Export Excel (.xlsx) from backend respecting active filters
  const handleExportExcel = async () => {
    try {
      setExporting(true);
      const res = await api.get('/employees/export-excel/', {
        params: {
          search: search || undefined,
          branch: branchFilter || undefined,
          department: deptFilter || undefined,
          designation: desigFilter || undefined,
          status: statusFilter || undefined,
        },
        responseType: 'blob',
      });
      const blob = new Blob([res.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `employees_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to export Excel, falling back to CSV', err);
      handleExportCsv();
    } finally {
      setExporting(false);
    }
  };

  // Fallback CSV Export
  const handleExportCsv = () => {
    const headers = ['Employee ID', 'First Name', 'Last Name', 'Email', 'Phone', 'Branch', 'Department', 'Joining Date', 'Status'];
    const rows = employees.map((e) => [
      e.employee_code || '',
      e.first_name || '',
      e.last_name || '',
      e.email || '',
      e.phone || '',
      e.branch_name || '',
      e.department_name || '',
      e.joining_date || '',
      e.status || '',
    ]);
    const csv = [headers, ...rows].map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `employees_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Download Sample Excel Template
  const handleDownloadTemplate = async () => {
    try {
      const res = await api.get('/employees/sample-template/', { responseType: 'blob' });
      const blob = new Blob([res.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'workpulse_employee_template.xlsx';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert('Failed to download template. Please try again.');
    }
  };

  // Import Excel / CSV Handler
  const handleImportSubmit = async (e) => {
    e.preventDefault();
    if (!importFile) {
      alert('Please select an Excel (.xlsx/.xls) or CSV file.');
      return;
    }
    try {
      setImporting(true);
      setImportResult(null);
      const form = new FormData();
      form.append('file', importFile);

      const res = await api.post('/employees/import-excel/', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const resData = res.data?.data || res.data;
      setImportResult(resData);
      fetchEmployees();
    } catch (err) {
      const msg = err.response?.data?.error?.message || err.message || 'Import failed.';
      alert(msg);
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-700 bg-zinc-100 px-2 py-0.5 rounded border border-zinc-200">
              Employee Directory
            </span>
          </div>
          <h2 className="text-xl font-bold text-zinc-950 tracking-tight flex items-center gap-2 mt-1">
            <Users className="w-5 h-5 text-zinc-900" />
            <span>Employees ({totalCount})</span>
          </h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            Search, filter, view contact details, import/export, and manage organizational directory
          </p>
        </div>

        {/* Top Actions: Import Excel, Export Excel, Add Employee */}
        <div className="flex flex-wrap items-center gap-2">
          {canCreateEmployee && (
            <button
              type="button"
              onClick={() => {
                setImportFile(null);
                setImportResult(null);
                setShowImportModal(true);
              }}
              className="flex items-center gap-1.5 px-3 py-2 bg-white border border-zinc-300 hover:bg-zinc-50 text-zinc-800 rounded-lg text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
              title="Import employees from Excel (.xlsx) or CSV"
            >
              <Upload className="w-3.5 h-3.5 text-zinc-700" />
              <span>Import Excel</span>
            </button>
          )}

          <button
            type="button"
            disabled={exporting}
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-3 py-2 bg-white border border-zinc-300 hover:bg-zinc-50 text-zinc-800 rounded-lg text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
            title="Export full filtered directory to formatted Excel spreadsheet"
          >
            <Download className="w-3.5 h-3.5 text-zinc-700" />
            <span>{exporting ? 'Exporting...' : 'Export Excel'}</span>
          </button>

          {canCreateEmployee && (
            <button
              type="button"
              onClick={() => setShowModal(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-zinc-950 hover:bg-black text-white rounded-lg text-xs font-bold shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Employee</span>
            </button>
          )}
        </div>
      </div>

      {/* Search & 4 Core Filters (Image 2) */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* 1. Search Employee */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
            <input
              type="text"
              placeholder="Search employee, ID, phone..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-600 outline-none"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            )}
          </div>

          {/* 2. Filter by Branch */}
          <select
            value={branchFilter}
            onChange={(e) => {
              setBranchFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white outline-none focus:ring-2 focus:ring-indigo-600"
          >
            <option value="">Filter by Branch (All)</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>

          {/* 3. Filter by Department */}
          <select
            value={deptFilter}
            onChange={(e) => {
              setDeptFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white outline-none focus:ring-2 focus:ring-indigo-600"
          >
            <option value="">Filter by Department (All)</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>

          {/* 4. Filter by Designation */}
          <select
            value={desigFilter}
            onChange={(e) => {
              setDesigFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white outline-none focus:ring-2 focus:ring-indigo-600"
          >
            <option value="">Filter by Designation (All)</option>
            {designations.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>

          {/* 5. Filter by Status */}
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white outline-none focus:ring-2 focus:ring-indigo-600"
          >
            <option value="">Filter by Status (All)</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive / Draft</option>
            <option value="ON_NOTICE">On Notice</option>
            <option value="TERMINATED">Terminated</option>
          </select>
        </div>

        {/* Active Filter Indicators */}
        {hasActiveFilters && (
          <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-slate-500 text-[11px] font-semibold flex items-center gap-1">
                <Filter className="w-3 h-3 text-indigo-600" />
                Active Filters:
              </span>
              {search && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-700">
                  Search: "{search}"
                  <button onClick={() => setSearch('')} className="hover:text-red-500 font-bold ml-0.5">×</button>
                </span>
              )}
              {branchFilter && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-indigo-50 text-indigo-700">
                  Branch: {branches.find((b) => b.id === branchFilter)?.name || 'Selected'}
                  <button onClick={() => setBranchFilter('')} className="hover:text-red-500 font-bold ml-0.5">×</button>
                </span>
              )}
              {deptFilter && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-blue-50 text-blue-700">
                  Department: {departments.find((d) => d.id === deptFilter)?.name || 'Selected'}
                  <button onClick={() => setDeptFilter('')} className="hover:text-red-500 font-bold ml-0.5">×</button>
                </span>
              )}
              {desigFilter && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-purple-50 text-purple-700">
                  Designation: {designations.find((g) => g.id === desigFilter)?.name || 'Selected'}
                  <button onClick={() => setDesigFilter('')} className="hover:text-red-500 font-bold ml-0.5">×</button>
                </span>
              )}
              {statusFilter && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700">
                  Status: {statusFilter}
                  <button onClick={() => setStatusFilter('')} className="hover:text-red-500 font-bold ml-0.5">×</button>
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={resetFilters}
              className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" />
              Reset Filters
            </button>
          </div>
        )}
      </div>

      {/* Employee Table (Image 3) */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <Loader message="Loading workforce directory..." />
        ) : employees.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-xs space-y-2">
            <Users className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="font-semibold text-slate-700">No employees found matching your filter criteria.</p>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={resetFilters}
                className="text-indigo-600 hover:underline font-semibold text-xs"
              >
                Clear all filters to see everyone
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/75 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[11px] tracking-wider">
                  <th className="py-3 px-4">Employee ID</th>
                  <th className="py-3 px-4">Name</th>
                  <th className="py-3 px-4">Branch</th>
                  <th className="py-3 px-4">Department</th>
                  <th className="py-3 px-4">Phone</th>
                  <th className="py-3 px-4">Joining Date</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {employees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-slate-50/60 transition-colors">
                    {/* 1. Employee ID: Click to open profile */}
                    <td className="py-3 px-4">
                      <Link
                        to={`/employees/${emp.id}`}
                        className="font-mono text-indigo-600 hover:text-indigo-800 hover:underline font-bold text-xs"
                        title="Click to open employee profile"
                      >
                        {emp.employee_code || '-'}
                      </Link>
                    </td>

                    {/* 2. Name: Click to open profile */}
                    <td className="py-3 px-4">
                      <Link
                        to={`/employees/${emp.id}`}
                        className="flex items-center gap-2.5 group"
                        title="Click to open employee profile"
                      >
                        <div className="w-8 h-8 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 flex items-center justify-center font-bold text-xs uppercase flex-shrink-0 group-hover:bg-indigo-100 transition-colors">
                          {emp.first_name?.[0] || 'E'}
                          {emp.last_name?.[0] || ''}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900 group-hover:text-indigo-600 leading-tight">
                            {emp.first_name} {emp.last_name}
                          </p>
                          <p className="text-[11px] text-slate-500">{emp.designation_name || 'Staff'}</p>
                        </div>
                      </Link>
                    </td>

                    {/* 3. Branch: Click to filter by branch */}
                    <td className="py-3 px-4">
                      <button
                        type="button"
                        onClick={() => {
                          if (emp.branch) {
                            setBranchFilter(emp.branch);
                            setPage(1);
                          } else {
                            const found = branches.find((b) => b.name === emp.branch_name);
                            if (found) {
                              setBranchFilter(found.id);
                              setPage(1);
                            }
                          }
                        }}
                        className="text-slate-700 hover:text-indigo-600 font-medium text-left inline-flex items-center gap-1 group"
                        title="Click to filter directory by this branch"
                      >
                        <span>{emp.branch_name || 'Corporate Campus (HQ)'}</span>
                        <Filter className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 text-indigo-500 transition-opacity" />
                      </button>
                    </td>

                    {/* 4. Department: Click to filter */}
                    <td className="py-3 px-4">
                      <button
                        type="button"
                        onClick={() => {
                          if (emp.department) {
                            setDeptFilter(emp.department);
                            setPage(1);
                          } else {
                            const found = departments.find((d) => d.name === emp.department_name);
                            if (found) {
                              setDeptFilter(found.id);
                              setPage(1);
                            }
                          }
                        }}
                        className="text-slate-600 hover:text-indigo-600 text-left inline-flex items-center gap-1 group"
                        title="Click to filter directory by this department"
                      >
                        <span>{emp.department_name || 'General Operations'}</span>
                        <Filter className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 text-indigo-500 transition-opacity" />
                      </button>
                    </td>

                    {/* 5. Phone: View contact */}
                    <td className="py-3 px-4">
                      <button
                        type="button"
                        onClick={() => setContactModalEmp(emp)}
                        className="text-left group flex items-center gap-1.5 hover:text-indigo-600"
                        title="Click to view contact card"
                      >
                        <div className="w-6 h-6 rounded bg-slate-100 group-hover:bg-indigo-50 flex items-center justify-center text-slate-500 group-hover:text-indigo-600">
                          <Phone className="w-3 h-3" />
                        </div>
                        <div>
                          <p className="font-semibold text-slate-800 group-hover:text-indigo-600 leading-none">
                            {emp.phone || 'No Phone'}
                          </p>
                          <p className="text-[10px] text-slate-400 group-hover:text-slate-500 mt-0.5">
                            View Contact
                          </p>
                        </div>
                      </button>
                    </td>

                    {/* 6. Joining Date: View details */}
                    <td className="py-3 px-4 text-slate-600">
                      <Link
                        to={`/employees/${emp.id}`}
                        className="hover:text-indigo-600 hover:underline font-medium"
                        title="Click to view employment details"
                      >
                        {formatDate(emp.joining_date)}
                      </Link>
                    </td>

                    {/* 7. Status: Active on Punch In, Inactive on Punch Out */}
                    <td className="py-3 px-4">
                      {(() => {
                        const isLiveActive = emp.duty_status ? emp.duty_status === 'ACTIVE' : emp.status === 'ACTIVE';
                        return (
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(emp)}
                            className="group inline-flex items-center gap-1.5 cursor-pointer text-left"
                            title={`Attendance Duty Status: ${isLiveActive ? 'ACTIVE (Clocked In)' : 'INACTIVE (Punched Out / Offline)'} — Click to toggle`}
                          >
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wide border transition-all ${
                                isLiveActive
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 group-hover:bg-emerald-100'
                                  : 'bg-slate-100 text-slate-600 border-slate-200 group-hover:bg-slate-200'
                              }`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  isLiveActive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
                                }`}
                              />
                              <span>{isLiveActive ? 'ACTIVE' : 'INACTIVE'}</span>
                            </span>
                          </button>
                        );
                      })()}
                    </td>

                    {/* 8. Actions: View / Edit / More */}
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5">
                        {/* View Action */}
                        <Link
                          to={`/employees/${emp.id}`}
                          className="px-2.5 py-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 rounded transition-colors"
                          title="View Employee Profile"
                        >
                          View
                        </Link>

                        {/* Edit Action */}
                        <button
                          type="button"
                          onClick={() => openEditModal(emp)}
                          className="px-2.5 py-1 text-xs font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors"
                          title="Edit Employee Information"
                        >
                          Edit
                        </button>

                        {/* More Menu Dropdown */}
                        <div className="relative inline-block text-left" ref={activeMenuId === emp.id ? menuRef : null}>
                          <button
                            type="button"
                            onClick={() => setActiveMenuId(activeMenuId === emp.id ? null : emp.id)}
                            className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded"
                            title="More actions"
                          >
                            <MoreHorizontal className="w-4 h-4" />
                          </button>

                          {activeMenuId === emp.id && (
                            <div className="absolute right-0 mt-1 w-48 bg-white border border-slate-200 rounded-lg shadow-lg z-30 py-1 text-xs">
                              <Link
                                to={`/employees/${emp.id}`}
                                className="flex items-center gap-2 px-3 py-1.5 text-slate-700 hover:bg-slate-50"
                                onClick={() => setActiveMenuId(null)}
                              >
                                <User className="w-3.5 h-3.5 text-slate-400" />
                                <span>View Full Profile</span>
                              </Link>

                              <button
                                type="button"
                                onClick={() => openEditModal(emp)}
                                className="w-full text-left flex items-center gap-2 px-3 py-1.5 text-slate-700 hover:bg-slate-50"
                              >
                                <Edit2 className="w-3.5 h-3.5 text-slate-400" />
                                <span>Edit Employee</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  setContactModalEmp(emp);
                                  setActiveMenuId(null);
                                }}
                                className="w-full text-left flex items-center gap-2 px-3 py-1.5 text-slate-700 hover:bg-slate-50"
                              >
                                <Phone className="w-3.5 h-3.5 text-slate-400" />
                                <span>View Contact Info</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  copyToClipboard(emp.employee_code || '', emp.id);
                                  setActiveMenuId(null);
                                }}
                                className="w-full text-left flex items-center gap-2 px-3 py-1.5 text-slate-700 hover:bg-slate-50"
                              >
                                <Copy className="w-3.5 h-3.5 text-slate-400" />
                                <span>{copiedItem === emp.id ? 'Copied!' : 'Copy Employee ID'}</span>
                              </button>

                              <div className="border-t border-slate-100 my-1"></div>

                              <button
                                type="button"
                                onClick={() => {
                                  setActiveMenuId(null);
                                  handleToggleStatus(emp);
                                }}
                                className="w-full text-left flex items-center gap-2 px-3 py-1.5 text-amber-600 hover:bg-amber-50"
                              >
                                {emp.status === 'ACTIVE' ? (
                                  <>
                                    <XCircle className="w-3.5 h-3.5" />
                                    <span>Deactivate Employee</span>
                                  </>
                                ) : (
                                  <>
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    <span>Activate Employee</span>
                                  </>
                                )}
                              </button>

                              {isOwner && (
                                <>
                                  <div className="border-t border-slate-100 my-1"></div>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActiveMenuId(null);
                                      handleDeleteEmployee(emp);
                                    }}
                                    className="w-full text-left flex items-center gap-2 px-3 py-1.5 text-rose-600 hover:bg-rose-50 font-semibold"
                                  >
                                    <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                                    <span>Remove Employee</span>
                                  </button>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* 10. Pagination (Image 2) */}
        <div className="px-4 py-3 border-t border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
          <div className="flex items-center gap-2">
            <span>
              Showing Page <strong className="text-slate-900">{page}</strong> of{' '}
              <strong className="text-slate-900">{Math.max(1, Math.ceil(totalCount / 20))}</strong>
            </span>
            <span className="text-slate-300">•</span>
            <span>Total <strong>{totalCount}</strong> registered employees</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={!hasPrev || page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="flex items-center gap-1 px-3 py-1.5 border border-slate-300 rounded-lg bg-white hover:bg-slate-50 disabled:opacity-40 font-semibold text-slate-700"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Previous</span>
            </button>
            <span className="px-2 py-1 font-bold text-indigo-600 bg-indigo-50 border border-indigo-200 rounded-lg">
              {page}
            </span>
            <button
              type="button"
              disabled={!hasNext}
              onClick={() => setPage((p) => p + 1)}
              className="flex items-center gap-1 px-3 py-1.5 border border-slate-300 rounded-lg bg-white hover:bg-slate-50 disabled:opacity-40 font-semibold text-slate-700"
            >
              <span>Next</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* MODAL 1: View Contact Modal (Phone column action) */}
      <Modal
        isOpen={Boolean(contactModalEmp)}
        onClose={() => setContactModalEmp(null)}
        title="Employee Contact Details"
      >
        {contactModalEmp && (
          <div className="space-y-4 text-xs">
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
              <div className="w-12 h-12 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-base uppercase">
                {contactModalEmp.first_name?.[0] || 'E'}
                {contactModalEmp.last_name?.[0] || ''}
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900">
                  {contactModalEmp.first_name} {contactModalEmp.last_name}
                </p>
                <p className="text-xs text-indigo-600 font-semibold">{contactModalEmp.designation_name || 'Staff'}</p>
                <p className="text-[11px] text-slate-400 font-mono">{contactModalEmp.employee_code}</p>
              </div>
            </div>

            <div className="space-y-2.5">
              {/* Direct Phone */}
              <div className="flex items-center justify-between p-2.5 border border-slate-200 rounded-lg bg-white">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <Phone className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase font-semibold">Phone Number</p>
                    <a
                      href={`tel:${contactModalEmp.phone}`}
                      className="font-semibold text-slate-800 hover:text-indigo-600"
                    >
                      {contactModalEmp.phone || 'Not Provided'}
                    </a>
                  </div>
                </div>
                {contactModalEmp.phone && (
                  <button
                    type="button"
                    onClick={() => copyToClipboard(contactModalEmp.phone, 'phone')}
                    className="flex items-center gap-1 px-2 py-1 text-[11px] text-indigo-600 hover:bg-indigo-50 rounded font-semibold"
                  >
                    {copiedItem === 'phone' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedItem === 'phone' ? 'Copied' : 'Copy'}</span>
                  </button>
                )}
              </div>

              {/* Email */}
              <div className="flex items-center justify-between p-2.5 border border-slate-200 rounded-lg bg-white">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded bg-blue-50 text-blue-600 flex items-center justify-center">
                    <Mail className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase font-semibold">Work Email</p>
                    <a
                      href={`mailto:${contactModalEmp.email}`}
                      className="font-semibold text-slate-800 hover:text-indigo-600"
                    >
                      {contactModalEmp.email || 'Not Provided'}
                    </a>
                  </div>
                </div>
                {contactModalEmp.email && (
                  <button
                    type="button"
                    onClick={() => copyToClipboard(contactModalEmp.email, 'email')}
                    className="flex items-center gap-1 px-2 py-1 text-[11px] text-indigo-600 hover:bg-indigo-50 rounded font-semibold"
                  >
                    {copiedItem === 'email' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedItem === 'email' ? 'Copied' : 'Copy'}</span>
                  </button>
                )}
              </div>

              {/* Organization Branch & Department */}
              <div className="grid grid-cols-2 gap-2">
                <div className="p-2.5 border border-slate-200 rounded-lg">
                  <p className="text-[10px] text-slate-400 uppercase font-semibold flex items-center gap-1">
                    <Building2 className="w-3 h-3" />
                    Branch
                  </p>
                  <p className="font-semibold text-slate-800 mt-0.5">{contactModalEmp.branch_name || 'Main Office'}</p>
                </div>
                <div className="p-2.5 border border-slate-200 rounded-lg">
                  <p className="text-[10px] text-slate-400 uppercase font-semibold flex items-center gap-1">
                    <Briefcase className="w-3 h-3" />
                    Department
                  </p>
                  <p className="font-semibold text-slate-800 mt-0.5">{contactModalEmp.department_name || 'General'}</p>
                </div>
              </div>

              {/* Address / Location if present */}
              {(contactModalEmp.address || contactModalEmp.city) && (
                <div className="p-2.5 border border-slate-200 rounded-lg">
                  <p className="text-[10px] text-slate-400 uppercase font-semibold flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    Address
                  </p>
                  <p className="text-slate-700 mt-0.5">
                    {[contactModalEmp.address, contactModalEmp.city].filter(Boolean).join(', ')}
                  </p>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
              <Link
                to={`/employees/${contactModalEmp.id}`}
                className="text-xs font-semibold text-indigo-600 hover:underline flex items-center gap-1"
              >
                <span>View Full Profile</span>
                <ExternalLink className="w-3 h-3" />
              </Link>
              <button
                type="button"
                onClick={() => setContactModalEmp(null)}
                className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* MODAL 2: Quick Edit Employee Modal (Actions column Edit) */}
      <Modal
        isOpen={Boolean(editModalEmp)}
        onClose={() => setEditModalEmp(null)}
        title={`Edit Employee — ${editModalEmp?.first_name || ''} ${editModalEmp?.last_name || ''}`}
      >
        <form onSubmit={handleUpdateEmployee} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">First Name *</label>
              <input
                type="text"
                required
                value={editFormData.first_name || ''}
                onChange={(e) => setEditFormData({ ...editFormData, first_name: e.target.value })}
                className="w-full px-3 py-1.5 border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">Last Name</label>
              <input
                type="text"
                value={editFormData.last_name || ''}
                onChange={(e) => setEditFormData({ ...editFormData, last_name: e.target.value })}
                className="w-full px-3 py-1.5 border border-slate-300 rounded-lg"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">Work Email</label>
              <input
                type="email"
                value={editFormData.email || ''}
                onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                className="w-full px-3 py-1.5 border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">Phone Number</label>
              <input
                type="tel"
                value={editFormData.phone || ''}
                onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                className="w-full px-3 py-1.5 border border-slate-300 rounded-lg"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2.5">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">Branch</label>
              <select
                value={editFormData.branch || ''}
                onChange={(e) => setEditFormData({ ...editFormData, branch: e.target.value })}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white"
              >
                <option value="">Default Branch</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">Department</label>
              <select
                value={editFormData.department || ''}
                onChange={(e) => setEditFormData({ ...editFormData, department: e.target.value })}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white"
              >
                <option value="">Select Dept</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">Designation</label>
              <select
                value={editFormData.designation || ''}
                onChange={(e) => setEditFormData({ ...editFormData, designation: e.target.value })}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white"
              >
                <option value="">Select Desig</option>
                {designations.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">Status</label>
              <select
                value={editFormData.status || 'ACTIVE'}
                onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value })}
                className="w-full px-3 py-1.5 border border-slate-300 rounded-lg bg-white"
              >
                <option value="ACTIVE">ACTIVE</option>
                <option value="INACTIVE">INACTIVE</option>
                <option value="ON_NOTICE">ON_NOTICE</option>
                <option value="TERMINATED">TERMINATED</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">Joining Date</label>
              <input
                type="date"
                value={editFormData.joining_date || ''}
                onChange={(e) => setEditFormData({ ...editFormData, joining_date: e.target.value })}
                className="w-full px-3 py-1.5 border border-slate-300 rounded-lg"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-slate-200 flex items-center justify-between gap-2">
            {isOwner && (
              <button
                type="button"
                onClick={() => {
                  const emp = editModalEmp;
                  setEditModalEmp(null);
                  handleDeleteEmployee(emp);
                }}
                className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors"
                title="Permanently remove employee"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Remove Employee</span>
              </button>
            )}
            <div className="flex items-center gap-2 ml-auto">
              <button
                type="button"
                onClick={() => setEditModalEmp(null)}
                className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold"
              >
                {submitting ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </form>
      </Modal>

      {/* MODAL 3: Import Excel / CSV Modal (Image 2) */}
      <Modal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        title="Import Employees from Excel / CSV"
      >
        <form onSubmit={handleImportSubmit} className="space-y-4 text-xs">
          <div className="p-3 bg-indigo-50/75 rounded-xl border border-indigo-100 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-indigo-900 flex items-center gap-1.5">
                <FileSpreadsheet className="w-4 h-4 text-indigo-600" />
                Excel Batch Onboarding Template
              </span>
              <button
                type="button"
                onClick={handleDownloadTemplate}
                className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 underline flex items-center gap-1"
              >
                <Download className="w-3 h-3" />
                Download Sample Template (.xlsx)
              </button>
            </div>
            <p className="text-[11px] text-indigo-700 leading-relaxed">
              Upload an Excel (.xlsx/.xls) or CSV sheet. Standard columns: <strong>First Name, Last Name, Email, Phone, Branch, Department, Designation, Joining Date, Base Salary</strong>.
            </p>
          </div>

          <div className="border-2 border-dashed border-slate-300 hover:border-indigo-500 rounded-xl p-6 text-center transition-colors bg-slate-50/50">
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={(e) => setImportFile(e.target.files?.[0] || null)}
              className="hidden"
              id="excel-file-input"
            />
            <label htmlFor="excel-file-input" className="cursor-pointer space-y-2 block">
              <Upload className="w-8 h-8 text-slate-400 mx-auto" />
              <p className="font-semibold text-slate-700">
                {importFile ? importFile.name : 'Click or drag Excel/CSV file here'}
              </p>
              <p className="text-[11px] text-slate-400">Supports .xlsx, .xls, and .csv files</p>
            </label>
          </div>

          {importResult && (
            <div className="p-3 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-800 text-xs space-y-1">
              <p className="font-bold flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                {importResult.message}
              </p>
              {importResult.errors?.length > 0 && (
                <div className="mt-2 text-[11px] text-rose-700 bg-rose-50 p-2 rounded border border-rose-200 max-h-28 overflow-y-auto">
                  <p className="font-semibold mb-1">Warnings / Skipped rows:</p>
                  <ul className="list-disc pl-4 space-y-0.5">
                    {importResult.errors.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowImportModal(false)}
              className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg font-semibold"
            >
              {importResult ? 'Close' : 'Cancel'}
            </button>
            <button
              type="submit"
              disabled={importing || !importFile}
              className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg font-semibold flex items-center gap-1.5"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>{importing ? 'Processing File...' : 'Upload & Import Employees'}</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL 4: Add Employee Modal (9 Sections & 4 Action Buttons) */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Onboard New Employee">
        <div className="space-y-4 max-h-[75vh] overflow-y-auto pr-1 text-xs">
          {/* 1. Personal Information */}
          <div>
            <p className="text-[10px] font-bold text-indigo-600 uppercase mb-2">1. Personal Information</p>
            <div className="grid grid-cols-2 gap-2.5">
              <input
                type="text"
                placeholder="First Name *"
                required
                value={formData.first_name}
                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                className="px-3 py-1.5 border border-slate-300 rounded-lg"
              />
              <input
                type="text"
                placeholder="Last Name"
                value={formData.last_name}
                onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                className="px-3 py-1.5 border border-slate-300 rounded-lg"
              />
              <select
                value={formData.gender}
                onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                className="px-3 py-1.5 border border-slate-300 rounded-lg bg-white"
              >
                <option value="PREFER_NOT_TO_SAY">Gender (Optional)</option>
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
                <option value="OTHER">Other</option>
              </select>
              <input
                type="date"
                title="Date of Birth"
                value={formData.date_of_birth}
                onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                className="px-3 py-1.5 border border-slate-300 rounded-lg"
              />
            </div>
          </div>

          {/* 2. Contact Information */}
          <div>
            <p className="text-[10px] font-bold text-indigo-600 uppercase mb-2">2. Contact Information</p>
            <div className="grid grid-cols-2 gap-2.5">
              <input
                type="email"
                placeholder="Email Address *"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="px-3 py-1.5 border border-slate-300 rounded-lg"
              />
              <input
                type="tel"
                placeholder="Phone Number"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="px-3 py-1.5 border border-slate-300 rounded-lg"
              />
              <input
                type="text"
                placeholder="City"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                className="px-3 py-1.5 border border-slate-300 rounded-lg"
              />
              <input
                type="text"
                placeholder="Address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="px-3 py-1.5 border border-slate-300 rounded-lg"
              />
            </div>
          </div>

          {/* 3. Employment Information */}
          <div>
            <p className="text-[10px] font-bold text-indigo-600 uppercase mb-2">3. Employment Information</p>
            <div className="grid grid-cols-3 gap-2">
              <select
                value={formData.employment_type}
                onChange={(e) => setFormData({ ...formData, employment_type: e.target.value })}
                className="px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white"
              >
                <option value="FULL_TIME">Full Time</option>
                <option value="PART_TIME">Part Time</option>
                <option value="CONTRACT">Contract</option>
                <option value="INTERN">Intern</option>
              </select>
              <select
                value={formData.salary_type}
                onChange={(e) => setFormData({ ...formData, salary_type: e.target.value })}
                className="px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white"
              >
                <option value="MONTHLY">Monthly</option>
                <option value="DAILY">Daily</option>
                <option value="HOURLY">Hourly</option>
              </select>
              <input
                type="date"
                required
                value={formData.joining_date}
                onChange={(e) => setFormData({ ...formData, joining_date: e.target.value })}
                className="px-2.5 py-1.5 border border-slate-300 rounded-lg"
              />
            </div>
          </div>

          {/* 4 & 5. Branch, Department & Designation */}
          <div>
            <p className="text-[10px] font-bold text-indigo-600 uppercase mb-2">
              4 &amp; 5. Branch, Department &amp; Designation
            </p>
            <div className="grid grid-cols-3 gap-2">
              <select
                value={formData.branch}
                onChange={(e) => setFormData({ ...formData, branch: e.target.value })}
                className="px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white"
              >
                <option value="">Default Branch</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
              <select
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                className="px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white"
              >
                <option value="">Department</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
              <select
                value={formData.designation}
                onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                className="px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white"
              >
                <option value="">Designation</option>
                {designations.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 6 & 7. Salary Configuration & Shift Assignment */}
          <div>
            <p className="text-[10px] font-bold text-indigo-600 uppercase mb-2">
              6 &amp; 7. Salary Configuration &amp; Shift
            </p>
            <div className="grid grid-cols-2 gap-2.5">
              <input
                type="number"
                placeholder="Base Monthly Salary (₹)"
                value={formData.base_salary}
                onChange={(e) => setFormData({ ...formData, base_salary: e.target.value })}
                className="px-3 py-1.5 border border-slate-300 rounded-lg"
              />
              <select
                value={formData.shift_id}
                onChange={(e) => setFormData({ ...formData, shift_id: e.target.value })}
                className="px-3 py-1.5 border border-slate-300 rounded-lg bg-white"
              >
                <option value="">Assign Shift (Optional)</option>
                {shifts.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 8. Documents */}
          <div>
            <p className="text-[10px] font-bold text-indigo-600 uppercase mb-2">8. Documents</p>
            <div className="grid grid-cols-2 gap-2.5">
              <input
                type="text"
                placeholder="PAN Number"
                value={formData.pan_number}
                onChange={(e) => setFormData({ ...formData, pan_number: e.target.value })}
                className="px-3 py-1.5 border border-slate-300 rounded-lg uppercase"
              />
              <input
                type="text"
                placeholder="Aadhaar Number"
                value={formData.aadhaar_number}
                onChange={(e) => setFormData({ ...formData, aadhaar_number: e.target.value })}
                className="px-3 py-1.5 border border-slate-300 rounded-lg"
              />
            </div>
          </div>

          {/* 9. Login Invitation */}
          <label className="flex items-center gap-2 p-2.5 bg-slate-50 rounded-lg cursor-pointer">
            <input
              type="checkbox"
              checked={formData.send_invite}
              onChange={(e) => setFormData({ ...formData, send_invite: e.target.checked })}
              className="rounded text-indigo-600"
            />
            <span className="font-semibold text-slate-700">
              9. Send Login Invitation &amp; Provision Employee Account
            </span>
          </label>

          {/* 4 Action Buttons */}
          <div className="pt-3 border-t border-slate-200 flex flex-wrap items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={submitting}
              onClick={() => submitEmployee('draft')}
              className="px-3 py-1.5 text-xs font-semibold border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-lg"
            >
              Save as Draft
            </button>
            <button
              type="button"
              disabled={submitting}
              onClick={() => submitEmployee('another')}
              className="px-3 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg"
            >
              Save &amp; Add Another
            </button>
            <button
              type="button"
              disabled={submitting}
              onClick={() => submitEmployee('save')}
              className="px-4 py-1.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg"
            >
              {submitting ? 'Saving...' : 'Save Employee'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
