import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, CalendarDays, Clock3, FileText, Leaf, LogIn, LogOut, MapPin, Timer } from 'lucide-react';
import api from '../../api/client';
import { useNotification } from '../../context/NotificationContext';

const card = 'rounded-2xl border border-zinc-200 bg-white p-5 sm:p-6';
const timeText = (stamp, zone) => stamp
  ? new Date(stamp).toLocaleTimeString('en-IN', { timeZone: zone, hour: 'numeric', minute: '2-digit' })
  : '—';
const dateText = day => new Date(day + 'T12:00:00').toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });

function CardHeading({ icon: Icon, title, to, link }) {
  return <div className="mb-4 flex items-center justify-between gap-2">
    <h2 className="flex items-center gap-2 font-semibold text-zinc-950"><Icon size={18} />{title}</h2>
    {to && <Link to={to} aria-label={link} title={link} className="rounded-lg p-2 text-brand-700 hover:bg-brand-50"><ArrowUpRight size={16} /></Link>}
  </div>;
}

export function EmployeeOverview() {
  const [data, setData] = useState(null);
  const [version, refresh] = useState(0);
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);
  const { toast } = useNotification();
  useEffect(() => {
    const controller = new AbortController();
    setError(false);
    api.get('/reports/me/', { signal: controller.signal })
      .then(response => { if (!controller.signal.aborted) setData(response.data.data); })
      .catch(() => { if (!controller.signal.aborted) setError(true); });
    return () => controller.abort();
  }, [version]);
  useEffect(() => {
    const update = () => refresh(v => v + 1);
    window.addEventListener('focus', update);
    return () => window.removeEventListener('focus', update);
  }, []);
  if (error) return <section role="alert" className={card}>Your work details couldn’t load. <button className="font-semibold underline" onClick={() => refresh(v => v + 1)}>Try again</button></section>;
  if (!data) return <p role="status" className={card}>Loading your workday…</p>;
  if (!data.linked) return <section className={card}><h2 className="font-semibold">Employee profile awaiting connection</h2><p className="mt-2 text-sm text-zinc-600">Ask your HR team to link your account to your employee record in this company.</p></section>;

  const current = data.attendance?.current;
  const working = Boolean(current?.in && !current.out);
  const finished = Boolean(current?.out);
  const shift = data.shift;
  const punch = async () => {
    setBusy(true);
    try {
      await api.post(working ? '/attendance/check-out/' : '/attendance/check-in/', {});
      setData(null);
      toast.success(working ? 'Punch-out recorded.' : 'Punch-in recorded.');
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Could not record your punch.');
    } finally {
      refresh(v => v + 1);
      setBusy(false);
    }
  };
  return <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
    <div className="min-w-0 space-y-4">
      {data.attendance && <section className="rounded-2xl bg-[#214b38] p-5 text-white sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-[#dce9dc]"><Clock3 size={17} />My workday</h2>
          {data.branch && <span className="flex items-center gap-1 text-xs text-[#dce9dc]"><MapPin size={13} />{data.branch}</span>}
        </div>
        <div className="my-5 flex flex-wrap items-center justify-between gap-3">
          <p className="font-serif text-3xl">{working ? 'Clocked in' : finished ? 'Clocked out' : current?.status || 'No punch yet'}</p>
          {data.can_punch && !finished && <button type="button" disabled={busy} onClick={punch}
            className="flex items-center gap-2 rounded-lg bg-[#e7eedc] px-4 py-2 text-sm font-semibold text-[#173f2d] hover:bg-white disabled:opacity-60">
            {working ? <LogOut size={16} /> : <LogIn size={16} />}{working ? 'End work' : 'Start work'}
          </button>}
        </div>
        <dl className="grid grid-cols-3 gap-2 border-t border-white/20 pt-4 text-sm">
          {[[current && current.date !== data.today ? 'Prior-day punch-in' : 'Punch in', timeText(current?.in, data.timezone)],
            ['Punch out', timeText(current?.out, data.timezone)], ['Recorded hours', current?.hours != null ? Number(current.hours) + ' h' : '—']].map(([title,value]) =>
            <div key={title}><dt className="text-xs text-[#c9dcca]">{title}</dt><dd className="mt-1.5 font-semibold tabular-nums">{value}</dd></div>)}
        </dl>
      </section>}
      {data.attendance && <section className={card}>
        <CardHeading icon={CalendarDays} title="My recent attendance" to="/attendance" link="View attendance history" />
        {data.attendance.recent.length ? <div className="overflow-x-auto"><table className="w-full text-left text-xs sm:text-sm">
          <thead className="border-b border-zinc-200 text-zinc-600"><tr>{['Date', 'Status', 'In', 'Out'].map(label => <th scope="col" key={label} className="py-2 pr-2 font-medium">{label}</th>)}</tr></thead>
          <tbody className="divide-y divide-zinc-100">{data.attendance.recent.map(row => <tr key={row.date}>
            <th scope="row" className="py-3 pr-2 font-medium">{dateText(row.date)}</th>
            <td className="pr-2"><span className="rounded-md bg-zinc-100 px-1.5 py-1 text-xs text-zinc-800">{row.status}</span></td>
            <td className="pr-2 tabular-nums">{timeText(row.in, data.timezone)}</td><td className="tabular-nums">{timeText(row.out, data.timezone)}</td>
          </tr>)}</tbody>
        </table></div> : <p className="text-sm text-zinc-600">Your attendance history will appear here after your first record.</p>}
      </section>}
    </div>
    <div className="min-w-0 space-y-4">
      {'shift' in data && <section className={card + ' bg-[#f0f3e9]'}>
        <CardHeading icon={Timer} title="My assigned shift" to="/shifts" link="View work schedule" />
        {shift ? <><p className="font-serif text-2xl text-zinc-950">{shift.name}</p><p className="mt-2 text-sm font-medium">{shift.start.slice(0,5)} – {shift.end.slice(0,5)}{shift.overnight && ' (+1 day)'}</p><p className="mt-1 text-xs text-zinc-600">{shift.type} · {data.timezone}</p></> : <p className="text-sm text-zinc-600">No current shift assigned.</p>}
      </section>}
      {data.leave && <section className={card}><CardHeading icon={Leaf} title="My leave balance" to="/leaves" link="View my leave" />
        {data.leave.length ? <dl className="divide-y divide-zinc-100">{data.leave.map(item => <div key={item.name} className="flex justify-between gap-2 py-2 text-sm"><dt>{item.name}</dt><dd className="font-semibold tabular-nums">{Number(item.available)} days</dd></div>)}</dl> : <p className="text-sm text-zinc-600">No leave balance allocated for this year.</p>}
      </section>}
      {'payslip' in data && <section className={card}><CardHeading icon={FileText} title="Latest payslip" to="/payroll" link="View my payslips" />
        {data.payslip ? <><p className="font-semibold">{data.payslip.period}</p><p className="mt-1 text-xs text-zinc-600">{data.payslip.number}</p></> : <p className="text-sm text-zinc-600">Your payslip will appear here when payroll issues it.</p>}
      </section>}
    </div>
  </div>;
}
