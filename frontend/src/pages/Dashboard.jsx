import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
  UserX,
  Plus,
  Activity,
  ArrowUpRight,
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { formatINR, formatTime } from '../utils/formatters';
import { Loader } from '../components/ui/Loader';

export const Dashboard = () => {
  const { user, business, activeRole } = useAuth();
  const navigate = useNavigate();
  const {
    isEmployee,
    isHR,
    isAccountant,
    isAuditor,
    isOwner,
    canManageEmployees,
    canCreateEmployee,
    canManagePayroll,
  } = usePermissions();

  const [stats, setStats] = useState(null);
  const [weeklyData, setWeeklyData] = useState([]);
  const [todayRecord, setTodayRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [punchingAction, setPunchingAction] = useState(false);

  // Live timer tick every 10 seconds for real-time employee working hours
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 10000);
    return () => clearInterval(timer);
  }, []);

  const fetchAttendanceRecord = async () => {
    try {
      const attListRes = await api.get('/attendance/');
      const list = attListRes.value?.data?.data || attListRes.data?.data || attListRes.data?.results || attListRes.data || [];
      const todayStr = new Date().toISOString().split('T')[0];
      const found = Array.isArray(list) ? list.find((r) => r.date === todayStr) : null;
      setTodayRecord(found || null);
    } catch (e) {
      // silent
    }
  };

  const handleDashboardPunchIn = async () => {
    try {
      setPunchingAction(true);
      await api.post('/attendance/check-in/', {
        latitude: 28.6280,
        longitude: 77.3649,
        source: 'WEB',
      });
      await fetchAttendanceRecord();
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Check In failed');
    } finally {
      setPunchingAction(false);
    }
  };

  const handleDashboardPunchOut = async () => {
    try {
      setPunchingAction(true);
      await api.post('/attendance/check-out/', {
        latitude: 28.6280,
        longitude: 77.3649,
      });
      await fetchAttendanceRecord();
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Check Out failed');
    } finally {
      setPunchingAction(false);
    }
  };

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
          const list = attListRes.value.data?.data || attListRes.value.data?.results || attListRes.value.data || [];
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

  const isPunchedIn = Boolean(todayRecord?.check_in && !todayRecord?.check_out);

  const getLiveHoursWorked = () => {
    if (!todayRecord?.check_in) return { text: '0.00 hrs', formatted: '0h 0m', decimal: '0.00', isLive: false };
    if (todayRecord?.check_out) {
      const hrs = todayRecord.working_hours ? Number(todayRecord.working_hours).toFixed(2) : '8.50';
      const h = Math.floor(hrs);
      const m = Math.round((hrs - h) * 60);
      return { text: `${hrs} hrs`, formatted: `${h}h ${m}m`, decimal: hrs, isLive: false };
    }
    const checkInDate = new Date(todayRecord.check_in);
    const diffMs = Math.max(0, currentTime.getTime() - checkInDate.getTime());
    const totalSecs = Math.floor(diffMs / 1000);
    const hours = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const decimal = (totalSecs / 3600).toFixed(2);
    return {
      text: `${decimal} hrs`,
      formatted: `${hours}h ${String(mins).padStart(2, '0')}m`,
      decimal,
      isLive: true,
    };
  };

  const liveHours = getLiveHoursWorked();

  const empTypes = stats?.employment_types || {};
  const leaveDist = stats?.leave_distribution || [];
  const branchStats = stats?.branch_stats || [];
  const recentActivity = stats?.recent_activity || [];

  return (
    <div className="space-y-6">
      {/* Welcome Banner + Quick Actions */}
      <div className="bg-gradient-to-r from-indigo-700 via-indigo-600 to-indigo-800 rounded-2xl p-6 text-white shadow-lg shadow-indigo-600/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            <span className="text-[11px] font-semibold px-2.5 py-0.5 bg-indigo-500/40 rounded-full border border-indigo-300/30 uppercase tracking-wide">
              {activeRole.replace('_', ' ')}
            </span>
            <span className="text-xs text-indigo-100 font-medium">
              {business?.name || 'No Company Selected'}
            </span>
            {isEmployee && (
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                  isPunchedIn
                    ? 'bg-emerald-500 text-white shadow-xs'
                    : 'bg-indigo-950/60 text-slate-300 border border-indigo-400/30'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${isPunchedIn ? 'bg-white animate-pulse' : 'bg-slate-400'}`}></span>
                {isPunchedIn ? 'ACTIVE (CLOCKED IN)' : 'INACTIVE (OFF DUTY)'}
              </span>
            )}
          </div>
          <h2 className="text-2xl font-bold tracking-tight">Welcome back, {user?.full_name}!</h2>
          <p className="text-indigo-100 text-xs mt-1">
            {isEmployee
              ? isPunchedIn
                ? `You clocked in at ${formatTime(todayRecord.check_in)}. Shift hours are actively tracked below.`
                : 'You are currently off duty. Punch in to activate your shift and begin tracking hours.'
              : isAuditor
              ? 'Read-only compliance overview and financial audit records.'
              : 'Live workforce punch activity, leaves, expenses, and payroll overview.'}
          </p>
        </div>

        {/* Role-specific Quick Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {isEmployee && (
            <>
              {!isPunchedIn ? (
                <button
                  type="button"
                  disabled={punchingAction}
                  onClick={handleDashboardPunchIn}
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-xs font-bold shadow-sm transition-colors flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>{punchingAction ? 'Punching In...' : 'Punch In (PI)'}</span>
                </button>
              ) : (
                <button
                  type="button"
                  disabled={punchingAction}
                  onClick={handleDashboardPunchOut}
                  className="px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-lg text-xs font-bold shadow-sm transition-colors flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>{punchingAction ? 'Punching Out...' : 'Punch Out (PO)'}</span>
                </button>
              )}
              <Link
                to="/attendance"
                className="px-3.5 py-2 bg-indigo-500/40 border border-indigo-300/30 text-white rounded-lg text-xs font-bold hover:bg-indigo-500/60 transition-colors"
              >
                Punch Logs
              </Link>
              <Link
                to="/payroll"
                className="px-3.5 py-2 bg-indigo-500/40 border border-indigo-300/30 text-white rounded-lg text-xs font-bold hover:bg-indigo-500/60 transition-colors"
              >
                My Payslips
              </Link>
            </>
          )}

          {canCreateEmployee && !isEmployee && (
            <Link
              to="/employees?action=add"
              className="flex items-center gap-1.5 px-3.5 py-2 bg-white text-indigo-700 rounded-lg text-xs font-bold hover:bg-indigo-50 shadow-sm transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Employee</span>
            </Link>
          )}

          {canManageEmployees && !isEmployee && (
            <Link
              to="/attendance"
              className="px-3.5 py-2 bg-indigo-500/40 border border-indigo-300/30 text-white rounded-lg text-xs font-bold hover:bg-indigo-500/60 transition-colors"
            >
              Mark Attendance
            </Link>
          )}

          {canManagePayroll && !isEmployee && (
            <Link
              to="/payroll"
              className="px-3.5 py-2 bg-emerald-500/90 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold shadow-sm transition-colors"
            >
              Process Payroll
            </Link>
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
          {/* Card 1: Live Status & Punch In/Out */}
          <Link to="/attendance" className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:border-indigo-400 transition-all block group">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Duty Status</span>
              <div className={`p-2 rounded-lg ${isPunchedIn ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-2 flex items-center gap-2">
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                  isPunchedIn
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${isPunchedIn ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`}></span>
                {isPunchedIn ? 'ACTIVE' : 'INACTIVE'}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-2">
              {isPunchedIn
                ? `Punched in: ${formatTime(todayRecord.check_in)}`
                : todayRecord?.check_out
                ? `Punched out: ${formatTime(todayRecord.check_out)}`
                : 'Click to punch attendance'}
            </p>
          </Link>

          {/* Card 2: Real-time Live Working Hours */}
          <Link to="/attendance" className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:border-indigo-400 transition-all block group">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Working Hours</span>
              <div className={`p-2 rounded-lg ${liveHours.isLive ? 'bg-emerald-50 text-emerald-600' : 'bg-indigo-50 text-indigo-600'}`}>
                <Clock className="w-5 h-5" />
              </div>
            </div>
            <p className="text-2xl font-bold text-slate-900 mt-2 flex items-baseline gap-1.5">
              <span>{liveHours.formatted}</span>
              <span className="text-xs text-slate-400 font-normal">({liveHours.text})</span>
            </p>
            <p className="text-xs mt-1">
              {liveHours.isLive ? (
                <span className="text-emerald-600 font-semibold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  Active shift (Live tracking)
                </span>
              ) : todayRecord?.check_out ? (
                <span className="text-slate-600 font-medium">✓ Completed shift today</span>
              ) : (
                <span className="text-slate-400">0.00 hrs recorded today</span>
              )}
            </p>
          </Link>

          {/* Card 3: Pending Leaves */}
          <Link to="/leaves" className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:border-indigo-400 transition-all block">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Pending Leaves</span>
              <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
                <Calendar className="w-5 h-5" />
              </div>
            </div>
            <p className="text-2xl font-bold text-slate-900 mt-2">{stats?.pending_leaves_count ?? 0}</p>
            <p className="text-xs text-slate-500 mt-1">View leave requests</p>
          </Link>

          {/* Card 4: My Payslips */}
          <Link to="/payroll" className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:border-indigo-400 transition-all block">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">My Payslips</span>
              <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                <Banknote className="w-5 h-5" />
              </div>
            </div>
            <p className="text-lg font-bold text-slate-900 mt-2 truncate">{business?.name || '-'}</p>
            <p className="text-xs text-indigo-600 font-medium mt-1">View salary slips &rarr;</p>
          </Link>
        </div>
      ) : (
        /* Management / Owner Clickable KPI Cards */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <Link to="/employees" className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:border-indigo-400 hover:shadow-md transition-all block group">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Total Employees</span>
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-bold text-slate-900 mt-2">{stats?.total_employees ?? 0}</p>
            <div className="flex items-center gap-1 text-[11px] text-emerald-600 font-medium mt-1">
              <TrendingUp className="w-3 h-3" />
              <span>{stats?.active_employees ?? 0} active</span>
            </div>
          </Link>

          <Link to="/attendance" className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:border-emerald-400 hover:shadow-md transition-all block group">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Present Today</span>
              <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                <CalendarCheck2 className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-bold text-slate-900 mt-2">{stats?.attendance_today?.present ?? 0}</p>
            <p className="text-[11px] text-slate-500 mt-1">{stats?.attendance_today?.attendance_percentage ?? '0%'} rate</p>
          </Link>

          <Link to="/attendance" className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:border-rose-400 hover:shadow-md transition-all block group">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Absent Today</span>
              <div className="p-2 bg-rose-50 text-rose-600 rounded-lg group-hover:bg-rose-600 group-hover:text-white transition-colors">
                <UserX className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-bold text-slate-900 mt-2">{stats?.attendance_today?.absent ?? 0}</p>
            <p className="text-[11px] text-slate-500 mt-1">View attendance sheet</p>
          </Link>

          <Link to="/leaves" className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:border-amber-400 hover:shadow-md transition-all block group">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">On Leave</span>
              <div className="p-2 bg-amber-50 text-amber-600 rounded-lg group-hover:bg-amber-600 group-hover:text-white transition-colors">
                <Calendar className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-bold text-slate-900 mt-2">{stats?.attendance_today?.on_leave ?? 0}</p>
            <p className="text-[11px] text-amber-600 font-medium mt-1">{stats?.pending_leaves_count ?? 0} pending review</p>
          </Link>

          <Link to="/attendance" className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:border-orange-400 hover:shadow-md transition-all block group">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Late Arrivals</span>
              <div className="p-2 bg-orange-50 text-orange-600 rounded-lg group-hover:bg-orange-600 group-hover:text-white transition-colors">
                <AlertCircle className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-bold text-slate-900 mt-2">{stats?.attendance_today?.late ?? 0}</p>
            <p className="text-[11px] text-slate-500 mt-1">Delayed check-ins today</p>
          </Link>
        </div>
      )}

      {/* Financial Summaries (Payroll Summary & Expense Summary) for Non-Employees */}
      {!isEmployee && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link to="/payroll" className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:border-indigo-400 transition-all flex items-center justify-between group">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase">Payroll Summary</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">
                {formatINR(stats?.financials?.monthly_payroll_total ?? 0)}
              </p>
              <p className="text-xs text-indigo-600 font-medium mt-1">Open Payroll Overview &rarr;</p>
            </div>
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl group-hover:bg-indigo-600 group-hover:text-white transition-colors">
              <Banknote className="w-6 h-6" />
            </div>
          </Link>

          <Link to="/expenses" className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:border-rose-400 transition-all flex items-center justify-between group">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase">Expense Summary (Month)</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">
                {formatINR(stats?.financials?.monthly_expenses_total ?? 0)}
              </p>
              <p className="text-xs text-rose-600 font-medium mt-1">Open Expense Report &rarr;</p>
            </div>
            <div className="p-3 bg-rose-50 text-rose-600 rounded-xl group-hover:bg-rose-600 group-hover:text-white transition-colors">
              <Receipt className="w-6 h-6" />
            </div>
          </Link>

          <Link to="/cashbook" className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:border-emerald-400 transition-all flex items-center justify-between group">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase">Cashbook Balance</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">
                {formatINR(stats?.financials?.cash_balance ?? 0)}
              </p>
              <p className="text-xs text-emerald-600 font-medium mt-1">Open Cashbook Ledger &rarr;</p>
            </div>
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl group-hover:bg-emerald-600 group-hover:text-white transition-colors">
              <TrendingUp className="w-6 h-6" />
            </div>
          </Link>
        </div>
      )}

      {/* Main Analytics Grid: Attendance Chart + Employee Type / Leave Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Clickable Attendance Chart */}
        <div
          onClick={() => navigate(isEmployee ? '/attendance' : '/reports')}
          className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:border-indigo-300 cursor-pointer transition-all"
          title={isEmployee ? 'Click to open My Attendance' : 'Click to open Attendance Analytics'}
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-1.5">
                <span>{isEmployee ? 'My Recent Attendance Activity' : 'Attendance Trend'}</span>
                <ArrowUpRight className="w-4 h-4 text-slate-400" />
              </h3>
              <p className="text-xs text-slate-500">
                {isEmployee ? 'Click chart to view your full Attendance Logs' : 'Click chart to view full Attendance Analytics'}
              </p>
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
                  <Bar dataKey="present" fill="#4f46e5" radius={[4, 4, 0, 0]} name="Present" />
                  <Bar dataKey="absent" fill="#cbd5e1" radius={[4, 4, 0, 0]} name="Other" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Right Column: Employee Status (Management only) OR Quick Self-Service (Employees) */}
        <div className="space-y-4">
          {!isEmployee ? (
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-slate-900">Employee Status &amp; Type</h3>
                <Link to="/employees" className="text-[11px] font-semibold text-indigo-600 hover:underline">
                  View All
                </Link>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-2.5 bg-indigo-50 rounded-lg">
                  <p className="text-lg font-bold text-indigo-700">{empTypes.FULL_TIME ?? 0}</p>
                  <p className="text-[10px] font-semibold text-slate-600">Full-Time</p>
                </div>
                <div className="p-2.5 bg-emerald-50 rounded-lg">
                  <p className="text-lg font-bold text-emerald-700">{empTypes.CONTRACT ?? 0}</p>
                  <p className="text-[10px] font-semibold text-slate-600">Contract</p>
                </div>
                <div className="p-2.5 bg-amber-50 rounded-lg">
                  <p className="text-lg font-bold text-amber-700">{(empTypes.PART_TIME ?? 0) + (empTypes.INTERN ?? 0)}</p>
                  <p className="text-[10px] font-semibold text-slate-600">Part / Intern</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-slate-900">My Self-Service</h3>
                <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded uppercase">
                  Quick Access
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <Link
                  to="/attendance"
                  className="p-3 bg-slate-50 hover:bg-indigo-50/70 border border-slate-200 hover:border-indigo-300 rounded-lg transition-all flex flex-col items-center text-center group"
                >
                  <Clock className="w-5 h-5 text-indigo-600 mb-1 group-hover:scale-110 transition-transform" />
                  <span className="font-semibold text-slate-800">Punch Clock</span>
                  <span className="text-[10px] text-slate-400">Check In / Out</span>
                </Link>
                <Link
                  to="/leaves"
                  className="p-3 bg-slate-50 hover:bg-emerald-50/70 border border-slate-200 hover:border-emerald-300 rounded-lg transition-all flex flex-col items-center text-center group"
                >
                  <Calendar className="w-5 h-5 text-emerald-600 mb-1 group-hover:scale-110 transition-transform" />
                  <span className="font-semibold text-slate-800">Apply Leave</span>
                  <span className="text-[10px] text-slate-400">Request off</span>
                </Link>
                <Link
                  to="/payroll"
                  className="p-3 bg-slate-50 hover:bg-blue-50/70 border border-slate-200 hover:border-blue-300 rounded-lg transition-all flex flex-col items-center text-center group"
                >
                  <Banknote className="w-5 h-5 text-blue-600 mb-1 group-hover:scale-110 transition-transform" />
                  <span className="font-semibold text-slate-800">Payslips</span>
                  <span className="text-[10px] text-slate-400">Download slip</span>
                </Link>
                <Link
                  to="/advances"
                  className="p-3 bg-slate-50 hover:bg-amber-50/70 border border-slate-200 hover:border-amber-300 rounded-lg transition-all flex flex-col items-center text-center group"
                >
                  <Receipt className="w-5 h-5 text-amber-600 mb-1 group-hover:scale-110 transition-transform" />
                  <span className="font-semibold text-slate-800">Salary Advance</span>
                  <span className="text-[10px] text-slate-400">Request funds</span>
                </Link>
              </div>
            </div>
          )}

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-slate-900">Leave Type Distribution</h3>
              <Link to="/leaves" className="text-[11px] font-semibold text-indigo-600 hover:underline">
                Leaves &rarr;
              </Link>
            </div>
            {leaveDist.length === 0 ? (
              <p className="text-xs text-slate-400">No leave requests recorded.</p>
            ) : (
              <div className="space-y-2">
                {leaveDist.map((item) => (
                  <div key={item.name} className="flex items-center justify-between text-xs">
                    <span className="text-slate-600 font-medium">{item.name}</span>
                    <span className="font-bold text-slate-900 px-2 py-0.5 bg-slate-100 rounded">{item.count}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Row: Clickable Branch Statistics & Clickable Recent Activity */}
      {!isEmployee && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Branch Statistics */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Building className="w-4 h-4 text-indigo-600" />
                <span>Branch Statistics</span>
              </h3>
              <Link to="/organization" className="text-[11px] font-semibold text-indigo-600 hover:underline">
                Manage Branches &rarr;
              </Link>
            </div>
            {branchStats.length === 0 ? (
              <p className="text-xs text-slate-400">No branches configured.</p>
            ) : (
              <div className="space-y-2">
                {branchStats.map((br) => (
                  <Link
                    key={br.id}
                    to="/organization"
                    className="flex items-center justify-between p-3 bg-slate-50 hover:bg-indigo-50/60 rounded-lg border border-transparent hover:border-indigo-200 transition-all"
                  >
                    <div>
                      <p className="text-xs font-bold text-slate-900">{br.name}</p>
                      <p className="text-[11px] text-slate-500">{br.city || 'Operational Site'}</p>
                    </div>
                    <span className="text-xs font-bold text-indigo-700 bg-indigo-100 px-2.5 py-1 rounded-md">
                      {br.employee_count} Staff
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Recent Activity */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-600" />
                <span>Recent Activity</span>
              </h3>
              <span className="text-[11px] text-slate-400">Click item to inspect</span>
            </div>
            {recentActivity.length === 0 ? (
              <p className="text-xs text-slate-400">No recent activity found.</p>
            ) : (
              <div className="space-y-2">
                {recentActivity.map((act) => (
                  <Link
                    key={act.id}
                    to={act.link}
                    className="flex items-center justify-between p-2.5 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-slate-900 truncate">{act.title}</p>
                      <p className="text-[11px] text-slate-500 truncate">{act.subtitle}</p>
                    </div>
                    <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
