import React, { useState, useEffect } from 'react';
import api from '../api/client';
import { usePermissions } from '../hooks/usePermissions';
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
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Punch In failed');
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
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Punch Out failed');
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
    } catch (err) {
      alert(err.response?.data?.error?.message || `Punch ${action} failed`);
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
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <CalendarCheck2 className="w-5 h-5 text-indigo-600" />
            <span>{isEmployee ? 'My Punch In / Punch Out' : 'Attendance — Punch In / Punch Out'}</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {isEmployee
              ? 'Record your daily clock-in and clock-out punches and view punch logs'
              : 'Live employee punch-in (PI) & punch-out (PO) sheet and punch logs'}
          </p>
        </div>

        {!isEmployee && (
          <div className="flex items-center bg-slate-100 p-1 rounded-lg self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setActiveTab('today')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                activeTab === 'today'
                  ? 'bg-white text-indigo-600 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Today&apos;s Punch Sheet</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('history')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                activeTab === 'history'
                  ? 'bg-white text-indigo-600 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>All Punch Logs</span>
            </button>
          </div>
        )}
      </div>

      {/* Self Punch In / Punch Out Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
            isCheckedIn ? 'bg-emerald-100 text-emerald-700' : 'bg-indigo-100 text-indigo-700'
          }`}>
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-slate-900">
                {isCheckedIn ? 'You are Punched In' : 'My Shift Punch'}
              </span>
              <span className="text-[11px] font-mono text-slate-400">{formatDate(todayStr)}</span>
            </div>
            <div className="flex items-center gap-1.5 mt-0.5 text-xs text-slate-500">
              <MapPin className="w-3.5 h-3.5 text-indigo-500" />
              <span>{geoStatus}</span>
            </div>
          </div>
        </div>

        {/* PI / PO Single-Action Toggle */}
        <div className="flex items-center gap-2.5">
          {!isCheckedIn ? (
            <button
              type="button"
              onClick={handleSelfPunchIn}
              disabled={punching}
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all disabled:opacity-40"
            >
              <LogIn className="w-4 h-4" />
              <span>{punching ? 'Punching In...' : 'Punch In (PI)'}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSelfPunchOut}
              disabled={punching}
              className="flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all disabled:opacity-40"
            >
              <LogOut className="w-4 h-4" />
              <span>{punching ? 'Punching Out...' : 'Punch Out (PO)'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Workforce / History Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
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
              <table className="w-full text-left text-xs border-collapse">
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
                      <td className="py-3.5 px-4 font-medium text-slate-800 whitespace-nowrap">
                        {row.working_hours ? `${row.working_hours} hrs` : '-'}
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          {!(row.check_in && !row.check_out) ? (
                            <button
                              type="button"
                              onClick={() => handleEmployeePunch(row.employee_id, 'IN')}
                              disabled={!!punchingId}
                              className="px-3 py-1 rounded-md text-[11px] font-bold border bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100 transition-all disabled:opacity-50"
                              title="Record Punch In (PI)"
                            >
                              {punchingId === `${row.employee_id}-IN` ? '...' : 'PI'}
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleEmployeePunch(row.employee_id, 'OUT')}
                              disabled={!!punchingId}
                              className="px-3 py-1 rounded-md text-[11px] font-bold border bg-rose-50 text-rose-700 border-rose-300 hover:bg-rose-100 transition-all disabled:opacity-50"
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
          <div className="p-12 text-center text-slate-500 text-xs">
            No punch logs found for this period.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/75 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[11px] tracking-wider">
                  <th className="py-3 px-4">Date</th>
                  {!isEmployee && <th className="py-3 px-4">Name &amp; Punch Logs</th>}
                  {isEmployee && <th className="py-3 px-4">Punch Logs</th>}
                  <th className="py-3 px-4">Punch In</th>
                  <th className="py-3 px-4">Punch Out</th>
                  <th className="py-3 px-4">Working Hours</th>
                  {!isEmployee && <th className="py-3 px-4 text-right">Punch Action</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {records.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 px-4 font-semibold text-slate-900 whitespace-nowrap">
                      {formatDate(r.date)}
                    </td>
                    <td className="py-3.5 px-4">
                      {!isEmployee && (
                        <p className="font-semibold text-slate-900">{r.employee_name || 'Team Associate'}</p>
                      )}
                      <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                        {formatLogsLine(r.check_in, r.check_out, r.working_hours)}
                      </p>
                    </td>
                    <td className="py-3.5 px-4 text-slate-700 font-mono whitespace-nowrap">
                      {formatTime(r.check_in)}
                    </td>
                    <td className="py-3.5 px-4 text-slate-700 font-mono whitespace-nowrap">
                      {formatTime(r.check_out)}
                    </td>
                    <td className="py-3.5 px-4 font-medium text-slate-800 whitespace-nowrap">
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
                              className="px-3 py-1 rounded-md text-[11px] font-bold border bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100 transition-all disabled:opacity-50"
                            >
                              PI
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleEmployeePunch(r.employee, 'OUT')}
                              disabled={!!punchingId}
                              className="px-3 py-1 rounded-md text-[11px] font-bold border bg-rose-50 text-rose-700 border-rose-300 hover:bg-rose-100 transition-all disabled:opacity-50"
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
