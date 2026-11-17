import React, { useEffect, useState } from 'react';
import api from '../api/client';
import { MapPin, Navigation, Users, Clock } from 'lucide-react';
import { Loader } from '../components/ui/Loader';
import { Badge } from '../components/ui/Badge';
import { formatDate, formatTime } from '../utils/formatters';

export const FieldManagement = () => {
  const [fieldEmployees, setFieldEmployees] = useState([]);
  const [gpsLogs, setGpsLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFieldData = async () => {
      try {
        setLoading(true);
        const [empRes, attRes] = await Promise.allSettled([
          api.get('/employees/', { params: { is_field_employee: true } }),
          api.get('/attendance/'),
        ]);

        if (empRes.status === 'fulfilled') {
          const d = empRes.value.data?.data || empRes.value.data?.results || [];
          setFieldEmployees(Array.isArray(d) ? d : []);
        }
        if (attRes.status === 'fulfilled') {
          const d = attRes.value.data?.data || attRes.value.data?.results || [];
          const list = Array.isArray(d) ? d : [];
          setGpsLogs(list.filter((r) => r.source === 'GPS' || r.source === 'MOBILE_FIELD' || r.check_in));
        }
      } finally {
        setLoading(false);
      }
    };
    fetchFieldData();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-zinc-950 tracking-tight flex items-center gap-2">
          <Navigation className="w-5 h-5 text-zinc-900" />
          <span>Field Management &amp; GPS Operations</span>
        </h2>
        <p className="text-xs text-zinc-500 mt-0.5">
          Monitor field staff, mobile GPS check-ins, and site visit logs
        </p>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-zinc-900 p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase">Field Staff</span>
            <Users className="w-5 h-5 text-zinc-900 dark:text-zinc-100" />
          </div>
          <p className="text-2xl font-bold text-zinc-950 dark:text-zinc-50 mt-2">{fieldEmployees.length}</p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">Assigned field personnel</p>
        </div>
        <div className="bg-white dark:bg-zinc-900 p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase">Active Punch Logs</span>
            <MapPin className="w-5 h-5 text-zinc-900 dark:text-zinc-100" />
          </div>
          <p className="text-2xl font-bold text-zinc-950 dark:text-zinc-50 mt-2">{gpsLogs.length}</p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">Verified check-ins</p>
        </div>
        <div className="bg-white dark:bg-zinc-900 p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase">Geofence Tracking</span>
            <Clock className="w-5 h-5 text-zinc-900 dark:text-zinc-100" />
          </div>
          <p className="text-xl font-bold text-zinc-950 dark:text-zinc-50 mt-2">ENABLED</p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">Haversine radius verification</p>
        </div>
      </div>

      {/* Field Employees Directory */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-850/50">
          <h3 className="text-xs font-bold text-zinc-950 dark:text-zinc-100 uppercase tracking-wider">Field Personnel</h3>
        </div>
        {loading ? (
          <Loader message="Loading field staff..." />
        ) : fieldEmployees.length === 0 ? (
          <div className="p-8 text-center text-xs text-zinc-500 dark:text-zinc-400">
            No employees marked as field employees yet.
          </div>
        ) : (
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-zinc-50 dark:bg-zinc-850 border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 font-semibold uppercase text-[11px]">
                <th className="py-3 px-4">Name</th>
                <th className="py-3 px-4">Code</th>
                <th className="py-3 px-4">Email</th>
                <th className="py-3 px-4">Branch</th>
                <th className="py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {fieldEmployees.map((emp) => (
                <tr key={emp.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors">
                  <td className="py-3 px-4 font-semibold text-zinc-900 dark:text-zinc-100">
                    {emp.full_name || `${emp.first_name} ${emp.last_name}`}
                  </td>
                  <td className="py-3 px-4 font-mono text-zinc-600 dark:text-zinc-400">{emp.employee_code}</td>
                  <td className="py-3 px-4 text-zinc-600 dark:text-zinc-400">{emp.email}</td>
                  <td className="py-3 px-4 text-zinc-600 dark:text-zinc-400">{emp.branch_name || '-'}</td>
                  <td className="py-3 px-4"><Badge variant="default">{emp.status}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Recent Location Logs */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-850/50">
          <h3 className="text-xs font-bold text-zinc-950 dark:text-zinc-100 uppercase tracking-wider">Recent Field &amp; Punch Logs</h3>
        </div>
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-zinc-50 dark:bg-zinc-850 border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 font-semibold uppercase text-[11px]">
              <th className="py-3 px-4">Date</th>
              <th className="py-3 px-4">Employee</th>
              <th className="py-3 px-4">Punch In</th>
              <th className="py-3 px-4">Punch Out</th>
              <th className="py-3 px-4">Source</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {gpsLogs.slice(0, 10).map((log) => (
              <tr key={log.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors">
                <td className="py-3 px-4 font-semibold text-zinc-900 dark:text-zinc-100">{formatDate(log.date)}</td>
                <td className="py-3 px-4 text-zinc-800 dark:text-zinc-200">{log.employee_name || '-'}</td>
                <td className="py-3 px-4 font-mono text-zinc-600 dark:text-zinc-400">{formatTime(log.check_in)}</td>
                <td className="py-3 px-4 font-mono text-zinc-600 dark:text-zinc-400">{formatTime(log.check_out)}</td>
                <td className="py-3 px-4 font-mono text-[11px] text-zinc-700 dark:text-zinc-300">{log.source || 'WEB'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

