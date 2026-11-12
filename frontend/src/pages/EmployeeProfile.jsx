import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api/client';
import { usePermissions } from '../hooks/usePermissions';
import {
  ArrowLeft,
  User,
  Briefcase,
  CalendarCheck2,
  Clock,
  CalendarOff,
  Banknote,
  HandCoins,
  FileText,
  History,
  Settings as SettingsIcon,
  LayoutDashboard,
} from 'lucide-react';
import { Loader } from '../components/ui/Loader';
import { Badge } from '../components/ui/Badge';
import { formatDate, formatINR, formatTime } from '../utils/formatters';

export const EmployeeProfile = () => {
  const { id } = useParams();
  const { isOwner, isHR, canManagePayroll } = usePermissions();

  const [activeTab, setActiveTab] = useState('overview');
  const [employee, setEmployee] = useState(null);
  const [attendance, setAttendance] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [payslips, setPayslips] = useState([]);
  const [advances, setAdvances] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tabLoading, setTabLoading] = useState(false);

  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ first_name: '', last_name: '', phone: '', address: '', city: '' });

  const fetchEmployee = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/employees/${id}/`);
      const emp = res.data?.data || res.data;
      setEmployee(emp);
      setEditForm({
        first_name: emp.first_name || '',
        last_name: emp.last_name || '',
        phone: emp.phone || '',
        address: emp.address || '',
        city: emp.city || '',
      });
    } catch (err) {
      console.error('Failed to load employee profile', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployee();
  }, [id]);

  // Fetch tab-specific data lazily when tab changes
  useEffect(() => {
    if (!id) return;
    const fetchTab = async () => {
      setTabLoading(true);
      try {
        if (activeTab === 'attendance') {
          const res = await api.get('/attendance/', { params: { employee: id } });
          const d = res.data?.data || res.data?.results || [];
          setAttendance(Array.isArray(d) ? d : []);
        } else if (activeTab === 'shifts') {
          const res = await api.get('/shifts/assignments/', { params: { employee: id } });
          const d = res.data?.data || res.data?.results || [];
          setShifts(Array.isArray(d) ? d : []);
        } else if (activeTab === 'leave') {
          const res = await api.get('/leaves/requests/', { params: { employee: id } });
          const d = res.data?.data || res.data?.results || [];
          setLeaves(Array.isArray(d) ? d : []);
        } else if (activeTab === 'salary') {
          const res = await api.get('/payroll/payslips/', { params: { employee: id } });
          const d = res.data?.data || res.data?.results || [];
          setPayslips(Array.isArray(d) ? d : []);
        } else if (activeTab === 'advances') {
          const res = await api.get('/advances/', { params: { employee: id } });
          const d = res.data?.data || res.data?.results || [];
          setAdvances(Array.isArray(d) ? d : []);
        } else if (activeTab === 'history') {
          const res = await api.get(`/employees/${id}/history/`);
          const d = res.data?.data || res.data?.results || [];
          setHistory(Array.isArray(d) ? d : []);
        }
      } catch (err) {
        console.error('Tab fetch failed', err);
      } finally {
        setTabLoading(false);
      }
    };
    fetchTab();
  }, [activeTab, id]);

  const handleToggleStatus = async () => {
    const endpoint = employee.status === 'ACTIVE' ? 'deactivate' : 'activate';
    if (!confirm(`Confirm ${endpoint} for ${employee.full_name || employee.first_name}?`)) return;
    try {
      await api.post(`/employees/${id}/${endpoint}/`);
      fetchEmployee();
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Status update failed');
    }
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    try {
      await api.patch(`/employees/${id}/`, editForm);
      setEditing(false);
      fetchEmployee();
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Failed to update employee');
    }
  };

  if (loading) return <Loader message="Loading Employee Profile..." />;
  if (!employee) {
    return (
      <div className="p-8 text-center">
        <p className="text-sm text-slate-600">Employee not found.</p>
        <Link to="/employees" className="text-xs text-indigo-600 font-semibold mt-2 inline-block">
          &larr; Back to Employee List
        </Link>
      </div>
    );
  }

  const tabs = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'personal', label: 'Personal Information', icon: User },
    { id: 'employment', label: 'Employment Details', icon: Briefcase },
    { id: 'attendance', label: 'Attendance', icon: CalendarCheck2 },
    { id: 'shifts', label: 'Shifts', icon: Clock },
    { id: 'leave', label: 'Leave', icon: CalendarOff },
    ...(canManagePayroll || isOwner ? [{ id: 'salary', label: 'Salary', icon: Banknote }] : []),
    { id: 'advances', label: 'Advances', icon: HandCoins },
    { id: 'documents', label: 'Documents', icon: FileText },
    { id: 'history', label: 'Activity History', icon: History },
    ...(isOwner || isHR ? [{ id: 'settings', label: 'Settings', icon: SettingsIcon }] : []),
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link to="/employees" className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-indigo-600">
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Employees</span>
        </Link>
      </div>

      {/* Profile Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-bold text-xl uppercase">
            {employee.first_name?.[0]}
            {employee.last_name?.[0] || ''}
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-xl font-bold text-slate-900">
                {employee.full_name || `${employee.first_name} ${employee.last_name}`}
              </h2>
              <Badge variant={employee.status === 'ACTIVE' ? 'success' : 'danger'}>{employee.status}</Badge>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              <span className="font-mono font-semibold text-indigo-600">{employee.employee_code}</span> •{' '}
              {employee.designation_name || 'Staff'} • {employee.department_name || 'General'} • {employee.branch_name || 'HQ'}
            </p>
          </div>
        </div>
      </div>

      {/* 11-Tab Bar */}
      <div className="flex flex-wrap gap-1.5 border-b border-slate-200 pb-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === t.id ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <t.icon className="w-3.5 h-3.5" />
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        {tabLoading ? (
          <Loader message="Loading tab data..." />
        ) : activeTab === 'overview' ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="p-4 bg-slate-50 rounded-xl">
              <p className="text-[10px] font-bold text-slate-400 uppercase">Email</p>
              <p className="font-semibold text-slate-900 mt-1">{employee.email || '-'}</p>
            </div>
            <div className="p-4 bg-slate-50 rounded-xl">
              <p className="text-[10px] font-bold text-slate-400 uppercase">Phone</p>
              <p className="font-semibold text-slate-900 mt-1">{employee.phone || '-'}</p>
            </div>
            <div className="p-4 bg-slate-50 rounded-xl">
              <p className="text-[10px] font-bold text-slate-400 uppercase">Joining Date</p>
              <p className="font-semibold text-slate-900 mt-1">{formatDate(employee.joining_date)}</p>
            </div>
            <div className="p-4 bg-slate-50 rounded-xl">
              <p className="text-[10px] font-bold text-slate-400 uppercase">Branch</p>
              <p className="font-semibold text-slate-900 mt-1">{employee.branch_name || '-'}</p>
            </div>
            <div className="p-4 bg-slate-50 rounded-xl">
              <p className="text-[10px] font-bold text-slate-400 uppercase">Department</p>
              <p className="font-semibold text-slate-900 mt-1">{employee.department_name || '-'}</p>
            </div>
            <div className="p-4 bg-slate-50 rounded-xl">
              <p className="text-[10px] font-bold text-slate-400 uppercase">Employment Type</p>
              <p className="font-semibold text-slate-900 mt-1">{employee.employment_type}</p>
            </div>
          </div>
        ) : activeTab === 'personal' ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
            <div><p className="text-slate-400 font-bold text-[10px] uppercase">First Name</p><p className="font-semibold mt-1">{employee.first_name}</p></div>
            <div><p className="text-slate-400 font-bold text-[10px] uppercase">Last Name</p><p className="font-semibold mt-1">{employee.last_name || '-'}</p></div>
            <div><p className="text-slate-400 font-bold text-[10px] uppercase">Gender</p><p className="font-semibold mt-1">{employee.gender || '-'}</p></div>
            <div><p className="text-slate-400 font-bold text-[10px] uppercase">Date of Birth</p><p className="font-semibold mt-1">{employee.date_of_birth ? formatDate(employee.date_of_birth) : '-'}</p></div>
            <div><p className="text-slate-400 font-bold text-[10px] uppercase">City</p><p className="font-semibold mt-1">{employee.city || '-'}</p></div>
            <div><p className="text-slate-400 font-bold text-[10px] uppercase">Address</p><p className="font-semibold mt-1">{employee.address || '-'}</p></div>
          </div>
        ) : activeTab === 'employment' ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
            <div><p className="text-slate-400 font-bold text-[10px] uppercase">Employee Code</p><p className="font-mono font-semibold mt-1">{employee.employee_code}</p></div>
            <div><p className="text-slate-400 font-bold text-[10px] uppercase">Branch</p><p className="font-semibold mt-1">{employee.branch_name || '-'}</p></div>
            <div><p className="text-slate-400 font-bold text-[10px] uppercase">Department</p><p className="font-semibold mt-1">{employee.department_name || '-'}</p></div>
            <div><p className="text-slate-400 font-bold text-[10px] uppercase">Designation</p><p className="font-semibold mt-1">{employee.designation_name || '-'}</p></div>
            <div><p className="text-slate-400 font-bold text-[10px] uppercase">Salary Type</p><p className="font-semibold mt-1">{employee.salary_type}</p></div>
            <div><p className="text-slate-400 font-bold text-[10px] uppercase">Field Staff</p><p className="font-semibold mt-1">{employee.is_field_employee ? 'Yes' : 'No'}</p></div>
          </div>
        ) : activeTab === 'attendance' ? (
          (() => {
            const todayStr = new Date().toLocaleDateString('en-CA');
            const todayRec = attendance.find((a) => a.date === todayStr);
            const isPunchedInToday = !!(todayRec && todayRec.check_in && !todayRec.check_out);

            return (
              <div className="space-y-4">
                {(isOwner || isHR) && (
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <div>
                      <span className="text-xs font-semibold text-slate-700">
                        {isPunchedInToday
                          ? `${employee.first_name} is currently Punched In (since ${formatTime(todayRec.check_in)})`
                          : `Record Live Punch for ${employee.first_name}`}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      {!isPunchedInToday ? (
                        <button
                          type="button"
                          onClick={async () => {
                            await api.post('/attendance/punch-employee/', { employee_id: id, action: 'IN' });
                            const res = await api.get('/attendance/', { params: { employee: id } });
                            setAttendance(res.data?.data || res.data?.results || []);
                          }}
                          className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-sm"
                        >
                          Punch In (PI)
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={async () => {
                            await api.post('/attendance/punch-employee/', { employee_id: id, action: 'OUT' });
                            const res = await api.get('/attendance/', { params: { employee: id } });
                            setAttendance(res.data?.data || res.data?.results || []);
                          }}
                          className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold shadow-sm"
                        >
                          Punch Out (PO)
                        </button>
                      )}
                    </div>
                  </div>
                )}
                {attendance.length === 0 ? (
                  <p className="text-xs text-slate-500">No attendance punch logs for this employee yet.</p>
                ) : (
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b text-slate-500 uppercase text-[11px]">
                        <th className="py-2">Date</th>
                        <th className="py-2">Punch In</th>
                        <th className="py-2">Punch Out</th>
                        <th className="py-2">Hours</th>
                        <th className="py-2">Punch Logs</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {attendance.map((a) => (
                        <tr key={a.id}>
                          <td className="py-2.5 font-semibold">{formatDate(a.date)}</td>
                          <td className="py-2.5 font-mono">{formatTime(a.check_in)}</td>
                          <td className="py-2.5 font-mono">{formatTime(a.check_out)}</td>
                          <td className="py-2.5">{a.working_hours || '-'}</td>
                          <td className="py-2.5 font-mono text-[11px] text-slate-500">
                            {Array.isArray(a.punches) && a.punches.length > 0
                              ? a.punches.map((p) => `${p.punch_type === 'CHECK_IN' ? 'PI' : 'PO'}: ${formatTime(p.timestamp)}`).join(' • ')
                              : `${a.check_in ? `PI: ${formatTime(a.check_in)}` : ''}${a.check_out ? ` • PO: ${formatTime(a.check_out)}` : ''}` || '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            );
          })()
        ) : activeTab === 'shifts' ? (
          shifts.length === 0 ? <p className="text-xs text-slate-500">No shift assignments recorded.</p> : (
            <div className="space-y-2 text-xs">{shifts.map((s) => (
              <div key={s.id} className="p-3 bg-slate-50 rounded-lg flex justify-between">
                <span className="font-semibold">{s.shift_name || 'Assigned Shift'}</span>
                <span className="text-slate-500">Effective: {formatDate(s.effective_from)}</span>
              </div>
            ))}</div>
          )
        ) : activeTab === 'leave' ? (
          leaves.length === 0 ? <p className="text-xs text-slate-500">No leave requests found.</p> : (
            <div className="space-y-2 text-xs">{leaves.map((l) => (
              <div key={l.id} className="p-3 bg-slate-50 rounded-lg flex justify-between">
                <span><strong>{l.leave_type_name || 'Leave'}</strong> ({formatDate(l.start_date)} - {formatDate(l.end_date)})</span>
                <Badge variant={l.status === 'APPROVED' ? 'success' : 'warning'}>{l.status}</Badge>
              </div>
            ))}</div>
          )
        ) : activeTab === 'salary' ? (
          payslips.length === 0 ? <p className="text-xs text-slate-500">No payslips generated yet.</p> : (
            <div className="space-y-2 text-xs">{payslips.map((p) => (
              <div key={p.id} className="p-3 bg-slate-50 rounded-lg flex justify-between">
                <span className="font-semibold">{p.period_display || p.payslip_number}</span>
                <span className="font-bold text-emerald-700">{formatINR(p.net_salary || 0)}</span>
              </div>
            ))}</div>
          )
        ) : activeTab === 'advances' ? (
          advances.length === 0 ? <p className="text-xs text-slate-500">No salary advances or loans.</p> : (
            <div className="space-y-2 text-xs">{advances.map((adv) => (
              <div key={adv.id} className="p-3 bg-slate-50 rounded-lg flex justify-between">
                <span>{adv.reason || 'Advance'} — {formatINR(adv.amount)}</span>
                <Badge variant="info">{adv.status}</Badge>
              </div>
            ))}</div>
          )
        ) : activeTab === 'documents' ? (
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div className="p-3 bg-slate-50 rounded-lg"><p className="text-[10px] font-bold text-slate-400 uppercase">PAN Number</p><p className="font-mono font-semibold mt-1">{employee.pan_number || 'Not provided'}</p></div>
            <div className="p-3 bg-slate-50 rounded-lg"><p className="text-[10px] font-bold text-slate-400 uppercase">Aadhaar Number</p><p className="font-mono font-semibold mt-1">{employee.aadhaar_number || 'Not provided'}</p></div>
          </div>
        ) : activeTab === 'history' ? (
          history.length === 0 ? <p className="text-xs text-slate-500">No employment history entries.</p> : (
            <div className="space-y-2 text-xs">{history.map((h) => (
              <div key={h.id} className="p-3 bg-slate-50 rounded-lg flex justify-between">
                <div><p className="font-bold text-slate-900">{h.change_type}</p><p className="text-slate-500">{h.notes}</p></div>
                <span className="text-slate-400">{formatDate(h.effective_date)}</span>
              </div>
            ))}</div>
          )
        ) : (
          /* Settings Tab */
          <div className="space-y-4">
            {editing ? (
              <form onSubmit={handleSaveEdit} className="space-y-3 max-w-md">
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="block text-xs font-semibold mb-1">First Name</label><input type="text" value={editForm.first_name} onChange={(e) => setEditForm({ ...editForm, first_name: e.target.value })} className="w-full px-3 py-1.5 text-xs border rounded-lg" /></div>
                  <div><label className="block text-xs font-semibold mb-1">Last Name</label><input type="text" value={editForm.last_name} onChange={(e) => setEditForm({ ...editForm, last_name: e.target.value })} className="w-full px-3 py-1.5 text-xs border rounded-lg" /></div>
                </div>
                <div><label className="block text-xs font-semibold mb-1">Phone</label><input type="text" value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} className="w-full px-3 py-1.5 text-xs border rounded-lg" /></div>
                <div><label className="block text-xs font-semibold mb-1">City</label><input type="text" value={editForm.city} onChange={(e) => setEditForm({ ...editForm, city: e.target.value })} className="w-full px-3 py-1.5 text-xs border rounded-lg" /></div>
                <div className="flex gap-2">
                  <button type="submit" className="px-4 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-semibold">Save Changes</button>
                  <button type="button" onClick={() => setEditing(false)} className="px-3 py-1.5 bg-slate-100 rounded-lg text-xs font-semibold">Cancel</button>
                </div>
              </form>
            ) : (
              <div className="flex flex-wrap gap-3">
                <button onClick={() => setEditing(true)} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-semibold">Edit Employee Profile</button>
                <button onClick={handleToggleStatus} className={`px-4 py-2 rounded-lg text-xs font-semibold ${employee.status === 'ACTIVE' ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'}`}>
                  {employee.status === 'ACTIVE' ? 'Deactivate Employee' : 'Activate Employee'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

