import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowUpRight, Building2, CalendarCheck2, CalendarDays, CalendarMinus, ChartNoAxesColumnIncreasing,
  ChevronRight, ClipboardList, Download, FileText, Landmark, Leaf, ListFilter,
  UserPlus, Users, Wallet, LogIn, LogOut,
} from 'lucide-react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { EmployeeOverview } from '../components/dashboard/EmployeeOverview';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Pagination } from '../components/ui/Pagination';
import { formatDate } from '../utils/formatters';

const PAGE_SIZE = 8;
const panel = 'rounded-2xl border border-zinc-200 bg-white shadow-xs';
const metrics = [
  { key: 'active', label: 'Active employees', detail: 'Current workforce', icon: Users, color: 'bg-[#e3eddf] text-[#355a39]' },
  { key: 'present', label: 'Present today', detail: 'Includes half days', icon: CalendarCheck2, color: 'bg-[#fbecd6] text-[#946920]' },
  { key: 'absent', label: 'Absent today', detail: 'Excludes employees on leave', icon: CalendarMinus, color: 'bg-[#eee7f3] text-[#715a85]' },
  { key: 'on_leave', label: 'On leave today', detail: 'Paid and unpaid leave', icon: Leaf, color: 'bg-[#e0eee7] text-[#387660]' },
];
const fieldClass = 'rounded-lg border border-zinc-200 bg-white px-2.5 py-2 text-xs font-medium text-zinc-800';
const errorText = (error) => error?.response?.data?.error?.message || 'Could not load this report. Please try again.';

function EmployeeName({ row }) {
  const initials = row.employee.split(/\s+/).slice(0, 2).map((part) => part.charAt(0)).join('');
  return <div className="flex items-center gap-2.5">
    <span aria-hidden="true" className="hidden sm:grid place-items-center w-8 h-8 shrink-0 rounded-full bg-[#eaf0e6] text-[#416146] text-[11px] font-bold">{initials}</span>
    <div><div className="font-semibold text-zinc-900">{row.employee}</div><div className="text-[10px] text-zinc-500 mt-0.5">{row.employee_code}</div></div>
  </div>;
}

function EmployeeReport({ group, branch, scopeName, onClose }) {
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const isBank = group === 'bank';
  useEffect(() => {
    const controller = new AbortController();
    setData(null);
    setError('');
    api.get(isBank ? '/reports/bank-details/' : '/reports/workforce/', {
      params: { branch: branch || undefined, group: isBank ? undefined : group, page, page_size: PAGE_SIZE },
      signal: controller.signal,
    }).then(res => setData(res.data)).catch(err => {
      if (!controller.signal.aborted) setError(errorText(err));
    });
    return () => controller.abort();
  }, [page, group, branch, isBank]);

  return <Modal isOpen onClose={onClose} title={isBank ? 'Employee bank details' : metrics.find(m => m.key === group).label}
    subtitle={scopeName} maxWidth="max-w-2xl">
    {error ? <p role="alert">{error}</p> : !data ? <p role="status">Loading employees…</p> : !data.count ? <p>No matching employees.</p> :
      <><div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-zinc-50 text-zinc-600"><tr>
            {(isBank ? ['Employee', 'Bank', 'Account number', 'IFSC'] : ['Employee', 'Branch']).map(t => <th key={t} className="p-3">{t}</th>)}
          </tr></thead>
          <tbody className="divide-y divide-zinc-100">{data.results.map(row => <tr key={row.id}>
            <td className="p-3"><EmployeeName row={row} /></td>
            {isBank ? <><td className="p-3">{row.bank_name || 'Missing'}</td><td className="p-3">{row.bank_account_number || 'Missing'}</td><td className="p-3">{row.bank_ifsc_code || 'Missing'}</td></> :
              <td className="p-3">{row.branch || 'Unassigned'}</td>}
          </tr>)}</tbody>
        </table>
      </div><Pagination currentPage={page} totalPages={Math.ceil(data.count / PAGE_SIZE)} totalItems={data.count} pageSize={PAGE_SIZE} onPageChange={setPage} /></>}
  </Modal>;
}

