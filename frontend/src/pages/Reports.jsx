import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, CalendarClock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { PageHeader } from '../components/layout/PageHeader';
import { Card, CardContent, Loader } from '../components/ui';
import { formatINR } from '../utils/formatters';
import api from '../api/client';

export const Reports = () => {
  const { business, hasPermission } = useAuth();
  const [report, setReport] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    setReport(null);
    setError(false);
    if (!hasPermission('report.view')) return;
    api.get('/reports/overview/', { signal: controller.signal })
      .then(({ data }) => setReport(data.data))
      .catch(() => { if (!controller.signal.aborted) setError(true); });
    return () => controller.abort();
  }, [business?.id]);

  const metrics = report ? [
    ['Active employees', report.active_employees],
    ['Branches', report.branches_count],
    ['Departments', report.departments_count],
  ] : [];
  if (report?.financials?.monthly_payroll_total != null) {
    metrics.push(['Latest payroll', formatINR(report.financials.monthly_payroll_total)]);
  }
  if (report?.financials?.monthly_expenses_total != null) {
    metrics.push(['Expenses this month', formatINR(report.financials.monthly_expenses_total)]);
  }

  return (
    <div className="space-y-5">
      <PageHeader title="Reports" subtitle={business?.name} />
      {hasPermission('report.view') && (error ? <p role="alert">Unable to load the company report.</p> : !report ? (
        <Loader message="Loading company report…" />
      ) : (
        <dl className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          {metrics.map(([label, value]) => (
            <div key={label} className="p-5 bg-white border border-zinc-200 rounded-xl">
              <dt className="text-sm font-medium text-zinc-600">{label}</dt>
              <dd className="mt-2 text-2xl text-zinc-950 font-semibold tabular-nums">{value}</dd>
            </div>
          ))}
        </dl>
      ))}
      {hasPermission('employee.view_bank') && !hasPermission('attendance.view_reports') && (
        <Link to="/" className="block rounded-xl bg-white border border-zinc-200 p-4 font-semibold">View employee bank details on the dashboard</Link>
      )}
      {hasPermission('attendance.view_reports') && (
        <Card>
          <CardContent>
            <Link to="/#punch-report" className="flex gap-4 items-center group">
              <span className="rounded-xl bg-brand-100 text-brand-800 p-3"><CalendarClock size={20} /></span>
              <div className="flex-1">
                <h2 className="font-semibold text-zinc-950">Punch In / Punch Out report</h2>
                <p className="text-sm text-zinc-600">View attendance by branch and date, or download the matching records.</p>
              </div>
              <ArrowUpRight className="text-brand-700" size={19} />
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
