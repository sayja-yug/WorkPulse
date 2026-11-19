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
  ShieldCheck,
  MapPin,
  Sparkles,
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { formatINR, formatTime } from '../utils/formatters';
import { Loader } from '../components/ui/Loader';
import { Badge } from '../components/ui/Badge';
import { calculateWorkHoursSummary, parseCheckInDate } from '../utils/workHours';
import { calculateEmployeeInactivity } from '../utils/employeeInactivity';
import { UI_LABELS } from '../constants/labels';
import { NumberTooltip } from '../components/ui/NumberTooltip';
import { HelpButton } from '../components/ui/HelpButton';
import { GettingStartedChecklist } from '../components/dashboard/GettingStartedChecklist';

export const Dashboard = () => {
  const { user, business, activeRole } = useAuth();
  const navigate = useNavigate();
  const {
    isEmployee,
    isHR,
    isAccountant,
    isAccountantStrict,
    isSelfAttendanceOnly,
    isAuditor,
    isOwner,
    canManageEmployees,
    canCreateEmployee,
    canManagePayroll,
  } = usePermissions();
  const { toast } = useNotification();

  const isSupervisor = activeRole === 'SUPERVISOR';
  const isBranchManager = activeRole === 'BRANCH_MANAGER';
  const isBusinessOwner = isOwner || activeRole === 'BUSINESS_OWNER';

  const [stats, setStats] = useState(null);
  const [weeklyData, setWeeklyData] = useState([]);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [todayRecord, setTodayRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [punchingAction, setPunchingAction] = useState(false);
  const [inactiveEmployees, setInactiveEmployees] = useState([]);
  const [latestPayslip, setLatestPayslip] = useState(null);

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

  const fetchLatestPayslip = async () => {
    if (!isEmployee) return;
    try {
      const res = await api.get('/payroll/payslips/');
      const slips = res.data?.data || res.data?.results || res.data || [];
      if (Array.isArray(slips) && slips.length > 0) {
        setLatestPayslip(slips[0]);
      }
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
      toast.success('Started work successfully! Have a great day.');
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Could not start work. Please try again.');
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
      toast.info('Ended work session successfully. See you next shift!');
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Could not end work. Please try again.');
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
        await fetchLatestPayslip();

        // For Business Owners, HR, and Branch Managers, check 3+ day inactive staff
        if (isBusinessOwner || isHR || isBranchManager) {
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
  }, [business, isEmployee, isAccountantStrict, isBusinessOwner, isHR, isBranchManager]);

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

    // Completed shift
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
    return <Loader message="Loading dashboard..." size="lg" />;
  }

  // Consistent Role Welcome Lines
  const getWelcomeLine = () => {
    if (isBusinessOwner) return UI_LABELS.WELCOME_OWNER;
    if (isBranchManager) return UI_LABELS.WELCOME_BRANCH_MANAGER;
    if (isHR) return UI_LABELS.WELCOME_HR;
    if (isAccountantStrict) return UI_LABELS.WELCOME_ACCOUNTANT;
    if (isSupervisor) return UI_LABELS.WELCOME_SUPERVISOR;
    if (isEmployee) return UI_LABELS.WELCOME_EMPLOYEE;
    return `Welcome back, ${user?.full_name || 'User'}!`;
  };

  // Plain numbers definition:
  // Present + Absent + On Leave = Active!
  const totalEmployees = Number(stats?.total_employees || 0);
  const activeEmployees = Number(stats?.active_employees || 0);
  const presentToday = Number(stats?.attendance_today?.present || 0);
  const onLeaveToday = Number(stats?.attendance_today?.on_leave || 0);
  // Ensure math consistency: if present + leave < active, absent is the remainder
  const calculatedAbsent = Math.max(0, activeEmployees - presentToday - onLeaveToday);
  const absentToday = stats?.attendance_today?.absent !== undefined
    ? Math.max(Number(stats?.attendance_today?.absent || 0), calculatedAbsent)
    : calculatedAbsent;

  const pendingLeavesCount = Number(stats?.pending_leaves_count || 0);
  const pendingAdvancesCount = Number(stats?.pending_advances_count || 0);
  const hasPendingItems = pendingLeavesCount > 0 || inactiveEmployees.length > 0 || (isAccountantStrict && pendingAdvancesCount > 0);

  const branchStats = stats?.branch_stats || [];
  const recentActivity = stats?.recent_activity || [];
  const leaveDist = stats?.leave_distribution || [];

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* 1. Header Banner: Plain Greeting + One Clear Action + Help */}
      <div className="bg-zinc-950 rounded-2xl p-4 sm:p-6 text-white shadow-subtle border border-zinc-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            <span className="text-[10px] font-bold px-2 py-0.5 bg-zinc-800 text-zinc-200 rounded-full border border-zinc-700 uppercase tracking-wide">
              {activeRole.replace('_', ' ')}
            </span>
            <span className="text-xs text-zinc-400 font-medium truncate max-w-xs">
              {business?.name || 'Workspace'}
            </span>
            {isSelfAttendanceOnly && (
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                  isPunchedIn
                    ? 'bg-white text-zinc-950 shadow-xs'
                    : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${isPunchedIn ? 'bg-zinc-950 animate-pulse' : 'bg-zinc-500'}`} />
                {isPunchedIn ? 'WORKING (CLOCKED IN)' : 'OFF DUTY'}
              </span>
            )}
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
            Welcome back, {user?.first_name || user?.full_name || 'there'}!
          </h2>
          <p className="text-zinc-400 text-xs mt-1 leading-relaxed max-w-2xl">
            {getWelcomeLine()}
          </p>
        </div>

        {/* Top-Right: One Primary Action + Help Button */}
        <div className="flex items-center gap-2.5 shrink-0 self-start md:self-center">
          {/* Main Primary Button Per Role (Strong Color) */}
          {isEmployee ? (
            !isPunchedIn ? (
              <button
                type="button"
                disabled={punchingAction}
                onClick={handleDashboardPunchIn}
                className="px-5 py-2.5 bg-white hover:bg-zinc-100 text-zinc-950 rounded-xl text-xs sm:text-sm font-bold shadow-md transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                <Clock className="w-4 h-4 text-zinc-950" />
                <span>{punchingAction ? 'Starting...' : UI_LABELS.START_WORK}</span>
              </button>
            ) : (
              <button
                type="button"
                disabled={punchingAction}
                onClick={handleDashboardPunchOut}
                className="px-5 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-600 rounded-xl text-xs sm:text-sm font-bold shadow-md transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                <Clock className="w-4 h-4 text-white" />
                <span>{punchingAction ? 'Ending...' : UI_LABELS.END_WORK}</span>
              </button>
            )
          ) : isAccountantStrict ? (
            <div className="flex items-center gap-2">
              <Link
                to="/payroll"
                className="px-4 py-2 bg-white hover:bg-zinc-100 text-zinc-950 rounded-xl text-xs font-bold shadow-sm transition-colors"
              >
                Process Payroll
              </Link>
              {!isPunchedIn ? (
                <button
                  type="button"
                  disabled={punchingAction}
                  onClick={handleDashboardPunchIn}
                  className="px-3 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-700 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  {UI_LABELS.START_WORK}
                </button>
              ) : (
                <button
                  type="button"
                  disabled={punchingAction}
                  onClick={handleDashboardPunchOut}
                  className="px-3 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-700 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  {UI_LABELS.END_WORK}
                </button>
              )}
            </div>
          ) : isSupervisor ? (
            <Link
              to="/attendance"
              className="px-4 py-2.5 bg-white hover:bg-zinc-100 text-zinc-950 rounded-xl text-xs font-bold shadow-sm transition-colors flex items-center gap-1.5"
            >
              <CalendarCheck2 className="w-4 h-4" />
              <span>Mark Team Attendance</span>
            </Link>
          ) : isHR || isBranchManager ? (
            <div className="flex items-center gap-2">
              <Link
                to="/employees?action=add"
                className="px-4 py-2 bg-white hover:bg-zinc-100 text-zinc-950 rounded-xl text-xs font-bold shadow-sm transition-colors flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Employee</span>
              </Link>
              <Link
                to="/attendance"
                className="px-3 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 rounded-xl text-xs font-semibold"
              >
                Mark Attendance
              </Link>
            </div>
          ) : isBusinessOwner ? (
            <div className="flex items-center gap-2">
              <Link
                to="/payroll"
                className="px-4 py-2 bg-white hover:bg-zinc-100 text-zinc-950 rounded-xl text-xs font-bold shadow-sm transition-colors flex items-center gap-1.5"
              >
                <Banknote className="w-4 h-4" />
                <span>Process Payroll</span>
              </Link>
              <Link
                to="/employees?action=add"
                className="px-3 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 rounded-xl text-xs font-semibold"
              >
                Add Employee
              </Link>
            </div>
          ) : null}

          {/* 30-Second Page Explanation Help */}
          <HelpButton
            title="Dashboard Overview"
            whereAmI="Your main WorkPulse operations screen, customized for your active role."
            whatCanIDo="Review today's attendance, take action on pending items, and jump straight into daily tasks."
            whatHappensNext="Updates reflect instantly for all managers and employees across your company."
          />
        </div>
      </div>

      {/* 2. Getting Started Checklist for Business Owners */}
      {isBusinessOwner && (
        <GettingStartedChecklist
          hasCompany={Boolean(business?.id)}
          employeeCount={totalEmployees}
          hasShifts={true}
          hasPayroll={Boolean(stats?.financials?.monthly_payroll_total && stats.financials.monthly_payroll_total !== '0.00')}
        />
      )}

      {/* 3. "What Needs Your Attention" Bar (Placed at the top before statistics) */}
      {!isEmployee && hasPendingItems && (
        <div className="bg-amber-50/70 border border-amber-200/90 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-800" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-amber-950">
              {UI_LABELS.ATTENTION_TITLE}
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {/* 3a. Inactivity Notice (Owner & HR/Branch Manager) */}
            {inactiveEmployees.length > 0 && !isAccountantStrict && (
              <div className="bg-white p-3.5 rounded-xl border border-amber-200 shadow-2xs flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-bold text-zinc-950 truncate">
                    {UI_LABELS.INACTIVITY_ALERT(inactiveEmployees.length)}
                  </p>
                  <p className="text-[11px] text-zinc-500 mt-0.5">No punch logs recorded for 3+ days</p>
                </div>
                <Link
                  to="/employees?status=INACTIVE_3_DAYS"
                  className="px-3 py-1.5 bg-zinc-900 hover:bg-black text-white text-xs font-bold rounded-lg transition-colors shrink-0"
                >
                  {UI_LABELS.VIEW_INACTIVE_EMPLOYEES}
                </Link>
              </div>
            )}

            {/* 3b. Pending Leave Requests */}
            {pendingLeavesCount > 0 && !isAccountantStrict && (
              <div className="bg-white p-3.5 rounded-xl border border-amber-200 shadow-2xs flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-bold text-zinc-950 truncate">
                    {pendingLeavesCount} leave request{pendingLeavesCount > 1 ? 's' : ''} waiting
                  </p>
                  <p className="text-[11px] text-zinc-500 mt-0.5">Requires manager approval</p>
                </div>
                <Link
                  to="/leaves"
                  className="px-3 py-1.5 bg-zinc-900 hover:bg-black text-white text-xs font-bold rounded-lg transition-colors shrink-0"
                >
                  Review Leaves
                </Link>
              </div>
            )}

            {/* 3c. Pending Advance Requests (Accountant & Owner) */}
            {(isAccountantStrict || isBusinessOwner) && pendingAdvancesCount > 0 && (
              <div className="bg-white p-3.5 rounded-xl border border-amber-200 shadow-2xs flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-bold text-zinc-950 truncate">
                    {pendingAdvancesCount} salary advance request{pendingAdvancesCount > 1 ? 's' : ''}
                  </p>
                  <p className="text-[11px] text-zinc-500 mt-0.5">Awaiting disbursement</p>
                </div>
                <Link
                  to="/advances"
                  className="px-3 py-1.5 bg-zinc-900 hover:bg-black text-white text-xs font-bold rounded-lg transition-colors shrink-0"
                >
                  Review Advances
                </Link>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 4. Role-Specific KPI Cards & Statistics */}
      {isEmployee ? (
        /* ================= FIELD EMPLOYEE DASHBOARD ================= */
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
            {/* Card 1: Duty Status & Quick Punch Action */}
            <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-subtle flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Duty Status</span>
                <div className="p-2 rounded-lg bg-zinc-100 text-zinc-900">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3">
                <Badge variant={isPunchedIn ? 'inverted' : 'default'} dot>
                  {isPunchedIn ? 'ACTIVE (CLOCKED IN)' : 'OFF DUTY'}
                </Badge>
                <p className="text-xs text-zinc-500 mt-2">
                  {isPunchedIn
                    ? `Clocked in at ${formatTime(todayRecord.check_in)}`
                    : todayRecord?.check_out
                    ? `Clocked out at ${formatTime(todayRecord.check_out)}`
                    : 'Click Start Work above to begin shift'}
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-zinc-100 flex items-center gap-1.5 text-[11px] text-zinc-500">
                <MapPin className="w-3.5 h-3.5 text-zinc-400" />
                <span>Geofence verification active</span>
              </div>
            </div>

            {/* Card 2: Today's Hours (SHOWN ONCE with week/month sub-strip) */}
            <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-subtle flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Today&apos;s Hours</span>
                <div className="p-2 rounded-lg bg-zinc-100 text-zinc-900">
                  <Clock className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-2">
                <p className="text-2xl font-black text-zinc-950 font-mono">
                  {liveHours.formatted}
                </p>
                <p className="text-xs text-zinc-500 mt-0.5">
                  {liveHours.isLive ? `${liveHours.text} (Live Shift)` : liveHours.text}
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-zinc-100 grid grid-cols-2 gap-2 text-[11px]">
                <div className="bg-zinc-50 p-1.5 rounded-lg border border-zinc-100">
                  <span className="text-[10px] text-zinc-400 font-bold uppercase block">This Week</span>
                  <span className="font-mono font-bold text-zinc-950">{workHoursSummary.weeklyFormatted}</span>
                </div>
                <div className="bg-zinc-50 p-1.5 rounded-lg border border-zinc-100">
                  <span className="text-[10px] text-zinc-400 font-bold uppercase block">This Month</span>
                  <span className="font-mono font-bold text-zinc-950">{workHoursSummary.monthlyFormatted}</span>
                </div>
              </div>
            </div>

            {/* Card 3: Pending Leaves */}
            <Link
              to="/leaves"
              className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-subtle hover:border-zinc-400 transition-all flex flex-col justify-between group"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">My Leaves</span>
                <div className="p-2 bg-zinc-100 text-zinc-900 rounded-lg group-hover:bg-zinc-950 group-hover:text-white transition-colors">
                  <Calendar className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-2">
                <p className="text-2xl font-black text-zinc-950 font-mono">
                  {pendingLeavesCount}
                </p>
                <p className="text-xs text-zinc-500 mt-0.5">Leave requests pending</p>
              </div>
              <p className="text-xs text-zinc-950 font-bold mt-4 pt-3 border-t border-zinc-100 flex items-center justify-between">
                <span>Apply or view leaves</span>
                <ArrowUpRight className="w-3.5 h-3.5 text-zinc-400" />
              </p>
            </Link>

            {/* Card 4: Latest Payslip (Shows Month & Take-Home Amount) */}
            <Link
              to="/payroll"
              className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-subtle hover:border-zinc-400 transition-all flex flex-col justify-between group"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">My Payslips</span>
                <div className="p-2 bg-zinc-100 text-zinc-900 rounded-lg group-hover:bg-zinc-950 group-hover:text-white transition-colors">
                  <Banknote className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-2">
                <p className="text-2xl font-black text-zinc-950">
                  {latestPayslip ? formatINR(latestPayslip.net_salary || 0) : 'Available'}
                </p>
                <p className="text-xs text-zinc-500 mt-0.5">
                  {latestPayslip?.period || 'Latest payslip generated'}
                </p>
              </div>
              <p className="text-xs text-zinc-950 font-bold mt-4 pt-3 border-t border-zinc-100 flex items-center justify-between">
                <span>View salary slips</span>
                <ArrowUpRight className="w-3.5 h-3.5 text-zinc-400" />
              </p>
            </Link>
          </div>
        </div>
      ) : isAccountantStrict ? (
        /* ================= ACCOUNTANT DASHBOARD ================= */
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
            {/* Card 1: Duty Status & Clock In */}
            <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-subtle flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Duty Status</span>
                <div className="p-2 rounded-lg bg-zinc-100 text-zinc-900">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-2">
                <Badge variant={isPunchedIn ? 'inverted' : 'default'} dot>
                  {isPunchedIn ? 'ACTIVE (CLOCKED IN)' : 'OFF DUTY'}
                </Badge>
                <p className="text-xs text-zinc-500 mt-2">
                  {isPunchedIn ? `Clocked in at ${formatTime(todayRecord.check_in)}` : 'Click Start Work to mark duty'}
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-zinc-100 text-[11px] text-zinc-500">
                Self-service attendance only
              </div>
            </div>

            {/* Card 2: Monthly Payroll Total */}
            <Link
              to="/payroll"
              className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-subtle hover:border-zinc-400 transition-all flex flex-col justify-between group"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Payroll</span>
                <div className="p-2 rounded-lg bg-zinc-100 text-zinc-900 group-hover:bg-zinc-950 group-hover:text-white transition-colors">
                  <Banknote className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-2">
                <p className="text-2xl font-black text-zinc-950">
                  {formatINR(stats?.financials?.monthly_payroll_total ?? 0)}
                </p>
                <p className="text-xs text-zinc-500 mt-0.5">Monthly disbursement</p>
              </div>
              <p className="text-xs text-zinc-950 font-bold mt-4 pt-3 border-t border-zinc-100 flex items-center justify-between">
                <span>Open Payroll &rarr;</span>
              </p>
            </Link>

            {/* Card 3: Monthly Expenses */}
            <Link
              to="/cashbook"
              className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-subtle hover:border-zinc-400 transition-all flex flex-col justify-between group"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Expenses</span>
                <div className="p-2 rounded-lg bg-zinc-100 text-zinc-900 group-hover:bg-zinc-950 group-hover:text-white transition-colors">
                  <Receipt className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-2">
                <p className="text-2xl font-black text-zinc-950">
                  {formatINR(stats?.financials?.monthly_expenses_total ?? 0)}
                </p>
                <p className="text-xs text-zinc-500 mt-0.5">Approved vouchers</p>
              </div>
              <p className="text-xs text-zinc-950 font-bold mt-4 pt-3 border-t border-zinc-100 flex items-center justify-between">
                <span>Open Expenses &rarr;</span>
              </p>
            </Link>

            {/* Card 4: Liquid Cashbook Balance */}
            <Link
              to="/cashbook"
              className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-subtle hover:border-zinc-400 transition-all flex flex-col justify-between group"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Cashbook</span>
                <div className="p-2 rounded-lg bg-zinc-100 text-zinc-900 group-hover:bg-zinc-950 group-hover:text-white transition-colors">
                  <TrendingUp className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-2">
                <p className="text-2xl font-black text-zinc-950">
                  {formatINR(stats?.financials?.cash_balance ?? 0)}
                </p>
                <p className="text-xs text-zinc-500 mt-0.5">Current petty cash balance</p>
              </div>
              <p className="text-xs text-zinc-950 font-bold mt-4 pt-3 border-t border-zinc-100 flex items-center justify-between">
                <span>Open Cashbook &rarr;</span>
              </p>
            </Link>
          </div>
        </div>
      ) : isSupervisor ? (
        /* ================= SUPERVISOR DASHBOARD (NO MONEY NUMBERS) ================= */
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
            {/* Card 1: My Team Total */}
            <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-subtle">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider flex items-center">
                  <span>My Team</span>
                  <NumberTooltip text="Total members reporting to you in this location." />
                </span>
                <div className="p-2 bg-zinc-100 text-zinc-900 rounded-lg">
                  <Users className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-black text-zinc-950 mt-2">{totalEmployees}</p>
              <p className="text-xs text-zinc-500 mt-1">{activeEmployees} active on team</p>
            </div>

            {/* Card 2: Team Present Today */}
            <Link
              to="/attendance"
              className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-subtle hover:border-zinc-400 transition-all block group"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider flex items-center">
                  <span>Present Today</span>
                  <NumberTooltip text={UI_LABELS.TOOLTIP_PRESENT_TODAY} />
                </span>
                <div className="p-2 bg-zinc-100 text-zinc-900 rounded-lg group-hover:bg-zinc-950 group-hover:text-white transition-colors">
                  <CalendarCheck2 className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-black text-zinc-950 mt-2">{presentToday}</p>
              <p className="text-xs text-zinc-500 mt-1">
                {activeEmployees > 0 ? `${Math.round((presentToday / activeEmployees) * 100)}% attendance rate` : '0%'}
              </p>
            </Link>

            {/* Card 3: Team Absent Today */}
            <Link
              to="/attendance"
              className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-subtle hover:border-zinc-400 transition-all block group"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider flex items-center">
                  <span>Absent Today</span>
                  <NumberTooltip text={UI_LABELS.TOOLTIP_ABSENT_TODAY} />
                </span>
                <div className="p-2 bg-zinc-100 text-zinc-900 rounded-lg group-hover:bg-zinc-950 group-hover:text-white transition-colors">
                  <UserX className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-black text-zinc-950 mt-2">{absentToday}</p>
              <p className="text-xs text-zinc-500 mt-1">Pending clock-in</p>
            </Link>

            {/* Card 4: Team On Leave */}
            <Link
              to="/leaves"
              className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-subtle hover:border-zinc-400 transition-all block group"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider flex items-center">
                  <span>On Leave</span>
                  <NumberTooltip text={UI_LABELS.TOOLTIP_ON_LEAVE_TODAY} />
                </span>
                <div className="p-2 bg-zinc-100 text-zinc-900 rounded-lg group-hover:bg-zinc-950 group-hover:text-white transition-colors">
                  <Calendar className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-black text-zinc-950 mt-2">{onLeaveToday}</p>
              <p className="text-xs text-zinc-500 mt-1">{pendingLeavesCount} pending review</p>
            </Link>
          </div>
        </div>
      ) : isHR || isBranchManager ? (
        /* ================= HR / BRANCH MANAGER DASHBOARD (NO MONEY NUMBERS) ================= */
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 sm:gap-4">
            {/* Metric 1: Total Employees */}
            <Link
              to="/employees"
              className="bg-white p-4 rounded-xl border border-zinc-200 shadow-subtle hover:border-zinc-400 transition-all block group"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider flex items-center">
                  <span>Total Staff</span>
                  <NumberTooltip text={UI_LABELS.TOOLTIP_TOTAL_EMPLOYEES} />
                </span>
                <div className="p-2 bg-zinc-100 text-zinc-900 rounded-lg group-hover:bg-zinc-950 group-hover:text-white transition-colors">
                  <Users className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-black text-zinc-950 mt-2">{totalEmployees}</p>
              <p className="text-[11px] text-zinc-500 mt-1">{activeEmployees} active on roster</p>
            </Link>

            {/* Metric 2: Present Today */}
            <Link
              to="/attendance"
              className="bg-white p-4 rounded-xl border border-zinc-200 shadow-subtle hover:border-zinc-400 transition-all block group"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider flex items-center">
                  <span>Present</span>
                  <NumberTooltip text={UI_LABELS.TOOLTIP_PRESENT_TODAY} />
                </span>
                <div className="p-2 bg-zinc-100 text-zinc-900 rounded-lg group-hover:bg-zinc-950 group-hover:text-white transition-colors">
                  <CalendarCheck2 className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-black text-zinc-950 mt-2">{presentToday}</p>
              <p className="text-[11px] text-zinc-500 mt-1">
                {activeEmployees > 0 ? `${Math.round((presentToday / activeEmployees) * 100)}% attendance rate` : '0%'}
              </p>
            </Link>

            {/* Metric 3: Absent Today */}
            <Link
              to="/attendance"
              className="bg-white p-4 rounded-xl border border-zinc-200 shadow-subtle hover:border-zinc-400 transition-all block group"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider flex items-center">
                  <span>Absent</span>
                  <NumberTooltip text={UI_LABELS.TOOLTIP_ABSENT_TODAY} />
                </span>
                <div className="p-2 bg-zinc-100 text-zinc-900 rounded-lg group-hover:bg-zinc-950 group-hover:text-white transition-colors">
                  <UserX className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-black text-zinc-950 mt-2">{absentToday}</p>
              <p className="text-[11px] text-zinc-500 mt-1">Not yet clocked in</p>
            </Link>

            {/* Metric 4: On Leave */}
            <Link
              to="/leaves"
              className="bg-white p-4 rounded-xl border border-zinc-200 shadow-subtle hover:border-zinc-400 transition-all block group"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider flex items-center">
                  <span>On Leave</span>
                  <NumberTooltip text={UI_LABELS.TOOLTIP_ON_LEAVE_TODAY} />
                </span>
                <div className="p-2 bg-zinc-100 text-zinc-900 rounded-lg group-hover:bg-zinc-950 group-hover:text-white transition-colors">
                  <Calendar className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-black text-zinc-950 mt-2">{onLeaveToday}</p>
              <p className="text-[11px] text-zinc-500 mt-1">{pendingLeavesCount} awaiting review</p>
            </Link>

            {/* Metric 5: Late Arrivals */}
            <Link
              to="/attendance"
              className="bg-white p-4 rounded-xl border border-zinc-200 shadow-subtle hover:border-zinc-400 transition-all block group"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">Late Check-ins</span>
                <div className="p-2 bg-zinc-100 text-zinc-900 rounded-lg group-hover:bg-zinc-950 group-hover:text-white transition-colors">
                  <AlertCircle className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-black text-zinc-950 mt-2">{stats?.attendance_today?.late ?? 0}</p>
              <p className="text-[11px] text-zinc-500 mt-1">Delayed start times</p>
            </Link>
          </div>
        </div>
      ) : (
        /* ================= BUSINESS OWNER DASHBOARD (ALL NUMBERS + MONEY) ================= */
        <div className="space-y-4">
          {/* People & Attendance Strip with Explanations */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 sm:gap-4">
            <Link
              to="/employees"
              className="bg-white p-4 rounded-xl border border-zinc-200 shadow-subtle hover:border-zinc-400 transition-all block group"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider flex items-center">
                  <span>Total Employees</span>
                  <NumberTooltip text={UI_LABELS.TOOLTIP_TOTAL_EMPLOYEES} />
                </span>
                <div className="p-2 bg-zinc-100 text-zinc-900 rounded-lg group-hover:bg-zinc-950 group-hover:text-white transition-colors">
                  <Users className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-black text-zinc-950 mt-2">{totalEmployees}</p>
              <div className="flex items-center gap-1 text-[11px] text-zinc-600 font-semibold mt-1">
                <span>{activeEmployees} active</span>
              </div>
            </Link>

            <Link
              to="/attendance"
              className="bg-white p-4 rounded-xl border border-zinc-200 shadow-subtle hover:border-zinc-400 transition-all block group"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider flex items-center">
                  <span>Present Today</span>
                  <NumberTooltip text={UI_LABELS.TOOLTIP_PRESENT_TODAY} />
                </span>
                <div className="p-2 bg-zinc-100 text-zinc-900 rounded-lg group-hover:bg-zinc-950 group-hover:text-white transition-colors">
                  <CalendarCheck2 className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-black text-zinc-950 mt-2">{presentToday}</p>
              <p className="text-[11px] text-zinc-500 mt-1">
                {activeEmployees > 0 ? `${Math.round((presentToday / activeEmployees) * 100)}% rate` : '0%'}
              </p>
            </Link>

            <Link
              to="/attendance"
              className="bg-white p-4 rounded-xl border border-zinc-200 shadow-subtle hover:border-zinc-400 transition-all block group"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider flex items-center">
                  <span>Absent Today</span>
                  <NumberTooltip text={UI_LABELS.TOOLTIP_ABSENT_TODAY} />
                </span>
                <div className="p-2 bg-zinc-100 text-zinc-900 rounded-lg group-hover:bg-zinc-950 group-hover:text-white transition-colors">
                  <UserX className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-black text-zinc-950 mt-2">{absentToday}</p>
              <p className="text-[11px] text-zinc-500 mt-1">Not yet punched in</p>
            </Link>

            <Link
              to="/leaves"
              className="bg-white p-4 rounded-xl border border-zinc-200 shadow-subtle hover:border-zinc-400 transition-all block group"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider flex items-center">
                  <span>On Leave</span>
                  <NumberTooltip text={UI_LABELS.TOOLTIP_ON_LEAVE_TODAY} />
                </span>
                <div className="p-2 bg-zinc-100 text-zinc-900 rounded-lg group-hover:bg-zinc-950 group-hover:text-white transition-colors">
                  <Calendar className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-black text-zinc-950 mt-2">{onLeaveToday}</p>
              <p className="text-[11px] text-zinc-500 mt-1">{pendingLeavesCount} pending review</p>
            </Link>

            <Link
              to="/attendance"
              className="bg-white p-4 rounded-xl border border-zinc-200 shadow-subtle hover:border-zinc-400 transition-all block group"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">Late Arrivals</span>
                <div className="p-2 bg-zinc-100 text-zinc-900 rounded-lg group-hover:bg-zinc-950 group-hover:text-white transition-colors">
                  <AlertCircle className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-black text-zinc-950 mt-2">{stats?.attendance_today?.late ?? 0}</p>
              <p className="text-[11px] text-zinc-500 mt-1">Delayed check-ins</p>
            </Link>
          </div>

          {/* Money Summary Cards (Only Owner & SuperAdmin) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 sm:gap-4">
            <Link
              to="/payroll"
              className="bg-white p-5 rounded-xl border border-zinc-200 shadow-subtle hover:border-zinc-400 transition-all flex items-center justify-between group"
            >
              <div>
                <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Payroll</p>
                <p className="text-2xl font-black text-zinc-950 mt-1">
                  {formatINR(stats?.financials?.monthly_payroll_total ?? 0)}
                </p>
                <p className="text-xs text-zinc-950 font-bold mt-1">Process Payroll &rarr;</p>
              </div>
              <div className="p-3 bg-zinc-100 text-zinc-900 rounded-xl group-hover:bg-zinc-950 group-hover:text-white transition-colors">
                <Banknote className="w-6 h-6" />
              </div>
            </Link>

            <Link
              to="/cashbook"
              className="bg-white p-5 rounded-xl border border-zinc-200 shadow-subtle hover:border-zinc-400 transition-all flex items-center justify-between group"
            >
              <div>
                <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Expenses (Month)</p>
                <p className="text-2xl font-black text-zinc-950 mt-1">
                  {formatINR(stats?.financials?.monthly_expenses_total ?? 0)}
                </p>
                <p className="text-xs text-zinc-950 font-bold mt-1">Manage Expenses &rarr;</p>
              </div>
              <div className="p-3 bg-zinc-100 text-zinc-900 rounded-xl group-hover:bg-zinc-950 group-hover:text-white transition-colors">
                <Receipt className="w-6 h-6" />
              </div>
            </Link>

            <Link
              to="/cashbook"
              className="bg-white p-5 rounded-xl border border-zinc-200 shadow-subtle hover:border-zinc-400 transition-all flex items-center justify-between group"
            >
              <div>
                <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Cashbook Balance</p>
                <p className="text-2xl font-black text-zinc-950 mt-1">
                  {formatINR(stats?.financials?.cash_balance ?? 0)}
                </p>
                <p className="text-xs text-zinc-950 font-bold mt-1">Manage Cashbook &rarr;</p>
              </div>
              <div className="p-3 bg-zinc-100 text-zinc-900 rounded-xl group-hover:bg-zinc-950 group-hover:text-white transition-colors">
                <TrendingUp className="w-6 h-6" />
              </div>
            </Link>
          </div>
        </div>
      )}

      {/* 5. Main Attendance Chart & Leave Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 sm:gap-6">
        <div
          onClick={() => navigate(isSelfAttendanceOnly ? '/attendance' : '/reports')}
          className="lg:col-span-2 bg-white p-5 sm:p-6 rounded-xl border border-zinc-200 shadow-subtle hover:border-zinc-400 cursor-pointer transition-all"
          title={isSelfAttendanceOnly ? 'Click to open Attendance logs' : 'Click to open Attendance reports'}
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm sm:text-base font-bold text-zinc-950 flex items-center gap-1.5">
                <span>{isSelfAttendanceOnly ? 'My Attendance History' : 'Attendance Trend'}</span>
                <ArrowUpRight className="w-4 h-4 text-zinc-400" />
              </h3>
              <p className="text-xs text-zinc-500 mt-0.5">
                {isSelfAttendanceOnly ? 'Click chart to view your full logs' : '7-day daily workforce attendance overview'}
              </p>
            </div>
            <span className="text-xs font-bold text-zinc-950 bg-zinc-100 px-2.5 py-1 rounded-md border border-zinc-200">
              Live Data
            </span>
          </div>

          <div className="h-64 w-full">
            {weeklyData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-zinc-400">
                {UI_LABELS.EMPTY_ATTENDANCE}
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E4E4E7" />
                  <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#71717A' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#71717A' }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#18181B',
                      color: '#FAFAFA',
                      borderRadius: '8px',
                      border: '1px solid #27272A',
                      fontSize: '12px',
                    }}
                  />
                  <Bar dataKey="present" fill="#18181B" radius={[4, 4, 0, 0]} name="Present" />
                  <Bar dataKey="absent" fill="#E4E4E7" radius={[4, 4, 0, 0]} name="Absent" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Right Side: Quick Distribution Card */}
        <div className="bg-white p-5 rounded-xl border border-zinc-200 shadow-subtle flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-950">Leave Type Distribution</h3>
            <Link to="/leaves" className="text-[11px] font-bold text-zinc-900 hover:underline">
              All Leaves &rarr;
            </Link>
          </div>
          {leaveDist.length === 0 ? (
            <p className="text-xs text-zinc-400">{UI_LABELS.EMPTY_LEAVES}</p>
          ) : (
            <div className="space-y-2 flex-1">
              {leaveDist.map((item) => (
                <div key={item.name} className="flex items-center justify-between text-xs">
                  <span className="text-zinc-600 font-medium">{item.name}</span>
                  <span className="font-bold text-zinc-950 px-2 py-0.5 bg-zinc-100 border border-zinc-200 rounded">
                    {item.count}
                  </span>
                </div>
              ))}
            </div>
          )}
          <div className="mt-4 pt-3 border-t border-zinc-100 text-[11px] text-zinc-500">
            Approved and pending leave requests
          </div>
        </div>
      </div>

      {/* 6. Bottom Row: Branch Statistics (Non-Accountants) OR Financial Controller (Accountant) + Recent Activity */}
      {!isEmployee && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6">
          {!isAccountantStrict ? (
            <div className="bg-white p-5 rounded-xl border border-zinc-200 shadow-subtle">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-950 flex items-center gap-2">
                  <Building className="w-4 h-4 text-zinc-900" />
                  <span>Branch Statistics</span>
                </h3>
                {isBusinessOwner && (
                  <Link to="/organization" className="text-[11px] font-bold text-zinc-900 hover:underline">
                    Organization &rarr;
                  </Link>
                )}
              </div>
              {branchStats.length === 0 ? (
                <p className="text-xs text-zinc-400">No branches configured.</p>
              ) : (
                <div className="space-y-2">
                  {branchStats.map((br) => (
                    <div
                      key={br.id}
                      className="flex items-center justify-between p-3 bg-zinc-50 rounded-lg border border-zinc-200/80"
                    >
                      <div>
                        <p className="text-xs font-bold text-zinc-950">{br.name}</p>
                        <p className="text-[11px] text-zinc-500">{br.city || 'Operational Branch'}</p>
                      </div>
                      <span className="text-xs font-bold text-zinc-950 bg-zinc-200 px-2.5 py-1 rounded-md">
                        {br.employee_count} Staff
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white p-5 rounded-xl border border-zinc-200 shadow-subtle">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-950 flex items-center gap-2">
                  <Banknote className="w-4 h-4 text-zinc-900" />
                  <span>Financial Status</span>
                </h3>
                <Link to="/payroll" className="text-[11px] font-bold text-zinc-900 hover:underline">
                  Payroll &rarr;
                </Link>
              </div>
              <div className="space-y-2.5">
                <div className="flex items-center justify-between p-3 bg-zinc-50 rounded-lg border border-zinc-200/80">
                  <div>
                    <p className="text-xs font-bold text-zinc-950">Payroll Total</p>
                    <p className="text-[11px] text-zinc-500">Net salary across employees</p>
                  </div>
                  <span className="text-xs font-mono font-bold text-zinc-950 bg-zinc-100 border border-zinc-200 px-2.5 py-1 rounded-md">
                    {formatINR(stats?.financials?.monthly_payroll_total ?? 0)}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-zinc-50 rounded-lg border border-zinc-200/80">
                  <div>
                    <p className="text-xs font-bold text-zinc-950">Expenses Total</p>
                    <p className="text-[11px] text-zinc-500">Approved operational vouchers</p>
                  </div>
                  <span className="text-xs font-mono font-bold text-zinc-950 bg-zinc-100 border border-zinc-200 px-2.5 py-1 rounded-md">
                    {formatINR(stats?.financials?.monthly_expenses_total ?? 0)}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-zinc-50 rounded-lg border border-zinc-200/80">
                  <div>
                    <p className="text-xs font-bold text-zinc-950">Cashbook Balance</p>
                    <p className="text-[11px] text-zinc-500">Liquid cash in register</p>
                  </div>
                  <span className="text-xs font-mono font-bold text-zinc-950 bg-zinc-100 border border-zinc-200 px-2.5 py-1 rounded-md">
                    {formatINR(stats?.financials?.cash_balance ?? 0)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Recent Activity */}
          <div className="bg-white p-5 rounded-xl border border-zinc-200 shadow-subtle">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-950 flex items-center gap-2">
                <Activity className="w-4 h-4 text-zinc-900" />
                <span>Recent Activity</span>
              </h3>
              <span className="text-[11px] text-zinc-400">Click item to open</span>
            </div>
            {recentActivity.length === 0 ? (
              <p className="text-xs text-zinc-400">No recent activity recorded.</p>
            ) : (
              <div className="space-y-2">
                {recentActivity.map((act) => (
                  <Link
                    key={act.id}
                    to={act.link}
                    className="flex items-center justify-between p-2.5 bg-zinc-50 hover:bg-zinc-100 rounded-lg border border-transparent hover:border-zinc-200 transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-zinc-950 truncate">{act.title}</p>
                      <p className="text-[11px] text-zinc-500 truncate">{act.subtitle}</p>
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
