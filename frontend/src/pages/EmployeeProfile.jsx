import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../api/client';
import { usePermissions } from '../hooks/usePermissions';
import { useNotification } from '../context/NotificationContext';
import {
  ArrowLeft,
  User,
  Briefcase,
  CalendarCheck2,
  Clock,
  Calendar,
  CalendarOff,
  Banknote,
  HandCoins,
  FileText,
  History,
  Settings as SettingsIcon,
  LayoutDashboard,
  Trash2,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';
import { Loader } from '../components/ui/Loader';
import { Badge } from '../components/ui/Badge';
import { formatDate, formatINR, formatTime, calculateAge, getAgeInfo } from '../utils/formatters';
import { calculateWorkHoursSummary } from '../utils/workHours';
import { calculateEmployeeInactivity } from '../utils/employeeInactivity';

export const EmployeeProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isOwner, isHR, canManagePayroll } = usePermissions();
  const { toast, confirm } = useNotification();

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
  const [editForm, setEditForm] = useState({
    first_name: '',
    last_name: '',
    phone: '',
    address: '',
    city: '',
    date_of_birth: '',
    salary_type: 'MONTHLY',
    base_salary: '',
  });

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
        date_of_birth: emp.date_of_birth || '',
        salary_type: emp.salary_type || 'MONTHLY',
        base_salary: emp.base_salary ?? '',
      });

      // Preload attendance so weekly & monthly hours are immediately available on overview tab
      try {
        const attRes = await api.get('/attendance/', { params: { employee: id } });
        const attData = attRes.data?.data || attRes.data?.results || attRes.data || [];
        setAttendance(Array.isArray(attData) ? attData : []);
      } catch {
        // silent
      }
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
    const isActivating = employee.status !== 'ACTIVE';
    const endpoint = isActivating ? 'activate' : 'deactivate';
    const empName = employee.full_name || employee.first_name;
    const confirmed = await confirm({
      title: `${isActivating ? 'Activate' : 'Deactivate'} Employee`,
      message: `Are you sure you want to ${isActivating ? 'activate' : 'deactivate'} ${empName}?`,
      confirmText: isActivating ? 'Activate' : 'Deactivate',
      type: isActivating ? 'primary' : 'warning',
    });
    if (!confirmed) return;

    try {
      await api.post(`/employees/${id}/${endpoint}/`);
      toast.success(`${empName} has been ${isActivating ? 'activated' : 'deactivated'}.`);
      fetchEmployee();
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Status update failed');
    }
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (editForm.date_of_birth) {
      const ageInfo = getAgeInfo(editForm.date_of_birth);
      if (ageInfo.isUnderage) {
        toast.error(
          ageInfo.isFuture
            ? 'Date of birth cannot be in the future.'
            : `Cannot update employee: Candidate is ${ageInfo.age ?? 'under'} years old. Minimum legal working age is 18 under labor laws.`
        );
        return;
      }
    }
    try {
      await api.patch(`/employees/${id}/`, editForm);
      setEditing(false);
      fetchEmployee();
      toast.success('Employee updated successfully!');
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Failed to update employee');
    }
  };

  const handleDeleteEmployee = async () => {
    const empName = employee.full_name || `${employee.first_name} ${employee.last_name}`;
    const confirmed = await confirm({
      title: 'Remove Employee',
      message: `Are you sure you want to permanently remove ${empName} from the company? This action cannot be undone and will delete all associated profile data.`,
      confirmText: 'Remove Employee',
      cancelText: 'Cancel',
      type: 'danger',
    });
    if (!confirmed) return;

    try {
      await api.delete(`/employees/${id}/`);
      toast.success(`Employee ${empName} has been removed successfully.`);
      navigate('/employees');
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Failed to remove employee');
    }
  };

  if (loading) return <Loader message="Loading Employee Profile..." />;
  if (!employee) {
    return (
      <div className="p-8 text-center">
        <p className="text-sm text-zinc-600 ">Employee not found.</p>
        <Link to="/employees" className="text-xs text-zinc-900  hover:underline font-semibold mt-2 inline-block">
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
        <Link to="/employees" className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-600 hover:text-black transition-colors">
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Employees</span>
        </Link>
      </div>

      {/* Profile Header */}
      <div className="bg-white rounded-2xl border border-zinc-200 p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-zinc-950 text-white flex items-center justify-center font-bold text-xl uppercase shadow-xs">
            {employee.first_name?.[0]}
            {employee.last_name?.[0] || ''}
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-xl font-bold text-zinc-950">
                {employee.full_name || `${employee.first_name} ${employee.last_name}`}
              </h2>
              {(() => {
                const inact = calculateEmployeeInactivity(employee, attendance);
                if (employee.status === 'TERMINATED' || employee.status === 'RESIGNED') {
                  return (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-zinc-100 text-zinc-600 border border-zinc-200">
                      <span className="w-1.5 h-1.5 rounded-full bg-zinc-400" />
                      <span>INACTIVE ({employee.status})</span>
                    </span>
                  );
                }
                if (inact.isInactive) {
                  return (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-300" title={inact.label}>
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                      <span>INACTIVE ({inact.days}d no punch)</span>
                    </span>
                  );
                }
                return (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <span>ACTIVE</span>
                  </span>
                );
              })()}
            </div>
            <p className="text-xs text-zinc-500 mt-0.5">
              <span className="font-mono font-semibold text-zinc-900">{employee.employee_code}</span> &bull;{' '}
              {employee.designation_name || 'Staff'} &bull; {employee.department_name || 'General'} &bull; {employee.branch_name || 'HQ'}
            </p>
          </div>
        </div>

        {/* Profile Header Actions */}
        <div className="flex items-center gap-2">
          {(isOwner || isHR) && (
            <button
              type="button"
              onClick={handleDeleteEmployee}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-bold transition-colors shadow-2xs cursor-pointer"
              title="Permanently remove employee from company"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-600" />
              <span>Remove Employee</span>
            </button>
          )}
        </div>
      </div>

      {/* 11-Tab Bar (Horizontal scroll on mobile, flex on desktop) */}
      <div className="flex items-center gap-1.5 border-b border-zinc-200 pb-2 overflow-x-auto">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === t.id ? 'bg-zinc-950 text-white font-bold shadow-xs' : 'text-zinc-600 hover:bg-zinc-100'
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
          <div>
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

            {/* Cumulative Shift, Weekly & Monthly Hours Summary */}
            <div className="mt-5 pt-4 border-t border-zinc-100">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-zinc-900" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-950">Work Hours &amp; Shift Summary</h4>
                </div>
                <div className="flex items-center gap-1.5 text-2xs font-mono text-zinc-500">
                  <span className="px-2 py-0.5 bg-zinc-100 rounded-md font-bold text-zinc-800">Week: {calculateWorkHoursSummary(attendance).weekLabel}</span>
                  <span className="px-2 py-0.5 bg-zinc-100 rounded-md font-bold text-zinc-800">Month: {calculateWorkHoursSummary(attendance).monthLabel}</span>
                </div>
              </div>

              {(() => {
                const summary = calculateWorkHoursSummary(attendance);
                return (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div className="p-3.5 bg-zinc-50 rounded-xl border border-zinc-200/80">
                      <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">Today&apos;s Hours</span>
                      <p className="text-xl font-mono font-bold text-zinc-950 mt-1">{summary.todayFormatted}</p>
                      <span className="text-[11px] text-zinc-500">{summary.todayText}</span>
                    </div>
                    <div className="p-3.5 bg-zinc-50 rounded-xl border border-zinc-200/80">
                      <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">Total Weekly Hours</span>
                      <p className="text-xl font-mono font-bold text-zinc-950 mt-1">{summary.weeklyFormatted}</p>
                      <span className="text-[11px] text-zinc-500">{summary.weeklyText} &bull; Monday to Sunday</span>
                    </div>
                    <div className="p-3.5 bg-zinc-50 rounded-xl border border-zinc-200/80">
                      <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">Total Monthly Hours</span>
                      <p className="text-xl font-mono font-bold text-zinc-950 mt-1">{summary.monthlyFormatted}</p>
                      <span className="text-[11px] text-zinc-500">{summary.monthlyText} &bull; {summary.monthLabel}</span>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        ) : activeTab === 'personal' ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
            <div><p className="text-slate-400 font-bold text-[10px] uppercase">First Name</p><p className="font-semibold mt-1">{employee.first_name}</p></div>
            <div><p className="text-slate-400 font-bold text-[10px] uppercase">Last Name</p><p className="font-semibold mt-1">{employee.last_name || '-'}</p></div>
            <div><p className="text-slate-400 font-bold text-[10px] uppercase">Gender</p><p className="font-semibold mt-1">{employee.gender || '-'}</p></div>
            <div>
              <p className="text-slate-400 font-bold text-[10px] uppercase">Date of Birth &amp; Age</p>
              <div className="font-semibold mt-1 flex items-center gap-2 flex-wrap">
                <span>{employee.date_of_birth ? formatDate(employee.date_of_birth) : '-'}</span>
                {employee.date_of_birth && (() => {
                  const age = calculateAge(employee.date_of_birth);
                  return age !== null ? (
                    <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                      {age} years old
                    </span>
                  ) : null;
                })()}
              </div>
            </div>
            <div><p className="text-slate-400 font-bold text-[10px] uppercase">City</p><p className="font-semibold mt-1">{employee.city || '-'}</p></div>
            <div><p className="text-slate-400 font-bold text-[10px] uppercase">Address</p><p className="font-semibold mt-1">{employee.address || '-'}</p></div>
          </div>
        ) : activeTab === 'employment' ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
            <div><p className="text-slate-400 font-bold text-[10px] uppercase">Employee Code</p><p className="font-mono font-semibold mt-1">{employee.employee_code}</p></div>
            <div><p className="text-slate-400 font-bold text-[10px] uppercase">Branch</p><p className="font-semibold mt-1">{employee.branch_name || '-'}</p></div>
            <div><p className="text-slate-400 font-bold text-[10px] uppercase">Department</p><p className="font-semibold mt-1">{employee.department_name || '-'}</p></div>
            <div><p className="text-slate-400 font-bold text-[10px] uppercase">Designation</p><p className="font-semibold mt-1">{employee.designation_name || '-'}</p></div>
            <div>
              <p className="text-slate-400 font-bold text-[10px] uppercase">Salary Type &amp; Rate</p>
              <div className="font-semibold mt-1 flex items-center gap-2 flex-wrap">
                <Badge variant="neutral">{employee.salary_type || 'MONTHLY'}</Badge>
                {employee.base_salary ? (
                  <span className="text-xs font-mono font-bold text-zinc-900">
                    {formatINR(employee.base_salary)}
                    {employee.salary_type === 'HOURLY'
                      ? ' / hr'
                      : employee.salary_type === 'DAILY'
                      ? ' / day'
                      : employee.salary_type === 'WEEKLY'
                      ? ' / wk'
                      : ' / mo'}
                  </span>
                ) : null}
              </div>
            </div>
            <div><p className="text-slate-400 font-bold text-[10px] uppercase">Field Staff</p><p className="font-semibold mt-1">{employee.is_field_employee ? 'Yes' : 'No'}</p></div>
          </div>
        ) : activeTab === 'attendance' ? (
          (() => {
            const todayStr = new Date().toLocaleDateString('en-CA');
            const todayRec = attendance.find((a) => a.date === todayStr);
            const isPunchedInToday = !!(todayRec && todayRec.check_in && !todayRec.check_out);
            const summary = calculateWorkHoursSummary(attendance, todayRec);

            return (
              <div className="space-y-4">
                {/* 3-Metric Cumulative Working Hours Header Strip */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Today&apos;s Hours</span>
                      <span className={`w-2 h-2 rounded-full ${isPunchedInToday ? 'bg-zinc-950 animate-pulse' : 'bg-zinc-400'}`} />
                    </div>
                    <p className="text-2xl font-mono font-black text-zinc-950 mt-1">
                      {summary.todayFormatted}
                    </p>
                    <span className="text-xs text-zinc-500 mt-0.5 block">{summary.todayText}</span>
                  </div>

                  <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Total Weekly Hours</span>
                      <Calendar className="w-4 h-4 text-zinc-500" />
                    </div>
                    <p className="text-2xl font-mono font-black text-zinc-950 mt-1">
                      {summary.weeklyFormatted}
                    </p>
                    <span className="text-xs text-zinc-500 mt-0.5 block">{summary.weeklyText} &bull; {summary.weekLabel}</span>
                  </div>

                  <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Total Monthly Hours</span>
                      <Clock className="w-4 h-4 text-zinc-500" />
                    </div>
                    <p className="text-2xl font-mono font-black text-zinc-950 mt-1">
                      {summary.monthlyFormatted}
                    </p>
                    <span className="text-xs text-zinc-500 mt-0.5 block">{summary.monthlyText} &bull; {summary.monthLabel}</span>
                  </div>
                </div>

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
                          className="px-3.5 py-1.5 bg-zinc-950 hover:bg-black text-white    rounded-lg text-xs font-bold shadow-xs"
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
                          className="px-3.5 py-1.5 bg-zinc-200 hover:bg-zinc-300   text-zinc-900  rounded-lg text-xs font-bold shadow-xs"
                        >
                          Punch Out (PO)
                        </button>
                      )}
                    </div>
                  </div>
                )}
                {attendance.length === 0 ? (
                  <p className="text-xs text-zinc-500">No attendance punch logs for this employee yet.</p>
                ) : (
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-zinc-200  text-zinc-500 uppercase text-[11px]">
                        <th className="py-2">Date</th>
                        <th className="py-2">Punch In</th>
                        <th className="py-2">Punch Out</th>
                        <th className="py-2">Hours</th>
                        <th className="py-2">Punch Logs</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 ">
                      {attendance.map((a) => (
                        <tr key={a.id}>
                          <td className="py-2.5 font-semibold text-zinc-900 ">{formatDate(a.date)}</td>
                          <td className="py-2.5 font-mono text-zinc-700 ">{formatTime(a.check_in)}</td>
                          <td className="py-2.5 font-mono text-zinc-700 ">{formatTime(a.check_out)}</td>
                          <td className="py-2.5 text-zinc-700 ">{a.working_hours || '-'}</td>
                          <td className="py-2.5 font-mono text-[11px] text-zinc-500">
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
          shifts.length === 0 ? <p className="text-xs text-zinc-500">No shift assignments recorded.</p> : (
            <div className="space-y-2 text-xs">{shifts.map((s) => (
              <div key={s.id} className="p-3 bg-zinc-50  rounded-lg flex justify-between border border-zinc-200 ">
                <span className="font-semibold text-zinc-900 ">{s.shift_name || 'Assigned Shift'}</span>
                <span className="text-zinc-500">Effective: {formatDate(s.effective_from)}</span>
              </div>
            ))}</div>
          )
        ) : activeTab === 'leave' ? (
          leaves.length === 0 ? <p className="text-xs text-zinc-500">No leave requests found.</p> : (
            <div className="space-y-2 text-xs">{leaves.map((l) => (
              <div key={l.id} className="p-3 bg-zinc-50  rounded-lg flex justify-between border border-zinc-200 ">
                <span><strong className="text-zinc-900 ">{l.leave_type_name || 'Leave'}</strong> ({formatDate(l.start_date)} - {formatDate(l.end_date)})</span>
                <Badge variant={l.status === 'APPROVED' ? 'default' : 'neutral'}>{l.status}</Badge>
              </div>
            ))}</div>
          )
        ) : activeTab === 'salary' ? (
          payslips.length === 0 ? <p className="text-xs text-zinc-500">No payslips generated yet.</p> : (
            <div className="space-y-2 text-xs">{payslips.map((p) => (
              <div key={p.id} className="p-3 bg-zinc-50  rounded-lg flex justify-between border border-zinc-200 ">
                <span className="font-semibold text-zinc-900 ">{p.period_display || p.payslip_number}</span>
                <span className="font-bold text-zinc-900 ">{formatINR(p.net_salary || 0)}</span>
              </div>
            ))}</div>
          )
        ) : activeTab === 'advances' ? (
          advances.length === 0 ? <p className="text-xs text-zinc-500">No salary advances or loans.</p> : (
            <div className="space-y-2 text-xs">{advances.map((adv) => (
              <div key={adv.id} className="p-3 bg-zinc-50  rounded-lg flex justify-between border border-zinc-200 ">
                <span className="text-zinc-900 ">{adv.reason || 'Advance'} — {formatINR(adv.amount)}</span>
                <Badge variant="neutral">{adv.status}</Badge>
              </div>
            ))}</div>
          )
        ) : activeTab === 'documents' ? (
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div className="p-3 bg-zinc-50  rounded-lg border border-zinc-200 "><p className="text-[10px] font-bold text-zinc-400 uppercase">PAN Number</p><p className="font-mono font-semibold mt-1 text-zinc-900 ">{employee.pan_number || 'Not provided'}</p></div>
            <div className="p-3 bg-zinc-50  rounded-lg border border-zinc-200 "><p className="text-[10px] font-bold text-zinc-400 uppercase">Aadhaar Number</p><p className="font-mono font-semibold mt-1 text-zinc-900 ">{employee.aadhaar_number || 'Not provided'}</p></div>
          </div>
        ) : activeTab === 'history' ? (
          history.length === 0 ? <p className="text-xs text-zinc-500">No employment history entries.</p> : (
            <div className="space-y-2 text-xs">{history.map((h) => (
              <div key={h.id} className="p-3 bg-zinc-50  rounded-lg flex justify-between border border-zinc-200 ">
                <div><p className="font-bold text-zinc-900 ">{h.change_type}</p><p className="text-zinc-500">{h.notes}</p></div>
                <span className="text-zinc-400">{formatDate(h.effective_date)}</span>
              </div>
            ))}</div>
          )
        ) : (
          /* Settings Tab */
          <div className="space-y-4">
            {editing ? (
              <form onSubmit={handleSaveEdit} className="space-y-3 max-w-md">
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="block text-xs font-semibold mb-1 text-zinc-800 ">First Name</label><input type="text" value={editForm.first_name} onChange={(e) => setEditForm({ ...editForm, first_name: e.target.value })} className="w-full px-3 py-1.5 text-xs border border-zinc-200  rounded-lg bg-white  text-zinc-900 " /></div>
                  <div><label className="block text-xs font-semibold mb-1 text-zinc-800 ">Last Name</label><input type="text" value={editForm.last_name} onChange={(e) => setEditForm({ ...editForm, last_name: e.target.value })} className="w-full px-3 py-1.5 text-xs border border-zinc-200  rounded-lg bg-white  text-zinc-900 " /></div>
                </div>
                <div><label className="block text-xs font-semibold mb-1 text-zinc-800 ">Phone</label><input type="text" value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} className="w-full px-3 py-1.5 text-xs border border-zinc-200  rounded-lg bg-white  text-zinc-900 " /></div>
                <div><label className="block text-xs font-semibold mb-1 text-zinc-800 ">City</label><input type="text" value={editForm.city} onChange={(e) => setEditForm({ ...editForm, city: e.target.value })} className="w-full px-3 py-1.5 text-xs border border-zinc-200  rounded-lg bg-white  text-zinc-900 " /></div>
                <div>
                  <label className="block text-xs font-semibold mb-1 text-zinc-800 ">Date of Birth</label>
                  <input
                    type="date"
                    value={editForm.date_of_birth}
                    onChange={(e) => setEditForm({ ...editForm, date_of_birth: e.target.value })}
                    className={`w-full px-3 py-1.5 text-xs border rounded-lg bg-white text-zinc-900 ${
                      editForm.date_of_birth && getAgeInfo(editForm.date_of_birth).isUnderage
                        ? 'border-rose-400 bg-rose-50/20'
                        : 'border-zinc-200'
                    }`}
                  />
                  {editForm.date_of_birth && (() => {
                    const ageInfo = getAgeInfo(editForm.date_of_birth);
                    return ageInfo.isUnderage ? (
                      <div className="mt-1.5 p-2 rounded-lg bg-rose-50 border border-rose-300 text-rose-900 text-[11px] flex items-start gap-1.5 shadow-xs">
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0 mt-0.5" />
                        <div>
                          <strong className="block font-bold">{ageInfo.label}</strong>
                          <span className="text-rose-700">{ageInfo.text}</span>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-1.5 p-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] flex items-center justify-between">
                        <div className="flex items-center gap-1.5 font-medium">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span>{ageInfo.label}</span>
                        </div>
                        <span className="text-[10px] text-emerald-700 font-bold uppercase tracking-wider">
                          Legal Working Age
                        </span>
                      </div>
                    );
                  })()}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold mb-1 text-zinc-800 ">Salary Type</label>
                    <select
                      value={editForm.salary_type || 'MONTHLY'}
                      onChange={(e) => setEditForm({ ...editForm, salary_type: e.target.value })}
                      className="w-full px-2.5 py-1.5 text-xs border border-zinc-200 rounded-lg bg-white text-zinc-900"
                    >
                      <option value="MONTHLY">Monthly Salary</option>
                      <option value="HOURLY">Hourly Wage</option>
                      <option value="DAILY">Daily Wage</option>
                      <option value="WEEKLY">Weekly Wage</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1 text-zinc-800 ">
                      {editForm.salary_type === 'HOURLY'
                        ? 'Hourly Wage Rate (₹/hr)'
                        : editForm.salary_type === 'DAILY'
                        ? 'Daily Wage Rate (₹/day)'
                        : editForm.salary_type === 'WEEKLY'
                        ? 'Weekly Wage Rate (₹/wk)'
                        : 'Base Monthly Salary (₹)'}
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder={
                        editForm.salary_type === 'HOURLY'
                          ? 'e.g. 250'
                          : editForm.salary_type === 'DAILY'
                          ? 'e.g. 800'
                          : 'e.g. 45000'
                      }
                      value={editForm.base_salary ?? ''}
                      onChange={(e) => setEditForm({ ...editForm, base_salary: e.target.value })}
                      className="w-full px-3 py-1.5 text-xs border border-zinc-200 rounded-lg bg-white text-zinc-900"
                    />
                  </div>
                </div>
                <div className="flex gap-2 pt-2">
                  <button
                    type="submit"
                    disabled={Boolean(editForm.date_of_birth && getAgeInfo(editForm.date_of_birth).isUnderage)}
                    className="px-4 py-1.5 bg-zinc-950 hover:bg-black text-white rounded-lg text-xs font-bold disabled:opacity-50 disabled:cursor-not-allowed shadow-xs"
                  >
                    Save Changes
                  </button>
                  <button type="button" onClick={() => setEditing(false)} className="px-3 py-1.5 bg-zinc-100  text-zinc-700  rounded-lg text-xs font-semibold">Cancel</button>
                </div>
              </form>
            ) : (
              <div className="space-y-6 max-w-xl">
                <div className="flex flex-wrap gap-3">
                  <button onClick={() => setEditing(true)} className="px-4 py-2 bg-zinc-950 hover:bg-black text-white    rounded-lg text-xs font-bold shadow-xs">Edit Employee Profile</button>
                  <button onClick={handleToggleStatus} className={`px-4 py-2 rounded-lg text-xs font-semibold border ${employee.status === 'ACTIVE' ? 'bg-zinc-100 text-zinc-700 border-zinc-300   ' : 'bg-zinc-950 text-white  '}`}>
                    {employee.status === 'ACTIVE' ? 'Deactivate Employee' : 'Activate Employee'}
                  </button>
                </div>

                {/* Danger Zone: Permanent Employee Removal */}
                {(isOwner || isHR) && (
                  <div className="border border-rose-200 bg-rose-50/50 rounded-xl p-4 space-y-2">
                    <h4 className="text-xs font-bold text-rose-900 uppercase tracking-wider flex items-center gap-1.5">
                      <Trash2 className="w-4 h-4 text-rose-600" />
                      <span>Danger Zone — Remove Employee</span>
                    </h4>
                    <p className="text-xs text-rose-700 leading-relaxed">
                      Permanently remove this employee from your company workspace. This action removes their profile, shifts, and directory entries.
                    </p>
                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={handleDeleteEmployee}
                        className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Permanently Remove Employee</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

