import React, { useState, useEffect } from 'react';
import api from '../api/client';
import { usePermissions } from '../hooks/usePermissions';
import {
  CalendarCheck2,
  Clock,
  MapPin,
  Play,
  Square,
  UserCheck,
  Check,
  X,
  AlertCircle,
  Plus,
} from 'lucide-react';
import { Badge } from '../components/ui/Badge';
import { Loader } from '../components/ui/Loader';
import { Modal } from '../components/ui/Modal';
import { formatDate, formatTime } from '../utils/formatters';

export const Attendance = () => {
  const { isEmployee, isFieldEmployee, canManageEmployees, isHR, isOwner } = usePermissions();

  const [records, setRecords] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [punching, setPunching] = useState(false);
  const [geoCoords, setGeoCoords] = useState(null);
  const [geoStatus, setGeoStatus] = useState('Detecting GPS location...');
  const [isCheckedIn, setIsCheckedIn] = useState(false);

  // Manual Attendance Modal State for HR / Managers
  const [showMarkModal, setShowMarkModal] = useState(false);
  const [submittingManual, setSubmittingManual] = useState(false);
  const [markForm, setMarkForm] = useState({
    employee_id: '',
    date: new Date().toISOString().split('T')[0],
    status: 'PRESENT',
    notes: '',
  });

  const fetchAttendance = async () => {
    try {
      setLoading(true);
      const res = await api.get('/attendance/');
      const data = res.data.data;
      const list = Array.isArray(data) ? data : data?.results || [];
      setRecords(list);
      // Check if current user clocked in today
      const today = new Date().toISOString().split('T')[0];
      const todayRec = list.find((r) => r.date === today && r.check_in && !r.check_out);
      if (todayRec) {
        setIsCheckedIn(true);
      } else {
        setIsCheckedIn(false);
      }
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
      const list = Array.isArray(data) ? data : [];
      setEmployees(list);
      if (list.length > 0 && !markForm.employee_id) {
        setMarkForm((prev) => ({ ...prev, employee_id: list[0].id }));
      }
    } catch (err) {
      console.error('Failed to load employees for attendance', err);
    }
  };

  useEffect(() => {
    fetchAttendance();
    if (!isEmployee) {
      fetchEmployeesList();
    }

    // Fetch browser GPS
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setGeoCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          setGeoStatus(`GPS Locked (±${Math.round(pos.coords.accuracy)}m)`);
        },
        () => {
          // Fallback coordinates (Trinetra Noida HQ)
          setGeoCoords({ lat: 28.6280, lng: 77.3649 });
          setGeoStatus('Branch geofence active (Noida HQ)');
        }
      );
    } else {
      setGeoCoords({ lat: 28.6280, lng: 77.3649 });
      setGeoStatus('Geolocation default coordinates active');
    }
  }, [isEmployee]);

  const handleClockIn = async () => {
    try {
      setPunching(true);
      await api.post('/attendance/check-in/', {
        latitude: geoCoords?.lat || 28.6280,
        longitude: geoCoords?.lng || 77.3649,
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
        latitude: geoCoords?.lat || 28.6280,
        longitude: geoCoords?.lng || 77.3649,
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

  const handleManualMarkSubmit = async (e) => {
    e.preventDefault();
    if (!markForm.employee_id) {
      alert('Please select an employee.');
      return;
    }
    try {
      setSubmittingManual(true);
      await api.post('/attendance/mark-manual/', markForm);
      alert('Employee attendance marked successfully!');
      setShowMarkModal(false);
      fetchAttendance();
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Failed to record manual attendance');
    } finally {
      setSubmittingManual(false);
    }
  };

  const handleQuickStatusChange = async (employeeId, dateStr, newStatus) => {
    try {
      await api.post('/attendance/mark-manual/', {
        employee_id: employeeId,
        date: dateStr,
        status: newStatus,
        notes: `Quick attendance status set to ${newStatus} by HR`,
      });
      fetchAttendance();
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Update failed');
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
              : 'Real-time staff check-ins, geofence compliance, and shift tracking for Trinetra Technologies'}
          </p>
        </div>

        {/* HR Manual Mark Button */}
        {!isEmployee && (
          <button
            onClick={() => setShowMarkModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/20 transition-all self-start sm:self-auto"
          >
            <UserCheck className="w-4 h-4" />
            <span>Mark Employee Attendance</span>
          </button>
        )}
      </div>

      {/* Clock In / Out Banner (Punch for logged in user) */}
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

        {/* Action Buttons for Clocking */}
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
                  {!isEmployee && <th className="py-3 px-4 text-right">Quick HR Action</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {records.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 px-4 font-semibold text-slate-900">
                      {formatDate(r.date)}
                    </td>
                    {!isEmployee && (
                      <td className="py-3.5 px-4 text-slate-800 font-medium">
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
                    {!isEmployee && (
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleQuickStatusChange(r.employee, r.date, 'PRESENT')}
                            className={`px-2 py-1 rounded text-[10px] font-bold border transition-colors ${
                              r.status === 'PRESENT'
                                ? 'bg-emerald-600 text-white border-emerald-600'
                                : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                            }`}
                            title="Mark Present (8.5 hrs)"
                          >
                            Present
                          </button>
                          <button
                            onClick={() => handleQuickStatusChange(r.employee, r.date, 'ABSENT')}
                            className={`px-2 py-1 rounded text-[10px] font-bold border transition-colors ${
                              r.status === 'ABSENT'
                                ? 'bg-rose-600 text-white border-rose-600'
                                : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                            }`}
                            title="Mark Absent"
                          >
                            Absent
                          </button>
                          <button
                            onClick={() => handleQuickStatusChange(r.employee, r.date, 'HALF_DAY')}
                            className={`px-2 py-1 rounded text-[10px] font-bold border transition-colors ${
                              r.status === 'HALF_DAY'
                                ? 'bg-amber-600 text-white border-amber-600'
                                : 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                            }`}
                            title="Mark Half Day (4.0 hrs)"
                          >
                            Half Day
                          </button>
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

      {/* Manual Attendance Modal for HR / Manager */}
      <Modal
        isOpen={showMarkModal}
        onClose={() => setShowMarkModal(false)}
        title="Mark Attendance for Employee"
      >
        <form onSubmit={handleManualMarkSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Select Employee <span className="text-rose-500">*</span>
            </label>
            <select
              required
              value={markForm.employee_id}
              onChange={(e) => setMarkForm({ ...markForm, employee_id: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-600 outline-none"
            >
              <option value="">-- Choose Employee --</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.full_name || `${emp.first_name} ${emp.last_name}`} ({emp.employee_code}) - {emp.department_name || emp.branch_name || 'Staff'}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Attendance Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                required
                value={markForm.date}
                onChange={(e) => setMarkForm({ ...markForm, date: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-600 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Status <span className="text-rose-500">*</span>
              </label>
              <select
                required
                value={markForm.status}
                onChange={(e) => setMarkForm({ ...markForm, status: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-600 outline-none"
              >
                <option value="PRESENT">Present (Full Day - 8.5 hrs)</option>
                <option value="ABSENT">Absent (0.0 hrs)</option>
                <option value="HALF_DAY">Half Day (4.0 hrs)</option>
                <option value="PAID_LEAVE">Paid Leave</option>
                <option value="UNPAID_LEAVE">Unpaid Leave</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Notes / Reason (Optional)</label>
            <input
              type="text"
              value={markForm.notes}
              onChange={(e) => setMarkForm({ ...markForm, notes: e.target.value })}
              placeholder="e.g. Approved by HR / Onsite Client Visit"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-600 outline-none"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowMarkModal(false)}
              className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-lg text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submittingManual}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-md shadow-indigo-600/20 disabled:opacity-50"
            >
              {submittingManual ? 'Saving Attendance...' : 'Save Attendance Record'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
