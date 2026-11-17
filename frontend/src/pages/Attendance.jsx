import React, { useState, useEffect } from 'react';
import api from '../api/client';
import { usePermissions } from '../hooks/usePermissions';
import { useNotification } from '../context/NotificationContext';
import {
  CalendarCheck2,
  Clock,
  MapPin,
  LogIn,
  LogOut,
  History,
  Users,
} from 'lucide-react';
import { Loader } from '../components/ui/Loader';
import { formatDate, formatTime } from '../utils/formatters';

export const Attendance = () => {
  const { isEmployee, isFieldEmployee } = usePermissions();
  const { toast } = useNotification();

  const [records, setRecords] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [punching, setPunching] = useState(false);
  const [punchingId, setPunchingId] = useState(null);
  const [geoCoords, setGeoCoords] = useState(null);
  const [geoStatus, setGeoStatus] = useState('Detecting GPS location...');
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [activeTab, setActiveTab] = useState('today'); // 'today' | 'history'

  const todayStr = new Date().toLocaleDateString('en-CA');

  const fetchAttendance = async () => {
    try {
      setLoading(true);
      const res = await api.get('/attendance/');
      const data = res.data?.data || res.data?.results || res.data || [];
      const list = Array.isArray(data) ? data : [];
      setRecords(list);

      const todayRec = list.find((r) => r.date === todayStr && r.check_in && !r.check_out);
      setIsCheckedIn(!!todayRec);
    } catch (err) {
      console.error('Failed to load attendance', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployeesList = async () => {
    try {
      const res = await api.get('/employees/');
      const data = res.data?.data || res.data?.results || res.data || [];
      setEmployees(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load employees', err);
    }
  };

  useEffect(() => {
    fetchAttendance();
    if (!isEmployee) {
      fetchEmployeesList();
    }

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setGeoCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          setGeoStatus(`GPS Locked (±${Math.round(pos.coords.accuracy)}m)`);
        },
        () => {
          setGeoCoords({ lat: 28.6280, lng: 77.3649 });
          setGeoStatus('Branch geofence active');
        }
      );
    } else {
      setGeoCoords({ lat: 28.6280, lng: 77.3649 });
      setGeoStatus('Geolocation default coordinates active');
    }
  }, [isEmployee]);

  const handleSelfPunchIn = async () => {
    try {
      setPunching(true);
      await api.post('/attendance/check-in/', {
        latitude: geoCoords?.lat || 28.6280,
        longitude: geoCoords?.lng || 77.3649,
        source: isFieldEmployee ? 'MOBILE_FIELD' : 'WEB',
      });
      setIsCheckedIn(true);
      await fetchAttendance();
      toast.success('Punched in successfully! Your work time is now active.');
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Punch In failed');
    } finally {
      setPunching(false);
    }
  };

  const handleSelfPunchOut = async () => {
    try {
      setPunching(true);
      await api.post('/attendance/check-out/', {
        latitude: geoCoords?.lat || 28.6280,
        longitude: geoCoords?.lng || 77.3649,
      });
      setIsCheckedIn(false);
      await fetchAttendance();
      toast.info('Punched out successfully! Work session ended.');
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Punch Out failed');
    } finally {
      setPunching(false);
    }
  };

  const handleEmployeePunch = async (employeeId, action) => {
    try {
      setPunchingId(`${employeeId}-${action}`);
      await api.post('/attendance/punch-employee/', {
        employee_id: employeeId,
        action,
      });
      await fetchAttendance();
      toast.success(`Employee marked as ${action === 'IN' ? 'Punched In (Active)' : 'Punched Out (Inactive)'}.`);
    } catch (err) {
      toast.error(err.response?.data?.error?.message || `Punch ${action} failed`);
    } finally {
      setPunchingId(null);
    }
  };

  // Build Today's Sheet combining all active employees with today's attendance records
  const todaySheet = employees.map((emp) => {
    const rec = records.find((r) => r.employee === emp.id && r.date === todayStr);
    return {
      employee_id: emp.id,
      employee_name: emp.full_name || `${emp.first_name} ${emp.last_name}`.trim(),
      employee_code: emp.employee_code,
      date: todayStr,
      check_in: rec?.check_in || null,
      check_out: rec?.check_out || null,
      working_hours: rec?.working_hours || null,
      source: rec?.source || null,
    };
  });

  const formatLogsLine = (checkIn, checkOut, hours) => {
    if (!checkIn && !checkOut) return 'No punch logs recorded yet';
    const parts = [];
    if (checkIn) parts.push(`PI: ${formatTime(checkIn)}`);
    if (checkOut) parts.push(`PO: ${formatTime(checkOut)}`);
    if (hours && Number(hours) > 0) parts.push(`(${hours} hrs)`);
    return parts.join('  •  ');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-zinc-950 dark:text-zinc-50 tracking-tight flex items-center gap-2">
            <CalendarCheck2 className="w-5 h-5 text-zinc-900 dark:text-zinc-100" />
            <span>{isEmployee ? 'My Punch In / Punch Out' : 'Attendance — Punch In / Punch Out'}</span>
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            {isEmployee
              ? 'Record your daily clock-in and clock-out punches and view punch logs'
              : 'Live employee punch-in (PI) & punch-out (PO) sheet and punch logs'}
          </p>
        </div>

        {!isEmployee && (
          <div className="flex items-center bg-zinc-100 dark:bg-zinc-900 p-1 rounded-lg w-full sm:w-auto border border-zinc-200 dark:border-zinc-800">
            <button
              type="button"
              onClick={() => setActiveTab('today')}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                activeTab === 'today'
                  ? 'bg-white dark:bg-zinc-800 text-zinc-950 dark:text-white font-bold shadow-xs'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Today&apos;s Punch Sheet</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('history')}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                activeTab === 'history'
                  ? 'bg-white dark:bg-zinc-800 text-zinc-950 dark:text-white font-bold shadow-xs'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>All Punch Logs</span>
            </button>
          </div>
        )}
      </div>

      {/* Self Punch In / Punch Out Banner */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className={`w-11 h-11 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center shrink-0 border ${
            isCheckedIn
              ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 border-zinc-900 dark:border-zinc-100'
              : 'bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100 border-zinc-200 dark:border-zinc-700'
          }`}>
            <Clock className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                {isCheckedIn ? 'You are Punched In' : 'My Shift Punch'}
              </span>
              <span className="text-[11px] font-mono text-zinc-400">{formatDate(todayStr)}</span>
            </div>
            <div className="flex items-center gap-1.5 mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
              <MapPin className="w-3.5 h-3.5 text-zinc-600 dark:text-zinc-400 shrink-0" />
              <span className="truncate max-w-[200px] sm:max-w-none">{geoStatus}</span>
            </div>
          </div>
        </div>

        {/* PI / PO Single-Action Toggle */}
        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          {!isCheckedIn ? (
            <button
              type="button"
              onClick={handleSelfPunchIn}
              disabled={punching}
              className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2.5 sm:py-2 bg-zinc-950 hover:bg-black text-white dark:bg-zinc-100 dark:hover:bg-white dark:text-zinc-950 rounded-xl text-xs font-bold shadow-xs transition-all disabled:opacity-40 cursor-pointer"
            >
              <LogIn className="w-4 h-4" />
              <span>{punching ? 'Punching In...' : 'Punch In (PI)'}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSelfPunchOut}
              disabled={punching}
              className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2.5 sm:py-2 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-900 dark:text-zinc-100 border border-zinc-300 dark:border-zinc-700 rounded-xl text-xs font-bold shadow-xs transition-all disabled:opacity-40 cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>{punching ? 'Punching Out...' : 'Punch Out (PO)'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Workforce / History Table */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-850/50 flex items-center justify-between">
          <h3 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">
            {!isEmployee && activeTab === 'today'
              ? `Today's Punch Sheet (${formatDate(todayStr)})`
              : 'Punch In / Punch Out Logs'}
          </h3>
          <span className="text-[11px] text-slate-500">
            {!isEmployee && activeTab === 'today'
              ? `${todaySheet.length} Staff Members`
              : `${records.length} Logs Loaded`}
          </span>
        </div>

        {loading ? (
          <Loader message="Loading punch logs..." />
        ) : !isEmployee && activeTab === 'today' ? (
          todaySheet.length === 0 ? (
            <div className="p-12 text-center text-slate-500 text-xs">
              No employees found in this company yet. Add employees first to start punching attendance.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50/75 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[11px] tracking-wider">
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Name &amp; Punch Logs</th>
                    <th className="py-3 px-4">Punch In</th>
                    <th className="py-3 px-4">Punch Out</th>
                    <th className="py-3 px-4">Hours</th>
                    <th className="py-3 px-4 text-right">Punch Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {todaySheet.map((row) => (
                    <tr key={row.employee_id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-4 font-semibold text-slate-900 whitespace-nowrap">
                        {formatDate(row.date)}
                      </td>
                      <td className="py-3.5 px-4">
                        <p className="font-semibold text-slate-900">{row.employee_name}</p>
                        <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                          {formatLogsLine(row.check_in, row.check_out, row.working_hours)}
                        </p>
                      </td>
                      <td className="py-3.5 px-4 text-slate-700 font-mono whitespace-nowrap">
                        {formatTime(row.check_in)}
                      </td>
                      <td className="py-3.5 px-4 text-slate-700 font-mono whitespace-nowrap">
                        {formatTime(row.check_out)}
                      </td>
                      <td className="py-3.5 px-4 font-medium text-zinc-900 dark:text-zinc-100 whitespace-nowrap">
                        {row.working_hours ? `${row.working_hours} hrs` : '-'}
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          {!(row.check_in && !row.check_out) ? (
                            <button
                              type="button"
                              onClick={() => handleEmployeePunch(row.employee_id, 'IN')}
                              disabled={!!punchingId}
                              className="px-3 py-1 rounded-md text-[11px] font-bold bg-zinc-950 text-white dark:bg-zinc-100 dark:text-zinc-950 hover:bg-black dark:hover:bg-white transition-all disabled:opacity-50"
                              title="Record Punch In (PI)"
                            >
                              {punchingId === `${row.employee_id}-IN` ? '...' : 'PI'}
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleEmployeePunch(row.employee_id, 'OUT')}
                              disabled={!!punchingId}
                              className="px-3 py-1 rounded-md text-[11px] font-bold border border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-all disabled:opacity-50"
                              title="Record Punch Out (PO)"
                            >
                              {punchingId === `${row.employee_id}-OUT` ? '...' : 'PO'}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : records.length === 0 ? (
          <div className="p-12 text-center text-zinc-500 dark:text-zinc-400 text-xs">
            No punch logs found for this period.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-left text-xs border-collapse">
              <thead>
                <tr className="bg-zinc-100/70 dark:bg-zinc-800/60 border-b border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 font-semibold uppercase text-[11px] tracking-wider">
                  <th className="py-3 px-4">Date</th>
                  {!isEmployee && <th className="py-3 px-4">Name &amp; Punch Logs</th>}
                  {isEmployee && <th className="py-3 px-4">Punch Logs</th>}
                  <th className="py-3 px-4">Punch In</th>
                  <th className="py-3 px-4">Punch Out</th>
                  <th className="py-3 px-4">Working Hours</th>
                  {!isEmployee && <th className="py-3 px-4 text-right">Punch Action</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
                {records.map((r) => (
                  <tr key={r.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors">
                    <td className="py-3.5 px-4 font-semibold text-zinc-900 dark:text-zinc-100 whitespace-nowrap">
                      {formatDate(r.date)}
                    </td>
                    <td className="py-3.5 px-4">
                      {!isEmployee && (
                        <p className="font-semibold text-zinc-900 dark:text-zinc-100">{r.employee_name || 'Team Associate'}</p>
                      )}
                      <p className="text-[11px] text-zinc-500 font-mono mt-0.5">
                        {formatLogsLine(r.check_in, r.check_out, r.working_hours)}
                      </p>
                    </td>
                    <td className="py-3.5 px-4 text-zinc-700 dark:text-zinc-300 font-mono whitespace-nowrap">
                      {formatTime(r.check_in)}
                    </td>
                    <td className="py-3.5 px-4 text-zinc-700 dark:text-zinc-300 font-mono whitespace-nowrap">
                      {formatTime(r.check_out)}
                    </td>
                    <td className="py-3.5 px-4 font-medium text-zinc-800 dark:text-zinc-200 whitespace-nowrap">
                      {r.working_hours ? `${r.working_hours} hrs` : '-'}
                    </td>
                    {!isEmployee && (
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          {!(r.check_in && !r.check_out) ? (
                            <button
                              type="button"
                              onClick={() => handleEmployeePunch(r.employee, 'IN')}
                              disabled={!!punchingId}
                              className="px-3 py-1 rounded-md text-[11px] font-bold bg-zinc-950 text-white dark:bg-zinc-100 dark:text-zinc-950 hover:bg-black dark:hover:bg-white transition-all disabled:opacity-50"
                            >
                              PI
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleEmployeePunch(r.employee, 'OUT')}
                              disabled={!!punchingId}
                              className="px-3 py-1 rounded-md text-[11px] font-bold border border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-all disabled:opacity-50"
                            >
                              PO
                            </button>
                          )}
                        </div>
                      </td>
                    )}
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
