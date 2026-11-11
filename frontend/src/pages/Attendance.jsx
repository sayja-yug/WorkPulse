import React, { useState, useEffect } from 'react';
import api from '../api/client';
import { usePermissions } from '../hooks/usePermissions';
import {
  CalendarCheck2,
  Clock,
  MapPin,
  Camera,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Play,
  Square,
  ShieldCheck,
  UserCheck,
} from 'lucide-react';
import { Badge } from '../components/ui/Badge';
import { Loader } from '../components/ui/Loader';
import { formatDate, formatTime } from '../utils/formatters';

export const Attendance = () => {
  const { isEmployee, isFieldEmployee, canManageEmployees, activeRole } = usePermissions();

  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [punching, setPunching] = useState(false);
  const [geoCoords, setGeoCoords] = useState(null);
  const [geoStatus, setGeoStatus] = useState('Detecting GPS location...');
  const [isCheckedIn, setIsCheckedIn] = useState(false);

  const fetchAttendance = async () => {
    try {
      setLoading(true);
      const res = await api.get('/attendance/');
      const data = res.data.data;
      const list = Array.isArray(data) ? data : data.results || [];
      setRecords(list);
      // Check if user clocked in today
      const today = new Date().toISOString().split('T')[0];
      const todayRec = list.find((r) => r.date === today);
      if (todayRec && todayRec.check_in && !todayRec.check_out) {
        setIsCheckedIn(true);
      }
    } catch (err) {
      console.error('Failed to load attendance', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendance();

    // Fetch browser GPS
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setGeoCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          setGeoStatus(`GPS Locked (±${Math.round(pos.coords.accuracy)}m)`);
        },
        () => {
          // Fallback demo coordinates (Gurugram HQ)
          setGeoCoords({ lat: 28.4908, lng: 77.089 });
          setGeoStatus('Branch geofence fallback active');
        }
      );
    } else {
      setGeoCoords({ lat: 28.4908, lng: 77.089 });
      setGeoStatus('Geolocation default coordinates active');
    }
  }, []);

  const handleClockIn = async () => {
    try {
      setPunching(true);
      await api.post('/attendance/check-in/', {
        latitude: geoCoords?.lat || 28.4908,
        longitude: geoCoords?.lng || 77.089,
        source: isFieldEmployee ? 'MOBILE_FIELD' : 'WEB',
      });
      setIsCheckedIn(true);
      alert('Clock-In registered successfully! Geofence verified.');
      fetchAttendance();
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Check-in failed');
    } finally {
      setPunching(false);
    }
  };

  const handleClockOut = async () => {
    try {
      setPunching(true);
      await api.post('/attendance/check-out/', {
        latitude: geoCoords?.lat || 28.4908,
        longitude: geoCoords?.lng || 77.089,
      });
      setIsCheckedIn(false);
      alert('Clock-Out completed successfully! Working hours compiled.');
      fetchAttendance();
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Check-out failed');
    } finally {
      setPunching(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <CalendarCheck2 className="w-5 h-5 text-indigo-600" />
            <span>{isEmployee ? 'My Attendance & Geofenced Clock-In' : 'Workforce Attendance Management'}</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {isEmployee
              ? 'GPS-verified attendance logging, shift timings, and daily working hours registry'
              : 'Real-time staff check-ins, geofence compliance, and shift tracking'}
          </p>
        </div>
      </div>

      {/* Clock In / Out Banner (Always active for Employees & Field Staff) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-bold text-lg ${
            isCheckedIn ? 'bg-emerald-100 text-emerald-700' : 'bg-indigo-100 text-indigo-700'
          }`}>
            <Clock className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-slate-900">
                {isCheckedIn ? 'Currently Clocked In' : 'Ready to Punch Attendance'}
              </span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                isCheckedIn ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-600'
              }`}>
                {isCheckedIn ? 'ACTIVE ON SHIFT' : 'OFF DUTY'}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
              <MapPin className="w-3.5 h-3.5 text-indigo-500" />
              <span>{geoStatus}</span>
            </div>
          </div>
        </div>

        {/* Action Buttons strictly for Clocking */}
        <div className="flex items-center gap-3">
          {!isCheckedIn ? (
            <button
              onClick={handleClockIn}
              disabled={punching}
              className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20 transition-all disabled:opacity-50"
            >
              <Play className="w-4 h-4 fill-white" />
              <span>{punching ? 'Recording Punch...' : 'Clock In Now'}</span>
            </button>
          ) : (
            <button
              onClick={handleClockOut}
              disabled={punching}
              className="flex items-center gap-2 px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-md shadow-rose-600/20 transition-all disabled:opacity-50"
            >
              <Square className="w-4 h-4 fill-white" />
              <span>{punching ? 'Recording Punch...' : 'Clock Out Now'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Attendance History Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            {isEmployee ? 'My Punch History' : 'Live Workforce Attendance Register'}
          </h3>
          <span className="text-[11px] text-slate-500">{records.length} Logs Loaded</span>
        </div>

        {loading ? (
          <Loader message="Loading attendance logs..." />
        ) : records.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-xs">
            No attendance punches found for this period.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/75 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[11px] tracking-wider">
                  <th className="py-3 px-4">Date</th>
                  {!isEmployee && <th className="py-3 px-4">Employee</th>}
                  <th className="py-3 px-4">Clock In</th>
                  <th className="py-3 px-4">Clock Out</th>
                  <th className="py-3 px-4">Working Hours</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Source / GPS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {records.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 px-4 font-semibold text-slate-900">
                      {formatDate(r.date)}
                    </td>
                    {!isEmployee && (
                      <td className="py-3.5 px-4 text-slate-700 font-medium">
                        {r.employee_name || 'Team Associate'}
                      </td>
                    )}
                    <td className="py-3.5 px-4 text-slate-600 font-mono">
                      {formatTime(r.check_in)}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 font-mono">
                      {formatTime(r.check_out)}
                    </td>
                    <td className="py-3.5 px-4 font-medium text-slate-800">
                      {r.working_hours ? `${r.working_hours} hrs` : '-'}
                    </td>
                    <td className="py-3.5 px-4">
                      <Badge variant={r.status === 'PRESENT' ? 'success' : r.status === 'ABSENT' ? 'danger' : 'warning'}>
                        {r.status}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-4 text-slate-500">
                      <span className="font-mono text-[11px] bg-slate-100 px-2 py-0.5 rounded">
                        {r.source || 'WEB'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
