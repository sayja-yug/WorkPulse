import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../api/client';
import { usePermissions } from '../hooks/usePermissions';
import { useNotification } from '../context/NotificationContext';
import {
  CalendarCheck2,
  Clock,
  Calendar,
  MapPin,
  LogIn,
  LogOut,
  History,
  Users,
  Building2,
  Filter,
  X,
  RotateCcw,
} from 'lucide-react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Loader } from '../components/ui/Loader';
import { formatDate, formatTime } from '../utils/formatters';
import { calculateWorkHoursSummary } from '../utils/workHours';

export const Attendance = () => {
  const { isEmployee, isFieldEmployee, isSelfAttendanceOnly, isBranchManagerStrict } = usePermissions();
  const { toast } = useNotification();
  const [searchParams, setSearchParams] = useSearchParams();

  // Branch filter state from URL query param
  const branchParam = searchParams.get('branch') || '';
  const [selectedBranch, setSelectedBranch] = useState(branchParam);
  const [branches, setBranches] = useState([]);

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

  // Sync selected branch if URL changes
  useEffect(() => {
    const b = searchParams.get('branch') || '';
    setSelectedBranch(b);
  }, [searchParams]);

  // 1. Fetch available branches
  const fetchBranches = async () => {
    try {
      const res = await api.get('/branches/');
      const data = res.data?.data || res.data?.results || res.data || [];
      const list = Array.isArray(data) ? data : [];
      setBranches(list);
      if (list.length === 1 || isBranchManagerStrict) {
        if (list.length > 0) {
          setSelectedBranch(list[0].id);
        }
      }
    } catch (err) {
      console.warn('Could not load branches', err);
    }
  };

  // 2. Fetch attendance records
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

  // 3. Fetch employees list (optionally filtered by branch)
  const fetchEmployeesList = async (branchId = selectedBranch) => {
    try {
      const url = branchId ? `/employees/?branch=${branchId}` : '/employees/';
      const res = await api.get(url);
      const data = res.data?.data || res.data?.results || res.data || [];
      setEmployees(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load employees', err);
    }
  };

  useEffect(() => {
    fetchAttendance();
    if (!isSelfAttendanceOnly) {
      fetchBranches();
      fetchEmployeesList(selectedBranch);
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
  }, [isSelfAttendanceOnly, selectedBranch]);

  // Branch filter change handler
  const handleBranchChange = (newBranchId) => {
    if (isBranchManagerStrict && !newBranchId && branches.length > 0) {
      return;
    }
    setSelectedBranch(newBranchId);
    if (newBranchId) {
      const found = branches.find((b) => String(b.id) === String(newBranchId));
      setSearchParams({ branch: newBranchId, branchName: found?.name || '' });
    } else {
      setSearchParams({});
    }
  };

  const clearBranchFilter = () => {
    if (isBranchManagerStrict) return;
    handleBranchChange('');
  };

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

  // Build Today's Sheet combining active branch employees with today's attendance records
  const todaySheet = employees.map((emp) => {
    const rec = records.find((r) => r.employee === emp.id && r.date === todayStr);
    return {
      employee_id: emp.id,
      employee_name: emp.full_name || `${emp.first_name} ${emp.last_name}`.trim(),
      employee_code: emp.employee_code,
      branch_name: emp.branch_name || 'Corporate Campus (HQ)',
      date: todayStr,
      check_in: rec?.check_in || null,
      check_out: rec?.check_out || null,
      working_hours: rec?.working_hours || null,
      source: rec?.source || null,
    };
  });

  // Filter history logs: if branch selected, only show records matching employees of that branch
  const employeeIdsInBranch = new Set(employees.map((e) => e.id));
  const filteredRecords = selectedBranch
    ? records.filter((r) => employeeIdsInBranch.has(r.employee))
    : records;

  const formatLogsLine = (checkIn, checkOut, hours) => {
    if (!checkIn && !checkOut) return 'No punch logs recorded yet';
    const parts = [];
    if (checkIn) parts.push(`PI: ${formatTime(checkIn)}`);
    if (checkOut) parts.push(`PO: ${formatTime(checkOut)}`);
    if (hours && Number(hours) > 0) parts.push(`(${hours} hrs)`);
    return parts.join('  •  ');
  };

  const activeBranchObj = branches.find((b) => String(b.id) === String(selectedBranch));

  return (
    <div className="space-y-6">
      {/* 1. Header with Tab Switcher & Branch Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-zinc-950 tracking-tight flex items-center gap-2">
            <CalendarCheck2 className="w-5 h-5 text-zinc-900" />
            <span>{isSelfAttendanceOnly ? 'My Punch In / Punch Out' : 'Attendance & Punch Sheet'}</span>
          </h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            {isSelfAttendanceOnly
              ? 'Record your personal daily punch in / out and track your cumulative work hours'
              : 'Live workforce punch-in (PI) & punch-out (PO) sheet with branch filtering'}
          </p>
        </div>

        {!isSelfAttendanceOnly && (
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Branch Filter Selector */}
            <div className="flex items-center gap-1.5 bg-white border border-zinc-200 rounded-lg px-2.5 py-1 shadow-2xs">
              <Building2 className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
              {branches.length === 1 || isBranchManagerStrict ? (
                <span className="text-xs font-semibold text-zinc-900 pr-1 select-none">
                  {branches.find((b) => String(b.id) === String(selectedBranch))?.name || branches[0]?.name || 'My Assigned Branch'}
                </span>
              ) : (
                <select
                  aria-label="Filter Attendance by Branch"
                  value={selectedBranch}
                  onChange={(e) => handleBranchChange(e.target.value)}
                  className="text-xs font-semibold text-zinc-900 bg-transparent outline-none cursor-pointer pr-1"
                >
                  <option value="">All Branches (Whole Company)</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.code})
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Tab Pills */}
            <div className="flex items-center bg-zinc-100 p-1 rounded-lg border border-zinc-200">
              <button
                type="button"
                onClick={() => setActiveTab('today')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'today'
                    ? 'bg-white text-zinc-950 font-bold shadow-xs'
                    : 'text-zinc-600 hover:text-zinc-950'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Today&apos;s Sheet</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('history')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'history'
                    ? 'bg-white text-zinc-950 font-bold shadow-xs'
                    : 'text-zinc-600 hover:text-zinc-950'
                }`}
              >
                <History className="w-3.5 h-3.5" />
                <span>All Logs</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 2. Active Branch Filter Banner (When navigating from Organization or dropdown) */}
      {!isSelfAttendanceOnly && activeBranchObj && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-zinc-950 text-white rounded-xl shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-zinc-900 border border-zinc-800 text-white flex items-center justify-center font-bold text-sm shrink-0">
              <MapPin className="w-4 h-4 text-zinc-200" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold text-white">
                  Showing Attendance for Branch: {activeBranchObj.name}
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-200 border border-zinc-700 font-bold">
                  {activeBranchObj.code}
                </span>
                {isBranchManagerStrict && (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 border border-zinc-700">
                    Assigned Branch Only
                  </span>
                )}
              </div>
              <p className="text-[11px] text-zinc-400 mt-0.5">
                Filtered strictly to {employees.length} employees assigned to this location.
              </p>
            </div>
          </div>

          {!isBranchManagerStrict && (
            <Button
              size="xs"
              variant="outline"
              leftIcon={RotateCcw}
              onClick={clearBranchFilter}
              className="bg-white text-zinc-950 hover:bg-zinc-100 border-white shrink-0 self-start sm:self-auto"
            >
              Show Whole Company
            </Button>
          )}
        </div>
      )}

      {/* 3. Employee & Accountant Cumulative Work Hours Summary */}
      {isSelfAttendanceOnly && (() => {
        const todayRec = records.find((r) => r.date === todayStr);
        const summary = calculateWorkHoursSummary(records, todayRec);
        return (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div className="p-4 rounded-xl bg-white border border-zinc-200 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Today&apos;s Hours</span>
                <span className={`w-2 h-2 rounded-full ${isCheckedIn ? 'bg-zinc-950 animate-pulse' : 'bg-zinc-400'}`} />
              </div>
              <p className="text-2xl font-mono font-black text-zinc-950 mt-1.5">
                {summary.todayFormatted}
              </p>
              <span className="text-xs text-zinc-500 mt-0.5 block">{summary.todayText}</span>
            </div>

            <div className="p-4 rounded-xl bg-white border border-zinc-200 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Total Weekly Hours</span>
                <Calendar className="w-4 h-4 text-zinc-500" />
              </div>
              <p className="text-2xl font-mono font-black text-zinc-950 mt-1.5">
                {summary.weeklyFormatted}
              </p>
              <span className="text-xs text-zinc-500 mt-0.5 block">{summary.weeklyText} &bull; {summary.weekLabel}</span>
            </div>

            <div className="p-4 rounded-xl bg-white border border-zinc-200 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Total Monthly Hours</span>
                <Clock className="w-4 h-4 text-zinc-500" />
              </div>
              <p className="text-2xl font-mono font-black text-zinc-950 mt-1.5">
                {summary.monthlyFormatted}
              </p>
              <span className="text-xs text-zinc-500 mt-0.5 block">{summary.monthlyText} &bull; {summary.monthLabel}</span>
            </div>
          </div>
        );
      })()}

      {/* 4. Self Punch In / Punch Out Banner */}
      <div className="bg-white rounded-2xl border border-zinc-200 p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className={`w-11 h-11 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center shrink-0 border ${
            isCheckedIn
              ? 'bg-zinc-950 text-white border-zinc-950'
              : 'bg-zinc-100 text-zinc-900 border-zinc-200'
          }`}>
            <Clock className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-zinc-900">
                {isCheckedIn ? 'You are Punched In' : 'My Shift Punch'}
              </span>
              <span className="text-[11px] font-mono text-zinc-400">{formatDate(todayStr)}</span>
            </div>
            <div className="flex items-center gap-1.5 mt-0.5 text-xs text-zinc-500">
              <MapPin className="w-3.5 h-3.5 text-zinc-600 shrink-0" />
              <span className="truncate max-w-[200px] sm:max-w-none">{geoStatus}</span>
            </div>
          </div>
        </div>

        {/* PI / PO Single-Action Toggle */}
        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          {!isCheckedIn ? (
            <Button
              variant="primary"
              size="sm"
              leftIcon={LogIn}
              disabled={punching}
              onClick={handleSelfPunchIn}
              className="w-full sm:w-auto"
            >
              {punching ? 'Punching In...' : 'Punch In (PI)'}
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              leftIcon={LogOut}
              disabled={punching}
              onClick={handleSelfPunchOut}
              className="w-full sm:w-auto"
            >
              {punching ? 'Punching Out...' : 'Punch Out (PO)'}
            </Button>
          )}
        </div>
      </div>

      {/* 4. Workforce / History Table */}
      <Card>
        <CardHeader className="justify-between">
          <div>
            <CardTitle>
              {!isSelfAttendanceOnly && activeTab === 'today'
                ? `Today's Punch Sheet (${formatDate(todayStr)})`
                : isSelfAttendanceOnly
                ? 'My Personal Punch In / Punch Out Logs'
                : 'Punch In / Punch Out Logs'}
            </CardTitle>
            <CardDescription>
              {isSelfAttendanceOnly
                ? 'Your personal attendance history and recorded duty hours'
                : selectedBranch && activeBranchObj
                ? `Filtered by location: ${activeBranchObj.name}`
                : 'Displaying complete company roster and duty hours'}
            </CardDescription>
          </div>
          <span className="text-xs font-bold text-zinc-700 bg-zinc-100 px-2.5 py-1 rounded-full border border-zinc-200">
            {!isSelfAttendanceOnly && activeTab === 'today'
              ? `${todaySheet.length} Employees`
              : `${filteredRecords.length} Logs`}
          </span>
        </CardHeader>

        {loading ? (
          <Loader message="Loading punch logs..." />
        ) : !isSelfAttendanceOnly && activeTab === 'today' ? (
          todaySheet.length === 0 ? (
            <div className="p-12 text-center text-zinc-500 text-xs space-y-2">
              <Users className="w-8 h-8 text-zinc-300 mx-auto" />
              <p className="font-semibold text-zinc-700">
                {selectedBranch
                  ? `No employees assigned to ${activeBranchObj?.name || 'this branch'}.`
                  : 'No employees found in this company yet.'}
              </p>
              {selectedBranch && !isBranchManagerStrict && (
                <Button size="xs" variant="outline" onClick={clearBranchFilter}>
                  Clear Branch Filter
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-zinc-50 border-b border-zinc-200 text-zinc-600 font-bold uppercase text-[11px] tracking-wider">
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Employee</th>
                    {!selectedBranch && <th className="py-3 px-4">Branch</th>}
                    <th className="py-3 px-4">Punch In</th>
                    <th className="py-3 px-4">Punch Out</th>
                    <th className="py-3 px-4">Hours</th>
                    <th className="py-3 px-4 text-right">Punch Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200">
                  {todaySheet.map((row) => (
                    <tr key={row.employee_id} className="hover:bg-zinc-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-semibold text-zinc-900 whitespace-nowrap">
                        {formatDate(row.date)}
                      </td>
                      <td className="py-3.5 px-4">
                        <p className="font-bold text-zinc-900">{row.employee_name}</p>
                        <p className="text-[11px] text-zinc-500 font-mono mt-0.5">
                          {formatLogsLine(row.check_in, row.check_out, row.working_hours)}
                        </p>
                      </td>
                      {!selectedBranch && (
                        <td className="py-3.5 px-4 text-zinc-600 font-medium whitespace-nowrap">
                          {row.branch_name}
                        </td>
                      )}
                      <td className="py-3.5 px-4 text-zinc-700 font-mono whitespace-nowrap">
                        {formatTime(row.check_in)}
                      </td>
                      <td className="py-3.5 px-4 text-zinc-700 font-mono whitespace-nowrap">
                        {formatTime(row.check_out)}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-zinc-950 whitespace-nowrap">
                        {row.working_hours ? `${row.working_hours} hrs` : '-'}
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          {!(row.check_in && !row.check_out) ? (
                            <Button
                              size="xs"
                              variant="primary"
                              disabled={!!punchingId}
                              onClick={() => handleEmployeePunch(row.employee_id, 'IN')}
                              title="Record Punch In (PI)"
                            >
                              {punchingId === `${row.employee_id}-IN` ? '...' : 'PI'}
                            </Button>
                          ) : (
                            <Button
                              size="xs"
                              variant="outline"
                              disabled={!!punchingId}
                              onClick={() => handleEmployeePunch(row.employee_id, 'OUT')}
                              title="Record Punch Out (PO)"
                            >
                              {punchingId === `${row.employee_id}-OUT` ? '...' : 'PO'}
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : filteredRecords.length === 0 ? (
          <div className="p-12 text-center text-zinc-500 text-xs space-y-2">
            <History className="w-8 h-8 text-zinc-300 mx-auto" />
            <p className="font-semibold text-zinc-700">No punch logs found for this period.</p>
            {selectedBranch && !isBranchManagerStrict && (
              <Button size="xs" variant="outline" onClick={clearBranchFilter}>
                Clear Branch Filter
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-left text-xs border-collapse">
              <thead>
                <tr className="bg-zinc-50 border-b border-zinc-200 text-zinc-600 font-bold uppercase text-[11px] tracking-wider">
                  <th className="py-3 px-4">Date</th>
                  {!isSelfAttendanceOnly && <th className="py-3 px-4">Employee &amp; Punch Logs</th>}
                  {isSelfAttendanceOnly && <th className="py-3 px-4">Punch Logs</th>}
                  <th className="py-3 px-4">Punch In</th>
                  <th className="py-3 px-4">Punch Out</th>
                  <th className="py-3 px-4">Working Hours</th>
                  {!isSelfAttendanceOnly && <th className="py-3 px-4 text-right">Punch Action</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200">
                {filteredRecords.map((r) => (
                  <tr key={r.id} className="hover:bg-zinc-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-semibold text-zinc-900 whitespace-nowrap">
                      {formatDate(r.date)}
                    </td>
                    <td className="py-3.5 px-4">
                      {!isSelfAttendanceOnly && (
                        <p className="font-bold text-zinc-900">{r.employee_name || 'Team Associate'}</p>
                      )}
                      <p className="text-[11px] text-zinc-500 font-mono mt-0.5">
                        {formatLogsLine(r.check_in, r.check_out, r.working_hours)}
                      </p>
                    </td>
                    <td className="py-3.5 px-4 text-zinc-700 font-mono whitespace-nowrap">
                      {formatTime(r.check_in)}
                    </td>
                    <td className="py-3.5 px-4 text-zinc-700 font-mono whitespace-nowrap">
                      {formatTime(r.check_out)}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-zinc-950 whitespace-nowrap">
                      {r.working_hours ? `${r.working_hours} hrs` : '-'}
                    </td>
                    {!isSelfAttendanceOnly && (
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          {!(r.check_in && !r.check_out) ? (
                            <Button
                              size="xs"
                              variant="primary"
                              disabled={!!punchingId}
                              onClick={() => handleEmployeePunch(r.employee, 'IN')}
                            >
                              PI
                            </Button>
                          ) : (
                            <Button
                              size="xs"
                              variant="outline"
                              disabled={!!punchingId}
                              onClick={() => handleEmployeePunch(r.employee, 'OUT')}
                            >
                              PO
                            </Button>
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
      </Card>
    </div>
  );
};

export default Attendance;
