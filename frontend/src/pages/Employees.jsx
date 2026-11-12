import React, { useState, useEffect } from 'react';
import api from '../api/client';
import { usePermissions } from '../hooks/usePermissions';
import {
  Users,
  Search,
  Plus,
  Building,
  Mail,
  Phone,
  Briefcase,
  Calendar,
  MapPin,
  UserCheck,
  Shield,
} from 'lucide-react';
import { Modal } from '../components/ui/Modal';
import { Badge } from '../components/ui/Badge';
import { Loader } from '../components/ui/Loader';
import { formatDate } from '../utils/formatters';

export const Employees = () => {
  const { canCreateEmployee, isOwner, isHR } = usePermissions();

  const [employees, setEmployees] = useState([]);
  const [branches, setBranches] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Create Modal
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    branch: '',
    department: '',
    employment_type: 'FULL_TIME',
    salary_type: 'MONTHLY',
    joining_date: new Date().toISOString().split('T')[0],
  });

  // View Profile Modal
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [viewLoading, setViewLoading] = useState(false);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const res = await api.get('/employees/', {
        params: { search: search || undefined },
      });
      const data = res.data?.data || res.data?.results || res.data || [];
      setEmployees(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load employees', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, [search]);

  useEffect(() => {
    if (canCreateEmployee) {
      api.get('/branches/').then((res) => {
        const list = res.data?.data || res.data?.results || res.data || [];
        setBranches(Array.isArray(list) ? list : []);
      }).catch(() => {});
      api.get('/branches/departments/').then((res) => {
        const list = res.data?.data || res.data?.results || res.data || [];
        setDepartments(Array.isArray(list) ? list : []);
      }).catch(() => {});
    }
  }, [canCreateEmployee]);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const payload = { ...formData };
      if (!payload.branch) delete payload.branch;
      if (!payload.department) delete payload.department;

      await api.post('/employees/', payload);
      setShowModal(false);
      setFormData({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        branch: '',
        department: '',
        employment_type: 'FULL_TIME',
        salary_type: 'MONTHLY',
        joining_date: new Date().toISOString().split('T')[0],
      });
      fetchEmployees();
      alert('Employee onboarded successfully! Login account linked (Default Password: WorkPulse@2026).');
    } catch (err) {
      const errData = err.response?.data;
      const msg =
        errData?.error?.message ||
        errData?.detail ||
        (typeof errData === 'object' ? Object.entries(errData).map(([k, v]) => `${k}: ${Array.isArray(v) ? v[0] : v}`).join('\n') : null) ||
        'Failed to create employee';
      alert(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleViewEmployee = async (emp) => {
    setSelectedEmployee(emp);
    try {
      setViewLoading(true);
      const res = await api.get(`/employees/${emp.id}/`);
      const detail = res.data?.data || res.data;
      if (detail && detail.id) {
        setSelectedEmployee(detail);
      }
    } catch (err) {
      console.error('Failed to load full employee profile', err);
    } finally {
      setViewLoading(false);
    }
  };

  const handleDeactivate = async (empId) => {
    if (!confirm('Deactivate this employee?')) return;
    try {
      await api.post(`/employees/${empId}/deactivate/`);
      setSelectedEmployee(null);
      fetchEmployees();
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Failed to deactivate employee');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with Title and Add Button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-600" />
            <span>Staff Directory & Profiles</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage your company workforce, departments, designations, and employee profiles
          </p>
        </div>

        {/* Add Employee Button: Only visible to HR & Business Owner */}
        {canCreateEmployee && (
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Employee</span>
          </button>
        )}
      </div>

      {/* Search and Filters */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by name, email or code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent transition-all"
          />
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Briefcase className="w-4 h-4 text-slate-400" />
          <span>Showing {employees.length} team members</span>
        </div>
      </div>

      {/* Employees Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <Loader message="Loading workforce directory..." />
        ) : employees.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-xs">
            No employees found matching your search criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/75 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[11px] tracking-wider">
                  <th className="py-3 px-4">Employee</th>
                  <th className="py-3 px-4">Employee Code</th>
                  <th className="py-3 px-4">Contact</th>
                  <th className="py-3 px-4">Branch & Dept</th>
                  <th className="py-3 px-4">Joining Date</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {employees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 flex items-center justify-center font-bold text-xs uppercase">
                          {emp.first_name?.[0] || 'E'}
                          {emp.last_name ? emp.last_name[0] : ''}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900 leading-tight">
                            {emp.first_name} {emp.last_name}
                          </p>
                          <p className="text-[11px] text-slate-500">{emp.designation_name || 'Staff Associate'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-700 font-medium">
                      {emp.employee_code || '-'}
                    </td>
                    <td className="py-3 px-4">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5 text-slate-600">
                          <Mail className="w-3 h-3 text-slate-400" />
                          <span>{emp.email || '-'}</span>
                        </div>
                        {emp.phone && (
                          <div className="flex items-center gap-1.5 text-slate-500 text-[11px]">
                            <Phone className="w-3 h-3 text-slate-400" />
                            <span>{emp.phone}</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div>
                        <p className="font-medium text-slate-800">{emp.branch_name || 'Headquarters'}</p>
                        <p className="text-[11px] text-slate-400">{emp.department_name || 'General'}</p>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {formatDate(emp.joining_date)}
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant={emp.status === 'ACTIVE' ? 'success' : 'default'}>
                        {emp.status}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleViewEmployee(emp)}
                        className="text-indigo-600 hover:text-indigo-800 font-semibold text-xs px-2.5 py-1 rounded hover:bg-indigo-50 transition-colors"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Employee Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Onboard New Employee">
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">First Name *</label>
              <input
                type="text"
                required
                value={formData.first_name}
                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-600 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Last Name</label>
              <input
                type="text"
                value={formData.last_name}
                onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-600 outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address *</label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-600 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Phone Number</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-600 outline-none"
              />
            </div>
          </div>

          {(branches.length > 0 || departments.length > 0) && (
            <div className="grid grid-cols-2 gap-3">
              {branches.length > 0 && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Branch</label>
                  <select
                    value={formData.branch}
                    onChange={(e) => setFormData({ ...formData, branch: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-600 outline-none bg-white"
                  >
                    <option value="">Default Branch</option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>
              )}
              {departments.length > 0 && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Department</label>
                  <select
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-600 outline-none bg-white"
                  >
                    <option value="">Select Department</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Employment Type</label>
              <select
                value={formData.employment_type}
                onChange={(e) => setFormData({ ...formData, employment_type: e.target.value })}
                className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-600 outline-none bg-white"
              >
                <option value="FULL_TIME">Full Time</option>
                <option value="PART_TIME">Part Time</option>
                <option value="CONTRACT">Contract</option>
                <option value="INTERN">Intern</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Joining Date *</label>
              <input
                type="date"
                required
                value={formData.joining_date}
                onChange={(e) => setFormData({ ...formData, joining_date: e.target.value })}
                className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-600 outline-none"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-1.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-sm transition-colors disabled:opacity-50"
            >
              {submitting ? 'Onboarding...' : 'Save & Onboard'}
            </button>
          </div>
        </form>
      </Modal>

      {/* View Employee Profile Modal */}
      <Modal
        isOpen={!!selectedEmployee}
        onClose={() => setSelectedEmployee(null)}
        title="Employee Profile Details"
      >
        {selectedEmployee && (
          <div className="space-y-4">
            <div className="flex items-center gap-4 pb-4 border-b border-slate-100">
              <div className="w-12 h-12 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-base uppercase">
                {selectedEmployee.first_name?.[0] || 'E'}
                {selectedEmployee.last_name?.[0] || ''}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-slate-900">
                    {selectedEmployee.full_name || `${selectedEmployee.first_name} ${selectedEmployee.last_name}`}
                  </h4>
                  <Badge variant={selectedEmployee.status === 'ACTIVE' ? 'success' : 'default'}>
                    {selectedEmployee.status}
                  </Badge>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  {selectedEmployee.designation_name || 'Staff Associate'} •{' '}
                  <span className="font-mono text-indigo-600 font-semibold">{selectedEmployee.employee_code}</span>
                </p>
              </div>
            </div>

            {viewLoading ? (
              <Loader message="Loading profile details..." />
            ) : (
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-2.5 bg-slate-50 rounded-lg">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Email</p>
                  <p className="font-medium text-slate-800 mt-0.5 break-all">{selectedEmployee.email || '-'}</p>
                </div>
                <div className="p-2.5 bg-slate-50 rounded-lg">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Phone</p>
                  <p className="font-medium text-slate-800 mt-0.5">{selectedEmployee.phone || '-'}</p>
                </div>
                <div className="p-2.5 bg-slate-50 rounded-lg">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Branch</p>
                  <p className="font-medium text-slate-800 mt-0.5">{selectedEmployee.branch_name || 'Headquarters'}</p>
                </div>
                <div className="p-2.5 bg-slate-50 rounded-lg">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Department</p>
                  <p className="font-medium text-slate-800 mt-0.5">{selectedEmployee.department_name || 'General'}</p>
                </div>
                <div className="p-2.5 bg-slate-50 rounded-lg">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Employment Type</p>
                  <p className="font-medium text-slate-800 mt-0.5">{selectedEmployee.employment_type || 'FULL_TIME'}</p>
                </div>
                <div className="p-2.5 bg-slate-50 rounded-lg">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Joining Date</p>
                  <p className="font-medium text-slate-800 mt-0.5">{formatDate(selectedEmployee.joining_date)}</p>
                </div>
              </div>
            )}

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              {(isOwner || isHR) && selectedEmployee.status === 'ACTIVE' ? (
                <button
                  type="button"
                  onClick={() => handleDeactivate(selectedEmployee.id)}
                  className="px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                >
                  Deactivate Employee
                </button>
              ) : (
                <div></div>
              )}
              <button
                type="button"
                onClick={() => setSelectedEmployee(null)}
                className="px-4 py-1.5 text-xs font-semibold bg-slate-900 text-white hover:bg-slate-800 rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