function SelfPunch({ businessId }) {
  const { user } = useAuth();
  const { toast } = useNotification();
  const [working, setWorking] = useState(false);
  const [pending, setPending] = useState(true);
  const [available, setAvailable] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    api.get('/attendance/', { params: { own: 'true', page_size: 1 }, signal: controller.signal })
      .then(res => {
        const record = res.data.results?.[0];
        setWorking(Boolean(record?.check_in && !record.check_out));
        setAvailable(true);
      })
      .catch(() => {})
      .finally(() => { if (!controller.signal.aborted) setPending(false); });
    return () => controller.abort();
  }, [businessId, user.id]);
  const punch = async () => {
    setPending(true);
    try {
      await api.post(working ? '/attendance/check-out/' : '/attendance/check-in/', {});
      setWorking(!working);
      toast.success(working ? 'Punched out.' : 'Punched in.');
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Could not record your punch.');
    } finally {
      setPending(false);
    }
  };
  if (!available) return null;
  return <Button onClick={punch} disabled={pending} leftIcon={working ? LogOut : LogIn}>{working ? 'End Work' : 'Start Work'}</Button>;
}

function DashboardContent() {
  const { user, business, hasPermission, activeRole } = useAuth();
  const personal = ['EMPLOYEE', 'FIELD_EMPLOYEE'].includes(activeRole);
  const { toast } = useNotification();
  const [branch, setBranch] = useState('');
  const [branches, setBranches] = useState([]);
  const [dates, setDates] = useState({ date_from: '', date_to: '' });
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const [downloading, setDownloading] = useState(false);
  const [group, setGroup] = useState('');
  const canReport = hasPermission('attendance.view_reports');
  const canBank = hasPermission('employee.view_bank');
  const scopeName = branches.find(b => b.id === branch)?.name || business?.name || 'Your company';
  const requestKey = JSON.stringify([branch, dates, page, retry]);
  const current = data?.key === requestKey ? data : null;
  const invalidDates = dates.date_from && dates.date_to && dates.date_from > dates.date_to;
  const params = { branch: branch || undefined, date_from: dates.date_from || undefined, date_to: dates.date_to || undefined };

  useEffect(() => {
    if (!canReport || invalidDates) return;
    const controller = new AbortController();
    setError('');
    api.get('/reports/punches/', { params: { ...params, page, page_size: PAGE_SIZE }, signal: controller.signal })
      .then(res => {
        if (controller.signal.aborted) return;
        setData({ ...res.data.data, key: requestKey });
        setBranches(res.data.data.branches);
      })
      .catch(err => { if (!controller.signal.aborted) setError(errorText(err)); });
    return () => controller.abort();
  }, [requestKey, canReport, invalidDates]);

  useEffect(() => {
    if (canReport || !canBank) return;
    const controller = new AbortController();
    api.get('/reports/bank-details/', { params: { page_size: 1, branches_only: 'true' }, signal: controller.signal })
      .then(res => setBranches(res.data.branches || [])).catch(() => {});
    return () => controller.abort();
  }, [canReport, canBank]);

  const download = async () => {
    setDownloading(true);
    try {
      const res = await api.get('/reports/punches/', { params: { ...params, download: 'csv' }, responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Punch report - ${scopeName}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      toast.error('Could not download the punch report. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  const selectedDate = (field, value) => {
    setDates(prev => ({ ...prev, [field]: value }));
    setPage(1);
  };
  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const actions = [
    { label: 'Add employee', path: '/employees?action=add', icon: UserPlus, permission: 'employee.create' },
    { label: hasPermission('attendance.mark') ? 'Mark attendance' : 'View attendance', path: branch ? `/attendance?branch=${branch}` : '/attendance', icon: CalendarCheck2, permission: 'attendance.view' },
    { label: 'Apply for leave', path: '/leaves', icon: Leaf, permission: 'leave.apply' },
    { label: 'View reports', path: '/reports', icon: FileText, permission: 'report.view' },
    { label: 'View payslips', path: '/payroll', icon: Wallet, permission: 'payroll.view_own' },
  ].filter(item => hasPermission(item.permission));

  return <div className="space-y-5">
    <section className="dashboard-welcome relative flex flex-wrap items-center justify-between gap-4 py-4 sm:py-7">
      <div className="relative z-[1]">
        <p className="flex items-center gap-1.5 text-xs font-medium text-zinc-600 mb-2"><CalendarDays size={14} />
          {now.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
        <h1 className="text-3xl sm:text-[2.5rem] text-zinc-950 leading-tight">{greeting}, {user?.first_name || user?.full_name || 'there'}!</h1>
        <p className="mt-2 text-sm text-zinc-600">{personal ? business?.name : `Here’s your overview for ${business?.name || 'your company'}.`}</p>
      </div>
      {!personal && hasPermission('attendance.mark_own') && !canReport && <SelfPunch businessId={business?.id} />}
      {(canReport || canBank) && <label className="relative z-[1] inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-zinc-700 shadow-xs">
        <Building2 size={15} /><select aria-label="Dashboard branch" value={branch}
          onChange={e => { setBranch(e.target.value); setPage(1); setGroup(''); }}
          className="bg-white text-xs font-semibold py-1 pr-1 max-w-44"><option value="">All branches</option>
          {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
      </label>}
    </section>

    {personal && <EmployeeOverview />}
    {canReport && <>
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-2.5 sm:gap-3.5">
        {metrics.map(({ key, label, detail, icon: Icon, color }) => <button key={key} disabled={!current} onClick={() => setGroup(key)}
          className={`${panel} group flex items-center gap-2.5 p-3.5 sm:p-4 text-left transition-colors hover:border-[#98b299]`}>
          <span className={`grid place-items-center rounded-2xl h-10 w-10 sm:h-12 sm:w-12 shrink-0 ${color}`}><Icon size={21} /></span>
          <span className="min-w-0"><strong className="block text-[24px] leading-tight font-semibold tabular-nums text-zinc-950">{current?.totals[key] ?? '—'}</strong>
            <span className="block text-xs leading-tight text-zinc-700">{label}</span><span className="sr-only">{detail}</span></span>
          <ChevronRight size={13} className="ml-auto hidden sm:block text-zinc-400 group-hover:text-zinc-900" />
        </button>)}
      </div>

      <section id="punch-report" className={`${panel} overflow-hidden`} aria-labelledby="punch-heading" aria-busy={!current && !error && !invalidDates}>
        <div className="flex flex-wrap justify-between items-center gap-3 p-4 sm:px-5">
          <div><h2 id="punch-heading" className="flex items-center gap-2 text-base font-bold text-zinc-950"><ClipboardList size={19} />Punch In / Punch Out</h2>
            <p className="mt-1 text-xs text-zinc-500">{scopeName}{current && ` · ${current.count} attendance ${current.count === 1 ? 'record' : 'records'} · ${current.timezone}`}</p></div>
          <Button size="sm" leftIcon={Download} onClick={download} disabled={!current || downloading || invalidDates}>{downloading ? 'Downloading…' : 'Download CSV'}</Button>
        </div>
        <div className="px-4 pb-4 sm:px-5 flex items-end flex-wrap gap-2">
          <ListFilter size={15} className="hidden sm:block text-zinc-500 mb-2.5" />
          {[['From', 'date_from'], ['To', 'date_to']].map(([label, field]) => <label key={field} className="flex flex-wrap items-center gap-1.5 text-xs text-zinc-600">
            {label}<input type="date" aria-label={`Attendance date ${label.toLowerCase()}`} className={`${fieldClass} max-w-[142px]`} value={dates[field]} onChange={e => selectedDate(field, e.target.value)} />
          </label>)}
          {(dates.date_from || dates.date_to) && <Button size="xs" variant="ghost" onClick={() => { setPage(1); setDates({ date_from: '', date_to: '' }); }}>Clear dates</Button>}
        </div>
        {invalidDates ? <p role="alert" className="p-6 text-sm">Choose an end date on or after the start date.</p> :
          error ? <div role="alert" className="p-6 text-sm">{error} <Button size="xs" variant="outline" onClick={() => setRetry(v => v + 1)}>Retry</Button></div> :
          !current ? <p role="status" className="p-8 text-center text-xs text-zinc-500">Loading attendance…</p> :
          !current.count ? <p className="p-8 text-center text-sm text-zinc-600">No attendance records for this selection.</p> :
          <><div className="overflow-x-auto"><table className="w-full text-left text-xs">
            <thead className="bg-zinc-50 border-y border-zinc-100 text-zinc-600"><tr>
              {['Employee', 'Attendance date', 'Punch in', 'Punch out'].map(col => <th key={col} scope="col" className="py-2.5 px-3 sm:px-5 font-semibold">{col}</th>)}
            </tr></thead>
            <tbody className="divide-y divide-zinc-100">{current.results.map(row => <tr key={row.id} className="hover:bg-zinc-50">
              <td className="py-2.5 px-3 sm:px-5"><EmployeeName row={row} /></td>
              <td className="py-2.5 px-3 sm:px-5 whitespace-nowrap text-zinc-700">{formatDate(row.date + 'T12:00:00')}</td>
              {[row.check_in, row.check_out].map((time, i) => <td key={i} className="py-2.5 px-3 sm:px-5">
                {time ? <span className="font-medium text-zinc-900 tabular-nums">{time}</span> :
                  <span className="inline-flex rounded-md bg-[#fbf0da] px-1.5 py-1 text-[10px] font-semibold text-[#78571b]">Missing punch</span>}
              </td>)}
            </tr>)}</tbody>
          </table></div>
          <Pagination currentPage={page} totalPages={Math.ceil(current.count / PAGE_SIZE)} totalItems={current.count} pageSize={PAGE_SIZE} onPageChange={setPage} /></>}
      </section>
    </>}

    <div className={canReport ? 'grid grid-cols-1 lg:grid-cols-[1.45fr_1fr] gap-4' : ''}>
      {canReport && <section className={`${panel} p-4 sm:p-5`}>
        <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-sm font-bold flex items-center gap-2"><ChartNoAxesColumnIncreasing size={17} />Attendance trend</h2><span className="text-xs text-zinc-500">Present · last 7 days</span></div>
        <div className="h-40 mt-3">
          {current && <ResponsiveContainer width="100%" height="100%"><AreaChart data={current.trend} margin={{ top: 6, right: 12, bottom: 0, left: -25 }}>
            <defs><linearGradient id="attendance-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#88a58b" stopOpacity={0.40} /><stop offset="1" stopColor="#88a58b" stopOpacity={0.04} /></linearGradient></defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e0e5dc" /><XAxis dataKey="date" tickFormatter={value => new Date(value + 'T12:00:00').toLocaleDateString('en-IN', { weekday: 'short' })} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis allowDecimals={false} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} /><Tooltip />
            <Area name="Present" dataKey="present" type="monotone" stroke="#406944" strokeWidth={2} dot={{ r: 3 }} fill="url(#attendance-fill)" isAnimationActive={false} />
          </AreaChart></ResponsiveContainer>}
        </div>
      </section>}
      {(actions.length > 0 || canBank) && <section className={`${panel} p-4 sm:p-5`}>
        <h2 className="text-sm font-bold flex items-center gap-2"><ArrowUpRight size={17} />Quick actions</h2>
        <div className="grid grid-cols-2 gap-2 mt-4">
          {actions.map(({ label, path, icon: Icon }) => <Link key={label} to={path} className="flex items-center gap-2 rounded-xl bg-zinc-50 hover:bg-zinc-100 p-3 text-xs font-semibold text-zinc-800"><Icon size={16} />{label}</Link>)}
          {canBank && <button type="button" onClick={() => setGroup('bank')} className="flex items-center gap-2 rounded-xl bg-zinc-50 hover:bg-zinc-100 p-3 text-xs font-semibold text-left text-zinc-800"><Landmark size={16} />Employee bank details</button>}
        </div>
      </section>}
    </div>
    {group && <EmployeeReport key={`${group}-${branch}`} group={group} branch={branch} scopeName={scopeName} onClose={() => setGroup('')} />}
  </div>;
}

export function Dashboard() {
  const { business, user } = useAuth();
  return <DashboardContent key={`${user?.id}-${business?.id}`} />;
}
