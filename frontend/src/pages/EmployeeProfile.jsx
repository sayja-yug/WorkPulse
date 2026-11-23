import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api/client';
import { usePermissions } from '../hooks/usePermissions';
import { useNotification } from '../context/NotificationContext';
import {
  ArrowLeft,
  Briefcase,
  CalendarCheck2,
  Clock,
  Calendar,
  CalendarOff,
  Banknote,
  HandCoins,
  FileText,
  History,
  Pencil,
  UserMinus,
  LayoutDashboard,

} from 'lucide-react';
import { OnboardingProgress } from '../components/employees/OnboardingProgress';
import { Modal } from '../components/ui/Modal';
import { Loader } from '../components/ui/Loader';
import { Badge } from '../components/ui/Badge';
import { formatDate, formatINR, formatTime, getAgeInfo } from '../utils/formatters';
import { calculateWorkHoursSummary } from '../utils/workHours';
const profileFields = [
  ['first_name', 'First name', 'text'], ['last_name', 'Last name', 'text'], ['email', 'Email', 'email'],
  ['phone', 'Phone', 'tel'], ['joining_date', 'Joining date', 'date'], ['date_of_birth', 'Date of birth', 'date'],
  ['gender', 'Gender', 'select'], ['city', 'City', 'text'], ['address', 'Address', 'text'],
  ['salary_type', 'Salary type', 'select'], ['base_salary', 'Base salary', 'number'],
];

const choices = {
  gender: [['PREFER_NOT_TO_SAY', 'Prefer not to say'], ['FEMALE', 'Female'], ['MALE', 'Male'], ['OTHER', 'Other']],
  salary_type: [['MONTHLY', 'Monthly'], ['WEEKLY', 'Weekly'], ['DAILY', 'Daily'], ['HOURLY', 'Hourly']],
};

