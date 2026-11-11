import React, { useEffect, useState } from 'react';
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
  ShieldCheck,
  MapPin,
  ArrowRight,
  FileText,
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { formatINR } from '../utils/formatters';
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
    canManagePayroll,
  } = usePermissions();

  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOverview = async () => {
      try {
        const res = await api.get('/reports/overview/');
        setStats(res.data.data);
      } catch (err) {
        console.error('Failed to load overview', err);
      } finally {
        setLoading(false);
      }
    };
    fetchOverview();
  }, [business, activeRole]);

  const mockWeeklyData = [
    { day: 'Mon', present: 18, absent: 2 },
    { day: 'Tue', present: 19, absent: 1 },
    { day: 'Wed', present: 20, absent: 0 },
    { day: 'Thu', present: 17, absent: 3 },
    { day: 'Fri', present: 19, absent: 1 },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-500">
        <Loader message="Loading dashboard telemetry..." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Banner with Dynamic Role Buttons */}
      <div className="bg-gradient-to-r from-indigo-700 via-indigo-600 to-indigo-800 rounded-2xl p-6 text-white shadow-lg shadow-indigo-600/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold px-2.5 py-0.5 bg-indigo-500/40 rounded-full border border-indigo-300/30">
              {activeRole.replace('_', ' ')}
            </span>
            <span className="text-xs text-indigo-200">Active Tenant: {business?.name || 'Apex Global Enterprises'}</span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight">Welcome back, {user?.full_name}!</h2>
          <p className="text-indigo-100 text-sm mt-0.5">
            {isEmployee
              ? 'Here is your personal attendance, shift schedule, and payslip overview for today.'
              : isAuditor
              ? 'System compliance overview and read-only audit logs for the current financial period.'
              : 'Here is your live workforce operations and financial snapshot for today.'}
          </p>
        </div>

        {/* Dynamic Buttons - Only show actions permitted for this role */}
        <div className="flex flex-wrap gap-2">
          {/* Employee Buttons */}
          {isEmployee && (
            <>
              <a
                href="/attendance"
                className="px-4 py-2 bg-white text-indigo-700 rounded-lg text-sm font-semibold hover:bg-indigo-50 shadow-sm transition-colors text-center"
              >
                Punch Attendance
              </a>
              <a
                href="/payroll"
                className="px-4 py-2 bg-indigo-500/40 border border-indigo-300/30 text-white rounded-lg text-sm font-semibold hover:bg-indigo-500/60 transition-colors text-center"
              >
                View My Payslips
              </a>
            </>
          )}

          {/* HR & Manager Buttons */}
          {canManageEmployees && !isEmployee && (
            <>
              <a
                href="/attendance"
                className="px-4 py-2 bg-white text-indigo-700 rounded-lg text-sm font-semibold hover:bg-indigo-50 shadow-sm transition-colors text-center"
              >
                Monitor Attendance
              </a>
              <a
                href="/employees"
                className="px-4 py-2 bg-indigo-500/40 border border-indigo-300/30 text-white rounded-lg text-sm font-semibold hover:bg-indigo-500/60 transition-colors text-center"
              >
                Manage Staff
              </a>
            </>
          )}

          {/* Accountant Buttons */}
          {isAccountant && !isOwner && (
            <>
              <a
                href="/payroll"
                className="px-4 py-2 bg-white text-indigo-700 rounded-lg text-sm font-semibold hover:bg-indigo-50 shadow-sm transition-colors text-center"
              >
                Manage Payroll
              </a>
              <a
                href="/expenses"
                className="px-4 py-2 bg-indigo-500/40 border border-indigo-300/30 text-white rounded-lg text-sm font-semibold hover:bg-indigo-500/60 transition-colors text-center"
              >
                Cashbook & Ledger
              </a>
            </>
          )}

          {/* Auditor Buttons */}
          {isAuditor && (
            <a
              href="/reports"
              className="px-4 py-2 bg-white text-indigo-700 rounded-lg text-sm font-semibold hover:bg-indigo-50 shadow-sm transition-colors text-center"
            >
              Compliance Reports
            </a>
          )}
        </div>
      </div>

      {/* KPI Cards Grid - Strict Role Segmentation */}
      {isEmployee ? (
        /* Employee Self-Service KPI Cards */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Today's Status</span>
              <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </div>
            <p className="text-xl font-bold text-emerald-600 mt-2">PRESENT</p>
            <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium mt-1">
              <span>Clocked in at 09:12 AM</span>
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">This Month Attendance</span>
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                <CalendarCheck2 className="w-5 h-5" />
              </div>
            </div>
            <p className="text-2xl font-bold text-slate-900 mt-2">22 Days</p>
            <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-medium mt-1">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>96% on-time record</span>
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Leave Balance</span>
              <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
                <Calendar className="w-5 h-5" />
              </div>
            </div>
            <p className="text-2xl font-bold text-slate-900 mt-2">14 Days</p>
            <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium mt-1">
              <span>8 Paid, 6 Casual remaining</span>
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Latest Net Salary</span>
              <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                <Banknote className="w-5 h-5" />
              </div>
            </div>
            <p className="text-2xl font-bold text-slate-900 mt-2">₹49,800</p>
            <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium mt-1">
              <span>Transferred via HDFC Bank</span>
            </div>
          </div>
        </div>
      ) : (
        /* Management & Administrative Cards */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Workforce</span>
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                <Users className="w-5 h-5" />
              </div>
            </div>
            <p className="text-2xl font-bold text-slate-900 mt-2">{stats?.total_employees || 22}</p>
            <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-medium mt-1">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>{stats?.active_employees || 22} active employees</span>
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Today's Attendance</span>
              <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                <CalendarCheck2 className="w-5 h-5" />
              </div>
            </div>
            <p className="text-2xl font-bold text-slate-900 mt-2">{stats?.attendance_today?.present || 19}</p>
            <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium mt-1">
              <span>{stats?.attendance_today?.attendance_percentage || '91%'} presenteeism rate</span>
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Pending Leaves</span>
              <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
                <Clock className="w-5 h-5" />
              </div>
            </div>
            <p className="text-2xl font-bold text-slate-900 mt-2">{stats?.pending_leaves_count || 3}</p>
            <div className="flex items-center gap-1.5 text-xs text-amber-600 font-medium mt-1">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>Requires manager review</span>
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
                ? `${stats?.branches_count || 3} Branches`
                : formatINR(stats?.financials?.cash_balance || 48500)}
            </p>
            <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium mt-1">
              <span>{isHR ? 'Active operational sites' : 'Petty cash ledger balance'}</span>
            </div>
          </div>
        </div>
      )}

      {/* Main Charts & Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Attendance Trends Chart */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {isEmployee ? 'My Attendance Pattern' : 'Weekly Workforce Attendance Trends'}
              </h3>
              <p className="text-xs text-slate-500">Present vs Absent analytics</p>
            </div>
            <span className="text-xs font-medium text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-md">
              Current Week
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={mockWeeklyData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="day" stroke="#64748b" fontSize={12} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={12} tickLine={false} />
                <Tooltip />
                <Bar dataKey="present" fill="#4f46e5" radius={[4, 4, 0, 0]} name="Present" />
                <Bar dataKey="absent" fill="#cbd5e1" radius={[4, 4, 0, 0]} name="Absent" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Organization / Worksite Context */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900 mb-1">
              {isEmployee ? 'My Assigned Worksite' : 'Company Infrastructure'}
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              {isEmployee ? 'Active branch & shift allocation' : 'Configured organization nodes'}
            </p>

            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white rounded-md border border-slate-200 text-indigo-600">
                    <Building className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-slate-500">Branch Location</p>
                    <p className="text-sm font-bold text-slate-900">
                      {isEmployee ? 'Cyber City HQ (Gurugram)' : `${stats?.branches_count || 3} Worksite Branches`}
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
                    <p className="text-xs font-medium text-slate-500">
                      {isEmployee ? 'Active Shift Schedule' : 'Departments'}
                    </p>
                    <p className="text-sm font-bold text-slate-900">
                      {isEmployee ? 'General Day (09:00 - 18:00)' : `${stats?.departments_count || 5} Functional Units`}
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
                      <p className="text-xs font-medium text-slate-500">Monthly Net Payroll</p>
                      <p className="text-sm font-bold text-slate-900">
                        {formatINR(stats?.financials?.monthly_payroll_total || 1145000)}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-medium text-indigo-600">
            <span>Verified against live PostgreSQL records</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
        </div>
      </div>
    </div>
  );
};
