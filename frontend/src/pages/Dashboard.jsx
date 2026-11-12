import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { usePermissions } from '../hooks/usePermissions';
import api from '../api/client';
import {
  Users,
  CalendarCheck2,
  AlertCircle,
  Banknote,
  Receipt,
  TrendingUp,
  Building,
  Clock,
  CheckCircle2,
  Calendar,
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { formatINR, formatTime } from '../utils/formatters';
import { Loader } from '../components/ui/Loader';

export const Dashboard = () => {
  const { user, business, activeRole } = useAuth();
  const {
    isEmployee,
    isHR,
    isAccountant,
    isAuditor,
    isOwner,
    canManageEmployees,
  } = usePermissions();

  const [stats, setStats] = useState(null);
  const [weeklyData, setWeeklyData] = useState([]);
  const [todayRecord, setTodayRecord] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const [overviewRes, attReportRes, attListRes] = await Promise.allSettled([
          api.get('/reports/overview/'),
          api.get('/reports/attendance/'),
          api.get('/attendance/'),
        ]);

        if (overviewRes.status === 'fulfilled') {
          setStats(overviewRes.value.data?.data || null);
        }

        if (attReportRes.status === 'fulfilled') {
          const timeline = attReportRes.value.data?.data?.timeline || [];
          const grouped = {};
          timeline.forEach((item) => {
            const d = item.date;
            if (!grouped[d]) grouped[d] = { day: d.slice(5), present: 0, absent: 0 };
            if (item.status === 'PRESENT') grouped[d].present += item.count;
            else grouped[d].absent += item.count;
          });
          setWeeklyData(Object.values(grouped).slice(-7));
        }

        if (attListRes.status === 'fulfilled') {
          const list = attListRes.value.data?.data || attListRes.value.data?.results || [];
          const todayStr = new Date().toISOString().split('T')[0];
          const found = Array.isArray(list) ? list.find((r) => r.date === todayStr) : null;
          setTodayRecord(found || null);
        }
      } catch (err) {
        console.error('Failed to load dashboard data', err);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardData();
  }, [business?.id, activeRole]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-500">
        <Loader message="Loading dashboard telemetry..." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-indigo-700 via-indigo-600 to-indigo-800 rounded-2xl p-6 text-white shadow-lg shadow-indigo-600/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            <span className="text-[11px] font-semibold px-2.5 py-0.5 bg-indigo-500/40 rounded-full border border-indigo-300/30 uppercase tracking-wide">
              {activeRole.replace('_', ' ')}
            </span>
            <span className="text-xs text-indigo-100 font-medium">
              {business?.name || 'No Company Selected'}
            </span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight">Welcome back, {user?.full_name}!</h2>
          <p className="text-indigo-100 text-xs mt-1">
            {isEmployee
              ? 'View your daily punch-in/out logs, shift timings, and payslips.'
              : isAuditor
              ? 'Read-only compliance overview and financial audit records.'
              : 'Live workforce punch activity, leaves, and operational metrics.'}
          </p>
        </div>

        {/* Role-specific Quick Actions */}
        <div className="flex flex-wrap gap-2">
          {isEmployee && (
            <>
              <Link
                to="/attendance"
                className="px-4 py-2 bg-white text-indigo-700 rounded-lg text-xs font-bold hover:bg-indigo-50 shadow-sm transition-colors"
              >
                Punch In / Out
              </Link>
              <Link
                to="/payroll"
                className="px-4 py-2 bg-indigo-500/40 border border-indigo-300/30 text-white rounded-lg text-xs font-bold hover:bg-indigo-500/60 transition-colors"
              >
                My Payslips
              </Link>
            </>
          )}

          {canManageEmployees && !isEmployee && (
            <>
              <Link
                to="/attendance"
                className="px-4 py-2 bg-white text-indigo-700 rounded-lg text-xs font-bold hover:bg-indigo-50 shadow-sm transition-colors"
              >
                Punch Sheet
              </Link>
              <Link
                to="/employees"
                className="px-4 py-2 bg-indigo-500/40 border border-indigo-300/30 text-white rounded-lg text-xs font-bold hover:bg-indigo-500/60 transition-colors"
              >
                Manage Staff
              </Link>
            </>
          )}

          {isAccountant && !isOwner && (
            <>
              <Link
                to="/payroll"
                className="px-4 py-2 bg-white text-indigo-700 rounded-lg text-xs font-bold hover:bg-indigo-50 shadow-sm transition-colors"
              >
                Run Payroll
              </Link>
              <Link
                to="/expenses"
                className="px-4 py-2 bg-indigo-500/40 border border-indigo-300/30 text-white rounded-lg text-xs font-bold hover:bg-indigo-500/60 transition-colors"
              >
                Cashbook
              </Link>
            </>
          )}

          {isAuditor && (
            <Link
              to="/reports"
              className="px-4 py-2 bg-white text-indigo-700 rounded-lg text-xs font-bold hover:bg-indigo-50 shadow-sm transition-colors"
            >
              Compliance Reports
            </Link>
          )}
        </div>
      </div>

      {/* KPI Cards Grid */}
      {isEmployee ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Today&apos;s Punch</span>
              <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </div>
            <p className="text-xl font-bold text-slate-900 mt-2">
              {todayRecord?.check_in ? formatTime(todayRecord.check_in) : 'Not Punched'}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {todayRecord?.check_out ? `Out: ${formatTime(todayRecord.check_out)}` : 'Click Punch In to start shift'}
            </p>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Working Hours</span>
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                <Clock className="w-5 h-5" />
              </div>
            </div>
            <p className="text-2xl font-bold text-slate-900 mt-2">
              {todayRecord?.working_hours ? `${todayRecord.working_hours} hrs` : '0.00 hrs'}
            </p>
            <p className="text-xs text-slate-500 mt-1">Recorded today</p>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Pending Leaves</span>
              <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
                <Calendar className="w-5 h-5" />
              </div>
            </div>
            <p className="text-2xl font-bold text-slate-900 mt-2">{stats?.pending_leaves_count ?? 0}</p>
            <p className="text-xs text-slate-500 mt-1">Active requests</p>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Organization</span>
              <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                <Building className="w-5 h-5" />
              </div>
            </div>
            <p className="text-lg font-bold text-slate-900 mt-2 truncate">{business?.name || '-'}</p>
            <p className="text-xs text-slate-500 mt-1">{stats?.branches_count ?? 0} Active Branches</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Workforce</span>
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                <Users className="w-5 h-5" />
              </div>
            </div>
            <p className="text-2xl font-bold text-slate-900 mt-2">{stats?.total_employees ?? 0}</p>
            <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-medium mt-1">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>{stats?.active_employees ?? 0} active employees</span>
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Punched In Today</span>
              <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                <CalendarCheck2 className="w-5 h-5" />
              </div>
            </div>
            <p className="text-2xl font-bold text-slate-900 mt-2">{stats?.attendance_today?.present ?? 0}</p>
            <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium mt-1">
              <span>{stats?.attendance_today?.attendance_percentage ?? '0%'} attendance rate</span>
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Pending Leaves</span>
              <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
                <Clock className="w-5 h-5" />
              </div>
            </div>
            <p className="text-2xl font-bold text-slate-900 mt-2">{stats?.pending_leaves_count ?? 0}</p>
            <div className="flex items-center gap-1.5 text-xs text-amber-600 font-medium mt-1">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>Awaiting review</span>
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                {isHR ? 'Branch Workplaces' : 'Cashbook Balance'}
              </span>
              <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                {isHR ? <Building className="w-5 h-5" /> : <Receipt className="w-5 h-5" />}
              </div>
            </div>
            <p className="text-2xl font-bold text-slate-900 mt-2">
              {isHR
                ? `${stats?.branches_count ?? 0} Branches`
                : formatINR(stats?.financials?.cash_balance ?? 0)}
            </p>
            <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium mt-1">
              <span>{isHR ? 'Operational sites' : 'Live petty cash balance'}</span>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Live Attendance Chart */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {isEmployee ? 'Recent Attendance Activity' : 'Workforce Punch Trends'}
              </h3>
              <p className="text-xs text-slate-500">Live PostgreSQL punch records (last 7 days)</p>
            </div>
            <span className="text-xs font-medium text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-md">
              Live Data
            </span>
          </div>

          <div className="h-64 w-full">
            {weeklyData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                No attendance logs recorded for this period yet.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="day" stroke="#64748b" fontSize={12} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={12} tickLine={false} />
                  <Tooltip />
                  <Bar dataKey="present" fill="#4f46e5" radius={[4, 4, 0, 0]} name="Punched In" />
                  <Bar dataKey="absent" fill="#cbd5e1" radius={[4, 4, 0, 0]} name="Other" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Company Infrastructure Card */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900 mb-1">Company Infrastructure</h3>
            <p className="text-xs text-slate-500 mb-4">{business?.name || 'Active Organization'}</p>

            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white rounded-md border border-slate-200 text-indigo-600">
                    <Building className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-slate-500">Branches</p>
                    <p className="text-sm font-bold text-slate-900">
                      {stats?.branches_count ?? 0} Active Sites
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white rounded-md border border-slate-200 text-emerald-600">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-slate-500">Departments</p>
                    <p className="text-sm font-bold text-slate-900">
                      {stats?.departments_count ?? 0} Functional Units
                    </p>
                  </div>
                </div>
              </div>

              {!isEmployee && !isHR && (
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white rounded-md border border-slate-200 text-blue-600">
                      <Banknote className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-slate-500">Latest Net Payroll</p>
                      <p className="text-sm font-bold text-slate-900">
                        {formatINR(stats?.financials?.monthly_payroll_total ?? 0)}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-medium text-indigo-600">
            <span>Multi-Tenant PostgreSQL Synced</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
        </div>
      </div>
    </div>
  );
};
