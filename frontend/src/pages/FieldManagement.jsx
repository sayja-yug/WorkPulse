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
        <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <Navigation className="w-5 h-5 text-indigo-600" />
          <span>Field Management &amp; GPS Operations</span>
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Monitor field staff, mobile GPS check-ins, and site visit logs
        </p>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase">Field Staff</span>
            <Users className="w-5 h-5 text-indigo-600" />
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">{fieldEmployees.length}</p>
          <p className="text-xs text-slate-500 mt-1">Assigned field personnel</p>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase">Active Punch Logs</span>
            <MapPin className="w-5 h-5 text-emerald-600" />
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">{gpsLogs.length}</p>
          <p className="text-xs text-slate-500 mt-1">Verified check-ins</p>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase">Geofence Tracking</span>
            <Clock className="w-5 h-5 text-amber-600" />
          </div>
          <p className="text-xl font-bold text-emerald-600 mt-2">ENABLED</p>
          <p className="text-xs text-slate-500 mt-1">Haversine radius verification</p>
        </div>
      </div>

      {/* Field Employees Directory */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Field Personnel</h3>
        </div>
        {loading ? (
          <Loader message="Loading field staff..." />
        ) : fieldEmployees.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">
            No employees marked as field employees yet.
          </div>
        ) : (
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[11px]">
                <th className="py-3 px-4">Name</th>
                <th className="py-3 px-4">Code</th>
                <th className="py-3 px-4">Email</th>
                <th className="py-3 px-4">Branch</th>
                <th className="py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {fieldEmployees.map((emp) => (
                <tr key={emp.id} className="hover:bg-slate-50">
                  <td className="py-3 px-4 font-semibold text-slate-900">
                    {emp.full_name || `${emp.first_name} ${emp.last_name}`}
                  </td>
                  <td className="py-3 px-4 font-mono text-slate-600">{emp.employee_code}</td>
                  <td className="py-3 px-4 text-slate-600">{emp.email}</td>
                  <td className="py-3 px-4 text-slate-600">{emp.branch_name || '-'}</td>
                  <td className="py-3 px-4"><Badge variant="success">{emp.status}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Recent Location Logs */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Recent Field &amp; Punch Logs</h3>
        </div>
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[11px]">
              <th className="py-3 px-4">Date</th>
              <th className="py-3 px-4">Employee</th>
              <th className="py-3 px-4">Punch In</th>
              <th className="py-3 px-4">Punch Out</th>
              <th className="py-3 px-4">Source</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {gpsLogs.slice(0, 10).map((log) => (
              <tr key={log.id} className="hover:bg-slate-50">
                <td className="py-3 px-4 font-semibold text-slate-900">{formatDate(log.date)}</td>
                <td className="py-3 px-4 text-slate-800">{log.employee_name || '-'}</td>
                <td className="py-3 px-4 font-mono text-slate-600">{formatTime(log.check_in)}</td>
                <td className="py-3 px-4 font-mono text-slate-600">{formatTime(log.check_out)}</td>
                <td className="py-3 px-4 font-mono text-[11px] text-indigo-600">{log.source || 'WEB'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
