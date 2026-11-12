import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import api from '../api/client';
import { usePermissions } from '../hooks/usePermissions';
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
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

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

  // Filters
  const [search, setSearch] = useState('');
  const [branchFilter, setBranchFilter] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [desigFilter, setDesigFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Create Modal
  const [showModal, setShowModal] = useState(searchParams.get('action') === 'add');
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState(INITIAL_FORM);

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

  const submitEmployee = async (mode) => {
    if (!formData.first_name.trim() || !formData.email.trim()) {
      alert('First Name and Email are required.');
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
        alert('Employee saved! Ready to add another.');
      } else if (mode === 'draft') {
        setShowModal(false);
        setFormData(INITIAL_FORM());
        fetchEmployees();
        alert('Employee saved as draft (Inactive).');
      } else {
        setShowModal(false);
        setFormData(INITIAL_FORM());
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
        (typeof errData === 'object' ? Object.entries(errData).map(([k, v]) => `${k}: ${Array.isArray(v) ? v[0] : v}`).join('\n') : null) ||
        'Failed to save employee';
      alert(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (emp) => {
    if (!isOwner && !isHR) return;
    const action = emp.status === 'ACTIVE' ? 'deactivate' : 'activate';
    if (!confirm(`${action === 'deactivate' ? 'Deactivate' : 'Activate'} ${emp.first_name} ${emp.last_name}?`)) return;
    try {
      await api.post(`/employees/${emp.id}/${action}/`);
      fetchEmployees();
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Status update failed');
    }
  };

  const handleExportCsv = () => {
    const headers = ['Employee Code', 'First Name', 'Last Name', 'Email', 'Phone', 'Branch', 'Department', 'Joining Date', 'Status'];
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

  const handleImportCsv = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const lines = text.split(/\r?\n/).filter((l) => l.trim());
    if (lines.length < 2) {
      alert('CSV file must include a header row and at least one employee row.');
      return;
    }
    let imported = 0;
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',').map((c) => c.replace(/^"|"$/g, '').trim());
      if (cols[0] && cols[2]) {
        try {
          await api.post('/employees/', {
            first_name: cols[0],
            last_name: cols[1] || '',
            email: cols[2],
            phone: cols[3] || '',
            joining_date: cols[4] || new Date().toISOString().split('T')[0],
          });
          imported++;
        } catch {
          // continue importing remaining rows
        }
      }
    }
    e.target.value = '';
    alert(`Imported ${imported} employee(s) successfully.`);
    fetchEmployees();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-600" />
            <span>Employees ({totalCount})</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Search, filter, import/export, and manage employee profiles
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {canCreateEmployee && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleImportCsv}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold"
                title="CSV format: First Name, Last Name, Email, Phone, Joining Date"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Import Excel/CSV</span>
              </button>
            </>
          )}
          <button
            type="button"
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Excel/CSV</span>
          </button>
          {canCreateEmployee && (
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Add Employee</span>
            </button>
          )}
        </div>
      </div>

      {/* Search & Filters */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search name, email, code..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-600 outline-none"
          />
        </div>

        <select
          value={branchFilter}
          onChange={(e) => { setBranchFilter(e.target.value); setPage(1); }}
          className="px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
        >
          <option value="">All Branches</option>
          {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>

        <select
          value={deptFilter}
          onChange={(e) => { setDeptFilter(e.target.value); setPage(1); }}
          className="px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
        >
          <option value="">All Departments</option>
          {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>

        <select
          value={desigFilter}
          onChange={(e) => { setDesigFilter(e.target.value); setPage(1); }}
          className="px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
        >
          <option value="">All Designations</option>
          {designations.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
        </select>

        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
        >
          <option value="">All Statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive / Draft</option>
          <option value="ON_NOTICE">On Notice</option>
          <option value="TERMINATED">Terminated</option>
        </select>
      </div>

      {/* Employees Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <Loader message="Loading workforce directory..." />
        ) : employees.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-xs">
            No employees found matching your filter criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/75 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[11px] tracking-wider">
                  <th className="py-3 px-4">Employee ID</th>
                  <th className="py-3 px-4">Name</th>
                  <th className="py-3 px-4">Branch</th>
                  <th className="py-3 px-4">Department</th>
                  <th className="py-3 px-4">Phone / Contact</th>
                  <th className="py-3 px-4">Joining Date</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {employees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-4">
                      <Link to={`/employees/${emp.id}`} className="font-mono text-indigo-600 hover:underline font-semibold">
                        {emp.employee_code || '-'}
                      </Link>
                    </td>
                    <td className="py-3 px-4">
                      <Link to={`/employees/${emp.id}`} className="flex items-center gap-2.5 group">
                        <div className="w-8 h-8 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 flex items-center justify-center font-bold text-xs uppercase flex-shrink-0">
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
                    <td className="py-3 px-4">
                      <button
                        type="button"
                        onClick={() => emp.branch && setBranchFilter(emp.branch)}
                        className="text-slate-700 hover:text-indigo-600 font-medium text-left"
                      >
                        {emp.branch_name || 'Headquarters'}
                      </button>
                    </td>
                    <td className="py-3 px-4">
                      <button
                        type="button"
                        onClick={() => emp.department && setDeptFilter(emp.department)}
                        className="text-slate-600 hover:text-indigo-600 text-left"
                      >
                        {emp.department_name || 'General'}
                      </button>
                    </td>
                    <td className="py-3 px-4">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1 text-slate-600">
                          <Mail className="w-3 h-3 text-slate-400" />
                          <span>{emp.email || '-'}</span>
                        </div>
                        {emp.phone && (
                          <div className="flex items-center gap-1 text-slate-500 text-[11px]">
                            <Phone className="w-3 h-3 text-slate-400" />
                            <span>{emp.phone}</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      <Link to={`/employees/${emp.id}`} className="hover:underline">
                        {formatDate(emp.joining_date)}
                      </Link>
                    </td>
                    <td className="py-3 px-4">
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(emp)}
                        title="Click to activate/deactivate"
                      >
                        <Badge variant={emp.status === 'ACTIVE' ? 'success' : 'danger'}>
                          {emp.status}
                        </Badge>
                      </button>
                    </td>
                    <td className="py-3 px-4 text-right space-x-2 whitespace-nowrap">
                      <Link
                        to={`/employees/${emp.id}`}
                        className="text-indigo-600 hover:text-indigo-800 font-semibold text-xs px-2 py-1 rounded hover:bg-indigo-50"
                      >
                        View / Edit
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        <div className="px-4 py-3 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between text-xs text-slate-600">
          <span>Page {page} • Total {totalCount} employees</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={!hasPrev || page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="flex items-center gap-1 px-2.5 py-1 border border-slate-300 rounded bg-white hover:bg-slate-50 disabled:opacity-40"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Prev</span>
            </button>
            <button
              type="button"
              disabled={!hasNext}
              onClick={() => setPage((p) => p + 1)}
              className="flex items-center gap-1 px-2.5 py-1 border border-slate-300 rounded bg-white hover:bg-slate-50 disabled:opacity-40"
            >
              <span>Next</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Add Employee Modal — 9 Sections & 4 Action Buttons */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Onboard New Employee">
        <div className="space-y-4 max-h-[75vh] overflow-y-auto pr-1 text-xs">
          {/* 1. Personal Information */}
          <div>
            <p className="text-[10px] font-bold text-indigo-600 uppercase mb-2">1. Personal Information</p>
            <div className="grid grid-cols-2 gap-2.5">
              <input type="text" placeholder="First Name *" required value={formData.first_name} onChange={(e) => setFormData({ ...formData, first_name: e.target.value })} className="px-3 py-1.5 border border-slate-300 rounded-lg" />
              <input type="text" placeholder="Last Name" value={formData.last_name} onChange={(e) => setFormData({ ...formData, last_name: e.target.value })} className="px-3 py-1.5 border border-slate-300 rounded-lg" />
              <select value={formData.gender} onChange={(e) => setFormData({ ...formData, gender: e.target.value })} className="px-3 py-1.5 border border-slate-300 rounded-lg bg-white">
                <option value="PREFER_NOT_TO_SAY">Gender (Optional)</option>
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
                <option value="OTHER">Other</option>
              </select>
              <input type="date" title="Date of Birth" value={formData.date_of_birth} onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })} className="px-3 py-1.5 border border-slate-300 rounded-lg" />
            </div>
          </div>

          {/* 2. Contact Information */}
          <div>
            <p className="text-[10px] font-bold text-indigo-600 uppercase mb-2">2. Contact Information</p>
            <div className="grid grid-cols-2 gap-2.5">
              <input type="email" placeholder="Email Address *" required value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="px-3 py-1.5 border border-slate-300 rounded-lg" />
              <input type="tel" placeholder="Phone Number" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="px-3 py-1.5 border border-slate-300 rounded-lg" />
              <input type="text" placeholder="City" value={formData.city} onChange={(e) => setFormData({ ...formData, city: e.target.value })} className="px-3 py-1.5 border border-slate-300 rounded-lg" />
              <input type="text" placeholder="Address" value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} className="px-3 py-1.5 border border-slate-300 rounded-lg" />
            </div>
          </div>

          {/* 3. Employment Information */}
          <div>
            <p className="text-[10px] font-bold text-indigo-600 uppercase mb-2">3. Employment Information</p>
            <div className="grid grid-cols-3 gap-2">
              <select value={formData.employment_type} onChange={(e) => setFormData({ ...formData, employment_type: e.target.value })} className="px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white">
                <option value="FULL_TIME">Full Time</option>
                <option value="PART_TIME">Part Time</option>
                <option value="CONTRACT">Contract</option>
                <option value="INTERN">Intern</option>
              </select>
              <select value={formData.salary_type} onChange={(e) => setFormData({ ...formData, salary_type: e.target.value })} className="px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white">
                <option value="MONTHLY">Monthly</option>
                <option value="DAILY">Daily</option>
                <option value="HOURLY">Hourly</option>
              </select>
              <input type="date" required value={formData.joining_date} onChange={(e) => setFormData({ ...formData, joining_date: e.target.value })} className="px-2.5 py-1.5 border border-slate-300 rounded-lg" />
            </div>
          </div>

          {/* 4 & 5. Branch, Department & Designation */}
          <div>
            <p className="text-[10px] font-bold text-indigo-600 uppercase mb-2">4 &amp; 5. Branch, Department &amp; Designation</p>
            <div className="grid grid-cols-3 gap-2">
              <select value={formData.branch} onChange={(e) => setFormData({ ...formData, branch: e.target.value })} className="px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white">
                <option value="">Default Branch</option>
                {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
              <select value={formData.department} onChange={(e) => setFormData({ ...formData, department: e.target.value })} className="px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white">
                <option value="">Department</option>
                {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
              <select value={formData.designation} onChange={(e) => setFormData({ ...formData, designation: e.target.value })} className="px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white">
                <option value="">Designation</option>
                {designations.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
            </div>
          </div>

          {/* 6 & 7. Salary Configuration & Shift Assignment */}
          <div>
            <p className="text-[10px] font-bold text-indigo-600 uppercase mb-2">6 &amp; 7. Salary Configuration &amp; Shift</p>
            <div className="grid grid-cols-2 gap-2.5">
              <input type="number" placeholder="Base Monthly Salary (₹)" value={formData.base_salary} onChange={(e) => setFormData({ ...formData, base_salary: e.target.value })} className="px-3 py-1.5 border border-slate-300 rounded-lg" />
              <select value={formData.shift_id} onChange={(e) => setFormData({ ...formData, shift_id: e.target.value })} className="px-3 py-1.5 border border-slate-300 rounded-lg bg-white">
                <option value="">Assign Shift (Optional)</option>
                {shifts.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          </div>

          {/* 8. Documents */}
          <div>
            <p className="text-[10px] font-bold text-indigo-600 uppercase mb-2">8. Documents</p>
            <div className="grid grid-cols-2 gap-2.5">
              <input type="text" placeholder="PAN Number" value={formData.pan_number} onChange={(e) => setFormData({ ...formData, pan_number: e.target.value })} className="px-3 py-1.5 border border-slate-300 rounded-lg uppercase" />
              <input type="text" placeholder="Aadhaar Number" value={formData.aadhaar_number} onChange={(e) => setFormData({ ...formData, aadhaar_number: e.target.value })} className="px-3 py-1.5 border border-slate-300 rounded-lg" />
            </div>
          </div>

          {/* 9. Login Invitation */}
          <label className="flex items-center gap-2 p-2.5 bg-slate-50 rounded-lg cursor-pointer">
            <input type="checkbox" checked={formData.send_invite} onChange={(e) => setFormData({ ...formData, send_invite: e.target.checked })} className="rounded text-indigo-600" />
            <span className="font-semibold text-slate-700">9. Send Login Invitation &amp; Provision Employee Account</span>
          </label>

          {/* 4 Action Buttons */}
          <div className="pt-3 border-t border-slate-200 flex flex-wrap items-center justify-end gap-2">
            <button type="button" onClick={() => setShowModal(false)} className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg">
              Cancel
            </button>
            <button type="button" disabled={submitting} onClick={() => submitEmployee('draft')} className="px-3 py-1.5 text-xs font-semibold border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-lg">
              Save as Draft
            </button>
            <button type="button" disabled={submitting} onClick={() => submitEmployee('another')} className="px-3 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg">
              Save &amp; Add Another
            </button>
            <button type="button" disabled={submitting} onClick={() => submitEmployee('save')} className="px-4 py-1.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg">
              {submitting ? 'Saving...' : 'Save Employee'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
