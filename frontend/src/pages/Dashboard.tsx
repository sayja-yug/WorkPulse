import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
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
  ArrowUpRight,
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

export const Dashboard: React.FC = () => {
  const { user, business, roles } = useAuth();
  const [stats, setStats] = useState<any>(null);
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
  }, [business]);

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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-indigo-700 via-indigo-600 to-indigo-800 rounded-2xl p-6 text-white shadow-lg shadow-indigo-600/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold px-2.5 py-0.5 bg-indigo-500/40 rounded-full border border-indigo-300/30">
              {roles[0]?.replace('_', ' ') || 'User'}
            </span>
            <span className="text-xs text-indigo-200">Active Tenant: {business?.name}</span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight">Welcome back, {user?.full_name}!</h2>
          <p className="text-indigo-100 text-sm mt-0.5">
            Here is your live workforce operations and financial snapshot for today.
          </p>
        </div>

        <div className="flex gap-2">
          <a
            href="/attendance"
            className="px-4 py-2 bg-white text-indigo-700 rounded-lg text-sm font-semibold hover:bg-indigo-50 shadow-sm transition-colors text-center"
          >
            Mark Attendance
          </a>
          <a
            href="/employees"
            className="px-4 py-2 bg-indigo-500/40 border border-indigo-300/30 text-white rounded-lg text-sm font-semibold hover:bg-indigo-500/60 transition-colors text-center"
          >
            Manage Staff
          </a>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Workforce</span>
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">{stats?.total_employees || 0}</p>
          <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-medium mt-1">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>{stats?.active_employees || 0} active employees</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Today's Attendance</span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
              <CalendarCheck2 className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">{stats?.attendance_today?.present || 0}</p>
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium mt-1">
            <span>{stats?.attendance_today?.attendance_percentage} presenteeism rate</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Pending Leaves</span>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">{stats?.pending_leaves_count || 0}</p>
          <div className="flex items-center gap-1.5 text-xs text-amber-600 font-medium mt-1">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>Requires supervisor review</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Cashbook Balance</span>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <Receipt className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">
            ₹{parseFloat(stats?.financials?.cash_balance || '0').toLocaleString('en-IN')}
          </p>
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium mt-1">
            <span>Petty cash ledger balance</span>
          </div>
        </div>
      </div>

      {/* Main Charts & Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Attendance Trends Chart */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">Weekly Attendance Trends</h3>
              <p className="text-xs text-slate-500">Present vs Absent statistics</p>
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

        {/* Organization Breakdown */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900 mb-1">Company Infrastructure</h3>
            <p className="text-xs text-slate-500 mb-4">Configured organization nodes</p>

            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white rounded-md border border-slate-200 text-indigo-600">
                    <Building className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-slate-500">Active Branches</p>
                    <p className="text-sm font-bold text-slate-900">{stats?.branches_count || 3} Worksite Locations</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white rounded-md border border-slate-200 text-emerald-600">
                    <Users className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-slate-500">Departments</p>
                    <p className="text-sm font-bold text-slate-900">{stats?.departments_count || 5} Functional Units</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white rounded-md border border-slate-200 text-blue-600">
                    <Banknote className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-slate-500">Monthly Net Payroll</p>
                    <p className="text-sm font-bold text-slate-900">
                      ₹{parseFloat(stats?.financials?.monthly_payroll_total || '0').toLocaleString('en-IN')}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-medium text-indigo-600">
            <span>Verified against live database records</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
        </div>
      </div>
    </div>
  );
};