function InformationCard({ title, rows }) {
  return (
    <section className="bg-white rounded-2xl border border-zinc-200 p-5 sm:p-6">
      <h3 className="text-base font-semibold text-zinc-950 mb-4">{title}</h3>
      <dl className="grid grid-cols-1 min-[400px]:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4">
        {rows.map(([label, value]) => (
          <div key={label} className="min-w-0">
            <dt className="text-xs font-medium text-zinc-500">{label}</dt>
            <dd className="mt-1 text-sm font-medium text-zinc-900 break-words">{value || '—'}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}


export const EmployeeProfile = () => {
  const { id } = useParams();
  const { hasPermission } = usePermissions();
  const canEdit = hasPermission('employee.update');
  const canChangeStatus = hasPermission('employee.deactivate');
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
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);

  const fetchEmployee = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/employees/${id}/`);
      const emp = res.data?.data || res.data;
      setEmployee(emp);
    } catch (err) {
      setEmployee(null);
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
    const isActivating = ['INACTIVE', 'TERMINATED', 'ABSCONDING'].includes(employee.status);
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
      setSaving(true);
      const payload = Object.fromEntries(Object.entries(editForm).filter(
        ([key, value]) => value !== (employee[key] ?? '')
      ));
      if (payload.date_of_birth === '') payload.date_of_birth = null;
      await api.patch(`/employees/${id}/`, payload);
      setEditing(false);
      await fetchEmployee();
      toast.success('Employee updated.');
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Failed to update employee');
    } finally {
      setSaving(false);
    }
  };

  const openEditor = () => {
    setEditForm(Object.fromEntries(profileFields.map(([field]) => [field, employee[field] ?? ''])));
    setEditing(true);
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
    { id: 'employment', label: 'Employment Details', icon: Briefcase },
    ...(hasPermission('attendance.view') ? [{ id: 'attendance', label: 'Attendance', icon: CalendarCheck2 }] : []),
    ...(hasPermission('shift.view') ? [{ id: 'shifts', label: 'Shifts', icon: Clock }] : []),
    ...(hasPermission('leave.view') ? [{ id: 'leave', label: 'Leave', icon: CalendarOff }] : []),
    ...(hasPermission('payroll.view') ? [{ id: 'salary', label: 'Salary', icon: Banknote }] : []),
    ...(hasPermission('advance.view') ? [{ id: 'advances', label: 'Advances', icon: HandCoins }] : []),
    { id: 'documents', label: 'Documents', icon: FileText },
    { id: 'history', label: 'Activity History', icon: History },
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
            <div className="flex flex-wrap items-center gap-2.5">
              <h2 className="text-xl font-bold text-zinc-950">
                {employee.full_name || `${employee.first_name} ${employee.last_name}`}
              </h2>
              <Badge variant={employee.status === 'ACTIVE' ? 'success' : 'neutral'}>
                {employee.deactivated_on ? 'Deactivated' : employee.status.replaceAll('_', ' ')}
              </Badge>
            </div>
            <p className="text-xs text-zinc-500 mt-0.5">
              <span className="font-mono font-semibold text-zinc-900">{employee.employee_code}</span> &bull;{' '}
              {[employee.designation_name, employee.department_name, employee.branch_name].filter(Boolean).join(' · ') || 'Employee'}
            </p>
          </div>
        </div>

        {/* Profile Header Actions */}
        <div className="flex items-center gap-2">
          {canEdit && (
            <button type="button" onClick={openEditor} className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-950 text-white rounded-lg text-sm font-semibold">
              <Pencil className="w-4 h-4" /> Edit
            </button>
          )}
          {canChangeStatus && (
            <button type="button" onClick={handleToggleStatus} className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-zinc-200 rounded-lg text-sm font-semibold">
              <UserMinus className="w-4 h-4" /> {['INACTIVE', 'TERMINATED', 'ABSCONDING'].includes(employee.status) ? 'Activate' : 'Deactivate'}
            </button>
          )}
        </div>
      </div>

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
      <div className={activeTab === 'overview' ? '' : 'bg-white rounded-xl border border-slate-200 shadow-sm p-4 sm:p-6 overflow-x-auto'}>
        {tabLoading ? (
          <Loader message="Loading tab data..." />
        ) : activeTab === 'overview' ? (
          <div className="space-y-4">
            <InformationCard title="Basic Information" rows={[
              ['Employee code', employee.employee_code], ['Email', employee.email], ['Phone', employee.phone],
              ['Joining Date', formatDate(employee.joining_date)], ['Time with the company', employee.tenure],
              ['Employment type', employee.employment_type?.replaceAll('_', ' ')],
              ['Branch', employee.branch_name], ['Department', employee.department_name], ['Designation', employee.designation_name],
            ]} />
            <InformationCard title="Personal Details" rows={[
              ['First name', employee.first_name], ['Last name', employee.last_name],
              ['Gender', choices.gender.find(([code]) => code === employee.gender)?.[1]],
              ['Date of birth', employee.date_of_birth && formatDate(employee.date_of_birth)],
              ['Age', employee.age != null && `${employee.age} years`],
              ['City', employee.city], ['Address', employee.address],
            ]} />
            <OnboardingProgress steps={employee.onboarding_progress} />
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

                {hasPermission('attendance.mark') && !employee.deactivated_on && (
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
        ) : null}
      </div>
      {canEdit && (
        <Modal isOpen={editing} onClose={() => setEditing(false)} title="Edit employee">
          <form onSubmit={handleSaveEdit} className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-2">
              {profileFields.map(([name, label, type]) => (
                <label key={name} className="text-xs font-medium text-zinc-700">
                  {label}
                  {type === 'select' ? (
                    <select value={editForm[name] ?? ''} onChange={(e) => setEditForm({ ...editForm, [name]: e.target.value })}
                      className="mt-1 block w-full bg-white rounded-lg px-3 py-2 border border-zinc-200">
                      {choices[name].map(([value, text]) => <option key={value} value={value}>{text}</option>)}
                    </select>
                  ) : (
                    <input type={type} required={name === 'first_name' || name === 'joining_date'}
                      min={type === 'number' ? '0' : undefined} step={type === 'number' ? '0.01' : undefined}
                      value={editForm[name] ?? ''} onChange={(e) => setEditForm({ ...editForm, [name]: e.target.value })}
                      className="mt-1 block w-full bg-white rounded-lg px-3 py-2 border border-zinc-200" />
                  )}
                </label>
              ))}
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setEditing(false)} className="px-4 py-2 border border-zinc-200 rounded-lg text-sm">Cancel</button>
              <button disabled={saving} className="px-4 py-2 bg-zinc-950 text-white rounded-lg text-sm font-semibold">Save Changes</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
