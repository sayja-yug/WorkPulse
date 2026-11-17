import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { usePermissions } from '../hooks/usePermissions';
import { useNotification } from '../context/NotificationContext';
import api from '../api/client';
import {
  Users,
  CalendarCheck2,
  AlertCircle,
  AlertTriangle,
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
import { Badge } from '../components/ui/Badge';
import { calculateWorkHoursSummary, parseCheckInDate } from '../utils/workHours';
import { calculateEmployeeInactivity } from '../utils/employeeInactivity';

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
  const { toast } = useNotification();

  const [stats, setStats] = useState(null);
  const [weeklyData, setWeeklyData] = useState([]);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [todayRecord, setTodayRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [punchingAction, setPunchingAction] = useState(false);
  const [inactiveEmployees, setInactiveEmployees] = useState([]);

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
      const safeList = Array.isArray(list) ? list : [];
      setAttendanceRecords(safeList);
      const localToday = new Date().toLocaleDateString('en-CA');
      const utcToday = new Date().toISOString().split('T')[0];
      const found = safeList.find((r) => r.date === localToday || r.date === utcToday);
      setTodayRecord(found || null);
    } catch {
      // silent
    }
  };

  const handleDashboardPunchIn = async () => {
    try {
      setPunchingAction(true);
      const res = await api.post('/attendance/check-in/', {
        latitude: 28.6280,
        longitude: 77.3649,
        source: 'WEB',
      });
      if (res.data?.data) {
        setTodayRecord(res.data.data);
      }
      await fetchAttendanceRecord();
      toast.success('Punched in successfully! Have a productive day.');
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Check In failed');
    } finally {
      setPunchingAction(false);
    }
  };

  const handleDashboardPunchOut = async () => {
    try {
      setPunchingAction(true);
      const res = await api.post('/attendance/check-out/', {
        latitude: 28.6280,
        longitude: 77.3649,
      });
      if (res.data?.data) {
        setTodayRecord(res.data.data);
      }
      await fetchAttendanceRecord();
      toast.info('Punched out successfully! Work session ended.');
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Check Out failed');
    } finally {
      setPunchingAction(false);
    }
  };

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        setLoading(true);
        const [statsRes, analyticsRes] = await Promise.all([
          api.get('/reports/overview/'),
          api.get('/reports/attendance/'),
        ]);

        const statsData = statsRes.data?.data || statsRes.data || {};
        const analyticsData = analyticsRes.data?.data || analyticsRes.data || {};

        setStats(statsData);

        const timeline = Array.isArray(analyticsData.timeline)
          ? analyticsData.timeline
          : Array.isArray(analyticsData.daily_trend)
          ? analyticsData.daily_trend
          : [];

        if (timeline.length > 0) {
          const byDay = {};
          timeline.forEach((item) => {
            const dayKey = item.date?.slice(5) || item.day || 'Day';
            if (!byDay[dayKey]) {
              byDay[dayKey] = { day: dayKey, present: 0, absent: 0 };
            }
            if (item.status === 'PRESENT') {
              byDay[dayKey].present += Number(item.count || 0);
            } else {
              byDay[dayKey].absent += Number(item.count || 0);
            }
          });
          const computed = Object.values(byDay);
          if (computed.length > 0) {
            setWeeklyData(computed.slice(-7));
          }
        } else {
          setWeeklyData([
            { day: 'Mon', present: 24, absent: 1 },
            { day: 'Tue', present: 25, absent: 0 },
            { day: 'Wed', present: 23, absent: 2 },
            { day: 'Thu', present: 25, absent: 0 },
            { day: 'Fri', present: 22, absent: 3 },
            { day: 'Sat', present: 18, absent: 7 },
            { day: 'Sun', present: 0, absent: 25 },
          ]);
        }

        await fetchAttendanceRecord();

        // For Business Owners and HR, compute any employees inactive for 3+ consecutive days
        if (!isEmployee) {
          try {
            const [empRes, attRes] = await Promise.all([
              api.get('/employees/'),
              api.get('/attendance/'),
            ]);
            const empList = empRes.data?.data || empRes.data?.results || empRes.data || [];
            const attList = attRes.data?.data || attRes.data?.results || attRes.data || [];
            if (Array.isArray(empList)) {
              const inactiveList = empList
                .map((emp) => {
                  const inact = calculateEmployeeInactivity(emp, attList);
                  return { ...emp, inactivity: inact };
                })
                .filter((emp) => emp.inactivity.isInactive && emp.status !== 'TERMINATED' && emp.status !== 'RESIGNED');
              setInactiveEmployees(inactiveList);
            }
          } catch {
            // silent
          }
        }
      } catch (err) {
        console.error('Failed to load dashboard:', err);
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, [business, isEmployee]);

  const computeRealtimeHours = () => {
    if (!todayRecord) return { formatted: '0.00 hrs', text: 'Off Duty', isLive: false, hours: 0 };

    // Active live shift (Checked in but not checked out yet)
    if (todayRecord.check_in && !todayRecord.check_out) {
      const inDate = parseCheckInDate(todayRecord.check_in, todayRecord.date);

      if (!inDate || isNaN(inDate.getTime())) {
        return { formatted: '0.00 hrs', text: 'Active shift', isLive: true, hours: 0 };
      }

      const diffMs = Math.max(0, currentTime.getTime() - inDate.getTime());
      const totalHours = diffMs / (1000 * 60 * 60);
      const safeHours = isNaN(totalHours) || !isFinite(totalHours) ? 0 : Math.max(0, totalHours);
      const hrs = Math.floor(safeHours);
      const mins = Math.floor((safeHours - hrs) * 60);

      return {
        formatted: `${safeHours.toFixed(2)} hrs`,
        text: `${hrs}h ${mins}m active`,
        isLive: true,
        hours: safeHours,
      };
    }

    // Completed shift (Already checked out, working_hours calculated by server)
    if (todayRecord.working_hours !== undefined && todayRecord.working_hours !== null) {
      const num = Number(todayRecord.working_hours);
      if (!isNaN(num) && isFinite(num)) {
        const hrs = Math.floor(num);
        const mins = Math.round((num - hrs) * 60);
        return {
          formatted: `${num.toFixed(2)} hrs`,
          text: `${hrs}h ${mins}m completed`,
          isLive: false,
          hours: num,
        };
      }
    }

    return { formatted: '0.00 hrs', text: 'Off Duty', isLive: false, hours: 0 };
  };

  const isPunchedIn = Boolean(todayRecord && todayRecord.check_in && !todayRecord.check_out);
  const liveHours = computeRealtimeHours();
  const workHoursSummary = calculateWorkHoursSummary(
    attendanceRecords,
    todayRecord,
    isPunchedIn ? liveHours.hours : null
  );

  if (loading) {
    return <Loader message="Loading workspace operations..." size="lg" />;
  }

  const empTypes = stats?.employee_types || {};
  const leaveDist = stats?.leave_distribution || [];
  const branchStats = stats?.branch_stats || [];
  const recentActivity = stats?.recent_activity || [];

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* 1. Welcome Banner + Quick Actions */}
      <div className="bg-zinc-950 rounded-2xl p-4 sm:p-6 text-white shadow-subtle border border-zinc-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            <span className="text-[10px] font-bold px-2 py-0.5 bg-zinc-800 text-zinc-200 rounded-full border border-zinc-700 uppercase tracking-wide">
              {activeRole.replace('_', ' ')}
            </span>
            <span className="text-xs text-zinc-300 font-medium">
              {business?.name || 'No Company Selected'}
            </span>
            {isEmployee && (
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                  isPunchedIn
                    ? 'bg-white text-zinc-950 shadow-xs'
                    : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${isPunchedIn ? 'bg-zinc-950 animate-pulse' : 'bg-zinc-500'}`}></span>
                {isPunchedIn ? 'ACTIVE (CLOCKED IN)' : 'INACTIVE (OFF DUTY)'}
              </span>
            )}
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">Welcome back, {user?.full_name}!</h2>
          <p className="text-zinc-400 text-xs mt-1">
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
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {isEmployee && (
            <>
              {!isPunchedIn ? (
                <button
                  type="button"
                  disabled={punchingAction}
                  onClick={handleDashboardPunchIn}
                  className="px-4 py-2 bg-white hover:bg-zinc-100 text-zinc-950 rounded-lg text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>{punchingAction ? 'Punching In...' : 'Punch In (PI)'}</span>
                </button>
              ) : (
                <button
                  type="button"
                  disabled={punchingAction}
                  onClick={handleDashboardPunchOut}
                  className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-white border border-zinc-700 rounded-lg text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>{punchingAction ? 'Punching Out...' : 'Punch Out (PO)'}</span>
                </button>
              )}
              <Link
                to="/attendance"
                className="px-3.5 py-2 bg-zinc-900 border border-zinc-800 text-zinc-200 rounded-lg text-xs font-bold hover:bg-zinc-800 hover:text-white transition-colors"
              >
                Punch Logs
              </Link>
              <Link
                to="/payroll"
                className="px-3.5 py-2 bg-zinc-900 border border-zinc-800 text-zinc-200 rounded-lg text-xs font-bold hover:bg-zinc-800 hover:text-white transition-colors"
              >
                My Payslips
              </Link>
            </>
          )}

          {canCreateEmployee && !isEmployee && (
            <Link
              to="/employees?action=add"
              className="flex items-center gap-1.5 px-3.5 py-2 bg-white text-zinc-950 rounded-lg text-xs font-bold hover:bg-zinc-100 shadow-xs transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Employee</span>
            </Link>
          )}

          {canManageEmployees && !isEmployee && (
            <Link
              to="/attendance"
              className="px-3.5 py-2 bg-zinc-900 border border-zinc-800 text-zinc-200 rounded-lg text-xs font-bold hover:bg-zinc-800 hover:text-white transition-colors"
            >
              Mark Attendance
            </Link>
          )}

          {canManagePayroll && !isEmployee && (
            <Link
              to="/payroll"
              className="px-3.5 py-2 bg-white text-zinc-950 rounded-lg text-xs font-bold hover:bg-zinc-100 shadow-xs transition-colors"
            >
              Process Payroll
            </Link>
          )}

          {isAuditor && (
            <Link
              to="/reports"
              className="px-4 py-2 bg-white text-zinc-950 rounded-lg text-xs font-bold hover:bg-zinc-100 shadow-xs transition-colors"
            >
              Compliance Reports
            </Link>
          )}
        </div>
      </div>

      {/* Enterprise Inactivity Notification Alert Banner (Owner & HR View) */}
      {!isEmployee && inactiveEmployees.length > 0 && (
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-amber-300 shadow-sm relative overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-amber-50 text-amber-700 border border-amber-200 shrink-0 mt-0.5 sm:mt-0">
                <AlertTriangle className="w-5 h-5 text-amber-700" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-zinc-950">
                    Enterprise Attendance Alert: {inactiveEmployees.length} Employee{inactiveEmployees.length > 1 ? 's' : ''} Inactive
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200 uppercase tracking-wide">
                    3+ Days No Punch
                  </span>
                </div>
                <p className="text-xs text-zinc-600 mt-0.5 leading-relaxed">
                  These employees have not logged a punch-in for 3 or more consecutive working days. Their profile status is marked inactive until attendance is resumed or reviewed by HR.
                </p>

                {/* Inactive Employee Quick Summary Chips */}
                <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
                  {inactiveEmployees.slice(0, 5).map((emp) => (
                    <Link
                      key={emp.id}
                      to={`/employees/${emp.id}`}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-50 hover:bg-amber-50 text-zinc-800 hover:text-amber-900 border border-zinc-200 text-xs font-semibold transition-colors"
                      title={emp.inactivity?.label}
                    >
                      <span>{emp.full_name}</span>
                      <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-800">
                        {emp.inactivity?.days}d unpunched
                      </span>
                    </Link>
                  ))}
                  {inactiveEmployees.length > 5 && (
                    <span className="text-xs text-zinc-500 font-medium px-1">
                      +{inactiveEmployees.length - 5} more
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="shrink-0 self-start sm:self-center">
              <Link
                to="/employees?status=INACTIVE_3_DAYS"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-zinc-950 text-white text-xs font-bold hover:bg-zinc-800 transition-colors shadow-xs"
              >
                <span>Review In HR Directory</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* 2. KPI Cards Grid */}
      {isEmployee ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
          {/* Card 1: Live Status & Punch In/Out */}
          <Link to="/attendance" className="bg-white  p-5 rounded-xl border border-zinc-200  shadow-subtle hover:border-zinc-400 :border-zinc-600 transition-all block group">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-zinc-500  uppercase tracking-wider">Duty Status</span>
              <div className="p-2 rounded-lg bg-zinc-100  text-zinc-900  border border-zinc-200/80 ">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <Badge variant={isPunchedIn ? 'inverted' : 'default'} dot>
                {isPunchedIn ? 'ACTIVE (CLOCKED IN)' : 'INACTIVE (OFF DUTY)'}
              </Badge>
            </div>
            <p className="text-xs text-zinc-500  mt-2">
              {isPunchedIn
                ? `Punched in: ${formatTime(todayRecord.check_in)}`
                : todayRecord?.check_out
                ? `Punched out: ${formatTime(todayRecord.check_out)}`
                : 'Click to punch attendance'}
            </p>
          </Link>

          {/* Card 2: Real-time Live Working Hours */}
          <Link to="/attendance" className="bg-white p-5 rounded-xl border border-zinc-200 shadow-subtle hover:border-zinc-400 transition-all block group">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Today&apos;s Hours</span>
              <div className="p-2 rounded-lg bg-zinc-100 text-zinc-900 border border-zinc-200/80">
                <Clock className="w-5 h-5" />
              </div>
            </div>
            <p className="text-2xl font-bold text-zinc-950 mt-2 flex items-baseline gap-1.5">
              <span>{liveHours.formatted}</span>
              <span className="text-xs text-zinc-400 font-normal">({liveHours.text})</span>
            </p>
            <p className="text-xs mt-1">
              {liveHours.isLive ? (
                <span className="text-zinc-900 font-semibold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-zinc-900 animate-pulse"></span>
                  Active shift (Live tracking)
                </span>
              ) : todayRecord?.check_out ? (
                <span className="text-zinc-600 font-medium">✓ Completed shift today</span>
              ) : (
                <span className="text-zinc-400">0.00 hrs recorded today</span>
              )}
            </p>

            {/* Weekly & Monthly Sub-Breakdown Strip */}
            <div className="mt-3 pt-3 border-t border-zinc-100 grid grid-cols-2 gap-2 text-xs">
              <div className="bg-zinc-50 p-2 rounded-lg border border-zinc-200/60">
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">This Week</span>
                <span className="font-mono font-bold text-zinc-950 mt-0.5 block">{workHoursSummary.weeklyFormatted}</span>
                <span className="text-[10px] text-zinc-400 font-medium">{workHoursSummary.weeklyText}</span>
              </div>
              <div className="bg-zinc-50 p-2 rounded-lg border border-zinc-200/60">
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">This Month</span>
                <span className="font-mono font-bold text-zinc-950 mt-0.5 block">{workHoursSummary.monthlyFormatted}</span>
                <span className="text-[10px] text-zinc-400 font-medium">{workHoursSummary.monthlyText}</span>
              </div>
            </div>
          </Link>

          {/* Card 3: Pending Leaves */}
          <Link to="/leaves" className="bg-white  p-5 rounded-xl border border-zinc-200  shadow-subtle hover:border-zinc-400 :border-zinc-600 transition-all block group">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-zinc-500  uppercase tracking-wider">Pending Leaves</span>
              <div className="p-2 bg-zinc-100  text-zinc-900  rounded-lg border border-zinc-200/80 ">
                <Calendar className="w-5 h-5" />
              </div>
            </div>
            <p className="text-2xl font-bold text-zinc-950  mt-2">{stats?.pending_leaves_count ?? 0}</p>
            <p className="text-xs text-zinc-500  mt-1">View leave requests &rarr;</p>
          </Link>

          {/* Card 4: My Payslips */}
          <Link to="/payroll" className="bg-white  p-5 rounded-xl border border-zinc-200  shadow-subtle hover:border-zinc-400 :border-zinc-600 transition-all block group">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-zinc-500  uppercase tracking-wider">My Payslips</span>
              <div className="p-2 bg-zinc-100  text-zinc-900  rounded-lg border border-zinc-200/80 ">
                <Banknote className="w-5 h-5" />
              </div>
            </div>
            <p className="text-lg font-bold text-zinc-950  mt-2 truncate">{business?.name || '-'}</p>
            <p className="text-xs text-zinc-950  font-bold mt-1">View salary slips &rarr;</p>
          </Link>
        </div>
      ) : (
        /* Management / Owner KPI Cards */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 sm:gap-4">
          <Link to="/employees" className="bg-white  p-4 rounded-xl border border-zinc-200  shadow-subtle hover:border-zinc-400 :border-zinc-600 transition-all block group">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-zinc-500  uppercase tracking-wider">Total Employees</span>
              <div className="p-2 bg-zinc-100  text-zinc-900  rounded-lg group-hover:bg-zinc-950 group-hover:text-white :bg-white :text-zinc-950 transition-colors">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-black text-zinc-950  mt-2">{stats?.total_employees ?? 0}</p>
            <div className="flex items-center gap-1 text-[11px] text-zinc-600  font-semibold mt-1">
              <TrendingUp className="w-3 h-3 text-zinc-950 " />
              <span>{stats?.active_employees ?? 0} active</span>
            </div>
          </Link>

          <Link to="/attendance" className="bg-white  p-4 rounded-xl border border-zinc-200  shadow-subtle hover:border-zinc-400 :border-zinc-600 transition-all block group">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-zinc-500  uppercase tracking-wider">Present Today</span>
              <div className="p-2 bg-zinc-100  text-zinc-900  rounded-lg group-hover:bg-zinc-950 group-hover:text-white :bg-white :text-zinc-950 transition-colors">
                <CalendarCheck2 className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-black text-zinc-950  mt-2">{stats?.attendance_today?.present ?? 0}</p>
            <p className="text-[11px] text-zinc-500  mt-1">{stats?.attendance_today?.attendance_percentage ?? '0%'} rate</p>
          </Link>

          <Link to="/attendance" className="bg-white  p-4 rounded-xl border border-zinc-200  shadow-subtle hover:border-zinc-400 :border-zinc-600 transition-all block group">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-zinc-500  uppercase tracking-wider">Absent Today</span>
              <div className="p-2 bg-zinc-100  text-zinc-900  rounded-lg group-hover:bg-zinc-950 group-hover:text-white :bg-white :text-zinc-950 transition-colors">
                <UserX className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-black text-zinc-950  mt-2">{stats?.attendance_today?.absent ?? 0}</p>
            <p className="text-[11px] text-zinc-500  mt-1">View attendance sheet</p>
          </Link>

          <Link to="/leaves" className="bg-white  p-4 rounded-xl border border-zinc-200  shadow-subtle hover:border-zinc-400 :border-zinc-600 transition-all block group">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-zinc-500  uppercase tracking-wider">On Leave</span>
              <div className="p-2 bg-zinc-100  text-zinc-900  rounded-lg group-hover:bg-zinc-950 group-hover:text-white :bg-white :text-zinc-950 transition-colors">
                <Calendar className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-black text-zinc-950  mt-2">{stats?.attendance_today?.on_leave ?? 0}</p>
            <p className="text-[11px] text-zinc-600  font-semibold mt-1">{stats?.pending_leaves_count ?? 0} pending review</p>
          </Link>

          <Link to="/attendance" className="bg-white  p-4 rounded-xl border border-zinc-200  shadow-subtle hover:border-zinc-400 :border-zinc-600 transition-all block group">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-zinc-500  uppercase tracking-wider">Late Arrivals</span>
              <div className="p-2 bg-zinc-100  text-zinc-900  rounded-lg group-hover:bg-zinc-950 group-hover:text-white :bg-white :text-zinc-950 transition-colors">
                <AlertCircle className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-black text-zinc-950  mt-2">{stats?.attendance_today?.late ?? 0}</p>
            <p className="text-[11px] text-zinc-500  mt-1">Delayed check-ins today</p>
          </Link>
        </div>
      )}

      {/* 3. Financial Summaries for Non-Employees */}
      {!isEmployee && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 sm:gap-4">
          <Link to="/payroll" className="bg-white  p-5 rounded-xl border border-zinc-200  shadow-subtle hover:border-zinc-400 :border-zinc-600 transition-all flex items-center justify-between group">
            <div>
              <p className="text-xs font-bold text-zinc-500  uppercase tracking-wider">Payroll Summary</p>
              <p className="text-2xl font-black text-zinc-950  mt-1">
                {formatINR(stats?.financials?.monthly_payroll_total ?? 0)}
              </p>
              <p className="text-xs text-zinc-950  font-bold mt-1">Open Payroll Overview &rarr;</p>
            </div>
            <div className="p-3 bg-zinc-100  text-zinc-900  rounded-xl group-hover:bg-zinc-950 group-hover:text-white :bg-white :text-zinc-950 transition-colors">
              <Banknote className="w-6 h-6" />
            </div>
          </Link>

          <Link to="/cashbook" className="bg-white  p-5 rounded-xl border border-zinc-200  shadow-subtle hover:border-zinc-400 :border-zinc-600 transition-all flex items-center justify-between group">
            <div>
              <p className="text-xs font-bold text-zinc-500  uppercase tracking-wider">Expense Summary (Month)</p>
              <p className="text-2xl font-black text-zinc-950  mt-1">
                {formatINR(stats?.financials?.monthly_expenses_total ?? 0)}
              </p>
              <p className="text-xs text-zinc-950  font-bold mt-1">Open Expense Report &rarr;</p>
            </div>
            <div className="p-3 bg-zinc-100  text-zinc-900  rounded-xl group-hover:bg-zinc-950 group-hover:text-white :bg-white :text-zinc-950 transition-colors">
              <Receipt className="w-6 h-6" />
            </div>
          </Link>

          <Link to="/cashbook" className="bg-white  p-5 rounded-xl border border-zinc-200  shadow-subtle hover:border-zinc-400 :border-zinc-600 transition-all flex items-center justify-between group">
            <div>
              <p className="text-xs font-bold text-zinc-500  uppercase tracking-wider">Cashbook Balance</p>
              <p className="text-2xl font-black text-zinc-950  mt-1">
                {formatINR(stats?.financials?.cash_balance ?? 0)}
              </p>
              <p className="text-xs text-zinc-950  font-bold mt-1">Open Cashbook Ledger &rarr;</p>
            </div>
            <div className="p-3 bg-zinc-100  text-zinc-900  rounded-xl group-hover:bg-zinc-950 group-hover:text-white :bg-white :text-zinc-950 transition-colors">
              <TrendingUp className="w-6 h-6" />
            </div>
          </Link>
        </div>
      )}

      {/* 3. Dedicated Cumulative Work Hours Strip (Today, Weekly, Monthly) for Employee */}
      {isEmployee && (
        <div className="bg-white rounded-xl border border-zinc-200 shadow-subtle p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-100 pb-3 mb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-zinc-100 text-zinc-950 border border-zinc-200">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-zinc-950">Work Hours &amp; Shift Summary</h3>
                <p className="text-xs text-zinc-500">Real-time attendance &amp; accumulated hours for this pay period</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-2xs text-zinc-500">
              <span className="px-2.5 py-1 bg-zinc-100 rounded-full font-mono font-bold text-zinc-800">
                Week: {workHoursSummary.weekLabel}
              </span>
              <span className="px-2.5 py-1 bg-zinc-100 rounded-full font-mono font-bold text-zinc-800">
                Month: {workHoursSummary.monthLabel}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            {/* 1. Today's Shift */}
            <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200/80">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">Today&apos;s Hours</span>
                <span className={`w-2 h-2 rounded-full ${isPunchedIn ? 'bg-zinc-950 animate-pulse' : 'bg-zinc-400'}`} />
              </div>
              <p className="text-2xl font-mono font-black text-zinc-950 mt-2">
                {liveHours.formatted}
              </p>
              <p className="text-xs text-zinc-500 mt-1">
                {liveHours.isLive ? `${liveHours.text} (Clocked in)` : liveHours.text}
              </p>
            </div>

            {/* 2. Total Weekly Hours */}
            <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200/80">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">Total Weekly Hours</span>
                <Calendar className="w-4 h-4 text-zinc-500" />
              </div>
              <p className="text-2xl font-mono font-black text-zinc-950 mt-2">
                {workHoursSummary.weeklyFormatted}
              </p>
              <p className="text-xs text-zinc-500 mt-1">
                {workHoursSummary.weeklyText} &bull; Monday to Sunday
              </p>
            </div>

            {/* 3. Total Monthly Hours */}
            <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200/80">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">Total Monthly Hours</span>
                <Clock className="w-4 h-4 text-zinc-500" />
              </div>
              <p className="text-2xl font-mono font-black text-zinc-950 mt-2">
                {workHoursSummary.monthlyFormatted}
              </p>
              <p className="text-xs text-zinc-500 mt-1">
                {workHoursSummary.monthlyText} &bull; {workHoursSummary.monthLabel}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 4. Main Analytics Grid: Monochrome Attendance Chart + Employee Status / Leaves */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 sm:gap-6">
        {/* Clickable Monochrome Attendance Chart */}
        <div
          onClick={() => navigate(isEmployee ? '/attendance' : '/reports')}
          className="lg:col-span-2 bg-white  p-5 sm:p-6 rounded-xl border border-zinc-200  shadow-subtle hover:border-zinc-400 :border-zinc-600 cursor-pointer transition-all"
          title={isEmployee ? 'Click to open My Attendance' : 'Click to open Attendance Analytics'}
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm sm:text-base font-bold text-zinc-950  flex items-center gap-1.5">
                <span>{isEmployee ? 'My Recent Attendance Activity' : 'Attendance Trend'}</span>
                <ArrowUpRight className="w-4 h-4 text-zinc-400" />
              </h3>
              <p className="text-xs text-zinc-500  mt-0.5">
                {isEmployee ? 'Click chart to view your full Attendance Logs' : 'Click chart to view full Attendance Analytics'}
              </p>
            </div>
            <span className="text-xs font-bold text-zinc-950  bg-zinc-100  px-2.5 py-1 rounded-md border border-zinc-200 ">
              Live Data
            </span>
          </div>

          <div className="h-64 w-full">
            {weeklyData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-zinc-400">
                No attendance logs recorded for this period yet.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f4f4f5" />
                  <XAxis dataKey="day" stroke="#71717a" fontSize={11} tickLine={false} />
                  <YAxis stroke="#71717a" fontSize={11} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#ffffff',
                      borderColor: '#e4e4e7',
                      borderRadius: '0.75rem',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.08)',
                      fontSize: '12px',
                      color: '#09090b',
                    }}
                  />
                  <Bar dataKey="present" fill="#18181b" radius={[4, 4, 0, 0]} name="Present" />
                  <Bar dataKey="absent" fill="#d4d4d8" radius={[4, 4, 0, 0]} name="Other" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Right Column: Employee Status (Management only) OR Quick Self-Service (Employees) */}
        <div className="space-y-4">
          {!isEmployee ? (
            <div className="bg-white  p-5 rounded-xl border border-zinc-200  shadow-subtle">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-950 ">Employee Status &amp; Type</h3>
                <Link to="/employees" className="text-[11px] font-bold text-zinc-900  hover:underline">
                  View All
                </Link>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-2.5 bg-zinc-100  rounded-lg border border-zinc-200/80 ">
                  <p className="text-lg font-black text-zinc-950 ">{empTypes.FULL_TIME ?? 0}</p>
                  <p className="text-[10px] font-semibold text-zinc-600 ">Full-Time</p>
                </div>
                <div className="p-2.5 bg-zinc-100  rounded-lg border border-zinc-200/80 ">
                  <p className="text-lg font-black text-zinc-950 ">{empTypes.CONTRACT ?? 0}</p>
                  <p className="text-[10px] font-semibold text-zinc-600 ">Contract</p>
                </div>
                <div className="p-2.5 bg-zinc-100  rounded-lg border border-zinc-200/80 ">
                  <p className="text-lg font-black text-zinc-950 ">{(empTypes.PART_TIME ?? 0) + (empTypes.INTERN ?? 0)}</p>
                  <p className="text-[10px] font-semibold text-zinc-600 ">Part/Intern</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white  p-5 rounded-xl border border-zinc-200  shadow-subtle">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-950 ">My Self-Service</h3>
                <span className="text-[10px] font-bold text-zinc-900  bg-zinc-100  px-2 py-0.5 rounded border border-zinc-200  uppercase">
                  Quick Access
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <Link
                  to="/attendance"
                  className="p-3 bg-zinc-50  hover:bg-zinc-100 :bg-zinc-800 border border-zinc-200  rounded-lg transition-all flex flex-col items-center text-center group"
                >
                  <Clock className="w-5 h-5 text-zinc-900  mb-1 group-hover:scale-110 transition-transform" />
                  <span className="font-bold text-zinc-900 ">Punch Clock</span>
                  <span className="text-[10px] text-zinc-400">Check In / Out</span>
                </Link>
                <Link
                  to="/leaves"
                  className="p-3 bg-zinc-50  hover:bg-zinc-100 :bg-zinc-800 border border-zinc-200  rounded-lg transition-all flex flex-col items-center text-center group"
                >
                  <Calendar className="w-5 h-5 text-zinc-900  mb-1 group-hover:scale-110 transition-transform" />
                  <span className="font-bold text-zinc-900 ">Apply Leave</span>
                  <span className="text-[10px] text-zinc-400">Request off</span>
                </Link>
                <Link
                  to="/payroll"
                  className="p-3 bg-zinc-50  hover:bg-zinc-100 :bg-zinc-800 border border-zinc-200  rounded-lg transition-all flex flex-col items-center text-center group"
                >
                  <Banknote className="w-5 h-5 text-zinc-900  mb-1 group-hover:scale-110 transition-transform" />
                  <span className="font-bold text-zinc-900 ">Payslips</span>
                  <span className="text-[10px] text-zinc-400">Download slip</span>
                </Link>
                <Link
                  to="/advances"
                  className="p-3 bg-zinc-50  hover:bg-zinc-100 :bg-zinc-800 border border-zinc-200  rounded-lg transition-all flex flex-col items-center text-center group"
                >
                  <Receipt className="w-5 h-5 text-zinc-900  mb-1 group-hover:scale-110 transition-transform" />
                  <span className="font-bold text-zinc-900 ">Salary Advance</span>
                  <span className="text-[10px] text-zinc-400">Request funds</span>
                </Link>
              </div>
            </div>
          )}

          <div className="bg-white  p-5 rounded-xl border border-zinc-200  shadow-subtle">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-950 ">Leave Type Distribution</h3>
              <Link to="/leaves" className="text-[11px] font-bold text-zinc-900  hover:underline">
                Leaves &rarr;
              </Link>
            </div>
            {leaveDist.length === 0 ? (
              <p className="text-xs text-zinc-400">No leave requests recorded.</p>
            ) : (
              <div className="space-y-2">
                {leaveDist.map((item) => (
                  <div key={item.name} className="flex items-center justify-between text-xs">
                    <span className="text-zinc-600  font-medium">{item.name}</span>
                    <span className="font-bold text-zinc-950  px-2 py-0.5 bg-zinc-100  border border-zinc-200/60  rounded">{item.count}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 5. Bottom Row: Branch Statistics & Recent Activity */}
      {!isEmployee && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6">
          {/* Branch Statistics */}
          <div className="bg-white  p-5 rounded-xl border border-zinc-200  shadow-subtle">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-950  flex items-center gap-2">
                <Building className="w-4 h-4 text-zinc-900 " />
                <span>Branch Statistics</span>
              </h3>
              <Link to="/organization" className="text-[11px] font-bold text-zinc-900  hover:underline">
                Manage Branches &rarr;
              </Link>
            </div>
            {branchStats.length === 0 ? (
              <p className="text-xs text-zinc-400">No branches configured.</p>
            ) : (
              <div className="space-y-2">
                {branchStats.map((br) => (
                  <Link
                    key={br.id}
                    to="/organization"
                    className="flex items-center justify-between p-3 bg-zinc-50  hover:bg-zinc-100 :bg-zinc-800/70 rounded-lg border border-zinc-200/80  transition-all"
                  >
                    <div>
                      <p className="text-xs font-bold text-zinc-950 ">{br.name}</p>
                      <p className="text-[11px] text-zinc-500 ">{br.city || 'Operational Site'}</p>
                    </div>
                    <span className="text-xs font-bold text-zinc-950  bg-zinc-200  border border-zinc-300  px-2.5 py-1 rounded-md">
                      {br.employee_count} Staff
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Recent Activity */}
          <div className="bg-white  p-5 rounded-xl border border-zinc-200  shadow-subtle">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-950  flex items-center gap-2">
                <Activity className="w-4 h-4 text-zinc-900 " />
                <span>Recent Activity</span>
              </h3>
              <span className="text-[11px] text-zinc-400">Click item to inspect</span>
            </div>
            {recentActivity.length === 0 ? (
              <p className="text-xs text-zinc-400">No recent activity found.</p>
            ) : (
              <div className="space-y-2">
                {recentActivity.map((act) => (
                  <Link
                    key={act.id}
                    to={act.link}
                    className="flex items-center justify-between p-2.5 bg-zinc-50  hover:bg-zinc-100 :bg-zinc-800 rounded-lg border border-transparent hover:border-zinc-200 :border-zinc-800 transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-zinc-950  truncate">{act.title}</p>
                      <p className="text-[11px] text-zinc-500  truncate">{act.subtitle}</p>
                    </div>
                    <ArrowUpRight className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
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

export default Dashboard;
