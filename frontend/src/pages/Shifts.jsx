import React, { useState, useEffect } from 'react';
import api from '../api/client';
import { usePermissions } from '../hooks/usePermissions';
import { useNotification } from '../context/NotificationContext';
import {
  Clock,
  Plus,
  Moon,
  Sun,
  Users,
  Edit2,
  Trash2,
  UserPlus,
  UserMinus,
  Calendar,
  AlertCircle,
  Building2,
  Briefcase,
  Check,
  ArrowRight,
} from 'lucide-react';
import { Modal } from '../components/ui/Modal';
import { Badge } from '../components/ui/Badge';
import { Loader } from '../components/ui/Loader';
import { formatDate } from '../utils/formatters';

const formatTime12h = (timeStr) => {
  if (!timeStr) return '--:--';
  const parts = timeStr.slice(0, 5).split(':');
  let h = parseInt(parts[0], 10);
  const m = parts[1] || '00';
  if (isNaN(h)) return timeStr;
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12;
  h = h ? h : 12;
  return `${h}:${m} ${ampm}`;
};

const calculateShiftDuration = (startTime, endTime, isNight) => {
  if (!startTime || !endTime) return '8h';
  const [sh, sm] = startTime.slice(0, 5).split(':').map(Number);
  const [eh, em] = endTime.slice(0, 5).split(':').map(Number);
  if (isNaN(sh) || isNaN(eh)) return '8h';
  let startMin = sh * 60 + (sm || 0);
  let endMin = eh * 60 + (em || 0);
  if (isNight || endMin <= startMin) {
    endMin += 24 * 60;
  }
  const diffMin = endMin - startMin;
  const hours = Math.floor(diffMin / 60);
  const mins = diffMin % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
};

export const Shifts = () => {
  const { canManageShifts } = usePermissions();
  const { toast, confirm } = useNotification();

  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Create Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    start_time: '09:00',
    end_time: '18:00',
    grace_period_minutes: 15,
    is_night_shift: false,
  });

  // Edit Modal
  const [editingShift, setEditingShift] = useState(null);
  const [editFormData, setEditFormData] = useState({
    name: '',
    code: '',
    start_time: '09:00',
    end_time: '18:00',
    grace_period_minutes: 15,
    is_night_shift: false,
  });

  // Roster Modal
  const [rosterShift, setRosterShift] = useState(null);
  const [rosterData, setRosterData] = useState([]);
  const [rosterLoading, setRosterLoading] = useState(false);
  const [employeesList, setEmployeesList] = useState([]);
  const [assignEmployeeId, setAssignEmployeeId] = useState('');
  const [assignEffectiveFrom, setAssignEffectiveFrom] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [assigning, setAssigning] = useState(false);

  // Fetch all shifts
  const fetchShifts = async () => {
    try {
      setLoading(true);
      const res = await api.get('/shifts/');
      const data = res.data?.data || res.data?.results || res.data || [];
      setShifts(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load shifts', err);
      toast.error('Failed to load shift configurations');
    } finally {
      setLoading(false);
    }
  };

  // Fetch employees list for assigning to roster
  const fetchEmployeesList = async () => {
    try {
      const res = await api.get('/employees/');
      const data = res.data?.data || res.data?.results || res.data || [];
      setEmployeesList(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load employee list', err);
    }
  };

  useEffect(() => {
    fetchShifts();
    fetchEmployeesList();
  }, []);

  // 1. Create Shift
  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await api.post('/shifts/', {
        ...formData,
        is_overnight: formData.is_night_shift,
      });
      setShowCreateModal(false);
      setFormData({
        name: '',
        code: '',
        start_time: '09:00',
        end_time: '18:00',
        grace_period_minutes: 15,
        is_night_shift: false,
      });
      fetchShifts();
      toast.success('Shift created successfully!');
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Failed to create shift');
    }
  };

  // 2. Open Edit Shift Modal
  const openEditModal = (s) => {
    setEditingShift(s);
    setEditFormData({
      name: s.name || '',
      code: s.code || '',
      start_time: s.start_time?.slice(0, 5) || '09:00',
      end_time: s.end_time?.slice(0, 5) || '18:00',
      grace_period_minutes: s.grace_period_minutes ?? 15,
      is_night_shift: s.is_night_shift ?? s.is_overnight ?? false,
    });
  };

  // 3. Update Shift
  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!editingShift) return;
    try {
      await api.patch(`/shifts/${editingShift.id}/`, {
        ...editFormData,
        is_overnight: editFormData.is_night_shift,
      });
      setEditingShift(null);
      fetchShifts();
      toast.success(`Shift "${editFormData.name}" updated successfully!`);
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Failed to update shift');
    }
  };

  // 4. Delete Shift
  const handleDelete = async (s) => {
    const confirmed = await confirm({
      title: 'Delete Shift Schedule',
      message: `Are you sure you want to permanently delete shift "${s.name}" (${s.code})? Any staff assigned to this shift roster will need to be rescheduled.`,
      confirmText: 'Delete Shift',
      cancelText: 'Cancel',
      type: 'danger',
    });
    if (!confirmed) return;

    try {
      await api.delete(`/shifts/${s.id}/`);
      fetchShifts();
      toast.success(`Shift "${s.name}" deleted successfully.`);
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Failed to delete shift');
    }
  };

  // 5. Open View Roster Modal & Load Roster Members
  const handleOpenRoster = async (s) => {
    setRosterShift(s);
    setAssignEmployeeId('');
    setAssignEffectiveFrom(new Date().toISOString().split('T')[0]);
    await fetchRosterData(s.id);
  };

  const fetchRosterData = async (shiftId) => {
    try {
      setRosterLoading(true);
      const res = await api.get(`/shifts/${shiftId}/roster/`);
      const data = res.data?.data || [];
      setRosterData(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load roster', err);
      toast.error('Failed to load shift roster');
    } finally {
      setRosterLoading(false);
    }
  };

  // 6. Assign Employee to Roster
  const handleAssignEmployee = async (e) => {
    e.preventDefault();
    if (!assignEmployeeId || !rosterShift) return;
    try {
      setAssigning(true);
      await api.post(`/shifts/${rosterShift.id}/assign-employee/`, {
        employee_id: assignEmployeeId,
        effective_from: assignEffectiveFrom,
      });
      setAssignEmployeeId('');
      toast.success('Employee assigned to shift roster successfully!');
      await fetchRosterData(rosterShift.id);
      fetchShifts();
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Failed to assign employee to shift');
    } finally {
      setAssigning(false);
    }
  };

  // 7. Remove Employee from Roster
  const handleRemoveFromRoster = async (empId, empName) => {
    if (!rosterShift) return;
    const confirmed = await confirm({
      title: 'Unassign from Roster',
      message: `Remove ${empName} from the "${rosterShift.name}" roster?`,
      confirmText: 'Remove Employee',
      cancelText: 'Cancel',
      type: 'warning',
    });
    if (!confirmed) return;

    try {
      await api.post(`/shifts/${rosterShift.id}/remove-employee/`, {
        employee_id: empId,
      });
      toast.info(`${empName} has been unassigned from this shift.`);
      await fetchRosterData(rosterShift.id);
      fetchShifts();
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Failed to remove employee from roster');
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Clock className="w-5 h-5 text-indigo-600" />
            <span>Shifts & Rostering</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure work schedules, night shifts, late-grace periods, and department roster assignments
          </p>
        </div>

        {canManageShifts && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Shift</span>
          </button>
        )}
      </div>

      {/* Shifts Grid */}
      {loading ? (
        <Loader message="Loading shift configurations..." />
      ) : shifts.length === 0 ? (
        <div className="bg-white p-12 rounded-xl border border-slate-200 text-center text-slate-500 text-xs">
          No shifts configured yet. Click "Create New Shift" above to add your first schedule.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {shifts.map((s) => {
            const isNight = s.is_night_shift || s.is_overnight;
            const staffCount = s.assigned_count ?? 0;
            const duration = calculateShiftDuration(s.start_time, s.end_time, isNight);

            return (
              <div
                key={s.id}
                className={`bg-white rounded-2xl border transition-all duration-200 flex flex-col justify-between hover:shadow-md ${
                  isNight
                    ? 'border-purple-200/90 hover:border-purple-300 ring-1 ring-purple-500/5'
                    : 'border-slate-200 hover:border-indigo-300'
                }`}
              >
                <div className="p-5">
                  {/* Card Header: Icon, Shift Title, Code Badge, and Actions */}
                  <div className="flex items-start justify-between gap-2 mb-3.5">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`p-2.5 rounded-xl shrink-0 shadow-2xs ${
                          isNight
                            ? 'bg-purple-100/80 text-purple-700 border border-purple-200'
                            : 'bg-amber-100/80 text-amber-700 border border-amber-200'
                        }`}
                      >
                        {isNight ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-sm font-bold text-slate-900 truncate" title={s.name}>
                          {s.name}
                        </h3>
                        <span className="font-mono text-[10px] font-bold text-slate-600 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded">
                          {s.code}
                        </span>
                      </div>
                    </div>

                    {/* Edit & Delete Action Buttons */}
                    {canManageShifts && (
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => openEditModal(s)}
                          title="Edit Shift"
                          className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(s)}
                          title="Delete Shift"
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Shift Timing Highlight Box */}
                  <div className={`p-3 rounded-xl border mb-3 space-y-1.5 ${
                    isNight
                      ? 'bg-purple-50/50 border-purple-100'
                      : 'bg-slate-50 border-slate-100'
                  }`}>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Working Window</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        isNight ? 'bg-purple-100 text-purple-700' : 'bg-slate-200/80 text-slate-700'
                      }`}>
                        {duration} Shift
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-slate-900 font-mono font-bold text-sm">
                      <span>{formatTime12h(s.start_time)}</span>
                      <span className="text-slate-400 text-xs font-sans font-normal">&rarr;</span>
                      <span>{formatTime12h(s.end_time)}</span>
                    </div>
                  </div>

                  {/* Metadata Badges: Grace Allowance & Shift Type */}
                  <div className="flex items-center justify-between text-xs pt-1">
                    <span className="text-[11px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 rounded-md flex items-center gap-1">
                      <Clock className="w-3 h-3 text-emerald-600" />
                      +{s.grace_period_minutes || 15}m Grace
                    </span>
                    <Badge variant={isNight ? 'purple' : 'info'}>
                      {isNight ? 'NIGHT SHIFT' : 'DAY SHIFT'}
                    </Badge>
                  </div>
                </div>

                {/* Card Footer: Assigned count & View Roster action */}
                <div className="px-5 py-3 bg-slate-50/60 border-t border-slate-100 flex items-center justify-between rounded-b-2xl">
                  <div className="flex items-center gap-1.5 text-xs text-slate-600 font-medium">
                    <Users className="w-3.5 h-3.5 text-indigo-600" />
                    <span>{staffCount} Staff Assigned</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleOpenRoster(s)}
                    className="text-xs font-bold text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 border border-transparent hover:border-indigo-200 px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <span>View Roster</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* Modal 1: Create New Shift Schedule                   */}
      {/* ---------------------------------------------------- */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Configure New Shift Schedule"
        subtitle="Set up standard daily or overnight work hours, grace allowances, and codes."
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Shift Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. General Day Shift"
                className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 transition-all font-medium text-slate-800"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Shift Code <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                placeholder="GEN"
                className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl outline-none font-mono font-bold focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 transition-all text-slate-800 uppercase"
              />
            </div>
          </div>

          {/* Working Hours Panel */}
          <div className="p-3.5 bg-slate-50/90 rounded-xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-indigo-600" />
                Working Hours Window
              </span>
              <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-full">
                Duration: {calculateShiftDuration(formData.start_time, formData.end_time, formData.is_night_shift)}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Start Time (Punch-in)</label>
                <input
                  type="time"
                  required
                  value={formData.start_time}
                  onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg outline-none bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 font-medium"
                />
                <span className="block text-[10px] text-slate-400 mt-1 font-mono">
                  Starts: {formatTime12h(formData.start_time)}
                </span>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">End Time (Punch-out)</label>
                <input
                  type="time"
                  required
                  value={formData.end_time}
                  onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg outline-none bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 font-medium"
                />
                <span className="block text-[10px] text-slate-400 mt-1 font-mono">
                  Ends: {formatTime12h(formData.end_time)} {formData.is_night_shift ? '(Next day)' : ''}
                </span>
              </div>
            </div>
          </div>

          {/* Grace Period */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-slate-700">
                Grace Period Tolerance
              </label>
              <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                +{formData.grace_period_minutes || 0} mins late allowance
              </span>
            </div>
            <div className="relative">
              <input
                type="number"
                min="0"
                max="120"
                value={formData.grace_period_minutes}
                onChange={(e) =>
                  setFormData({ ...formData, grace_period_minutes: parseInt(e.target.value) || 0 })
                }
                className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 transition-all font-medium pr-16"
                placeholder="15"
              />
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-semibold pointer-events-none">
                minutes
              </span>
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              Arrivals within this threshold are marked on-time and avoid shortfall wage deductions.
            </p>
          </div>

          {/* Night Shift Interactive Toggle Card */}
          <div
            onClick={() => setFormData({ ...formData, is_night_shift: !formData.is_night_shift })}
            className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
              formData.is_night_shift
                ? 'bg-purple-50/70 border-purple-300 ring-2 ring-purple-500/20 shadow-xs'
                : 'bg-slate-50/70 border-slate-200 hover:bg-slate-100/60'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-xl shrink-0 transition-colors ${
                formData.is_night_shift ? 'bg-purple-600 text-white shadow-xs' : 'bg-slate-200 text-slate-500'
              }`}>
                <Moon className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-xs font-bold text-slate-900">Overnight Shift Schedule</p>
                  {formData.is_night_shift && (
                    <span className="text-[9px] font-bold text-purple-700 bg-purple-100 px-1.5 py-0.2 rounded uppercase">
                      Active
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 leading-tight mt-0.5">
                  Working hours cross midnight into next day (e.g. 9:00 PM &rarr; 6:00 AM)
                </p>
              </div>
            </div>
            {/* Toggle Switch */}
            <div className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors duration-200 shrink-0 ${
              formData.is_night_shift ? 'bg-purple-600' : 'bg-slate-300'
            }`}>
              <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ${
                formData.is_night_shift ? 'translate-x-5' : 'translate-x-0'
              }`} />
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowCreateModal(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Save Shift</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* ---------------------------------------------------- */}
      {/* Modal 2: Edit Shift Schedule                         */}
      {/* ---------------------------------------------------- */}
      <Modal
        isOpen={Boolean(editingShift)}
        onClose={() => setEditingShift(null)}
        title="Edit Shift Schedule"
        subtitle={`Updating parameters for "${editingShift?.name || 'Shift'}"`}
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleUpdate} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Shift Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={editFormData.name}
                onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                placeholder="e.g. Night Operations Shift"
                className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 transition-all font-medium text-slate-800"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Shift Code <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={editFormData.code}
                onChange={(e) => setEditFormData({ ...editFormData, code: e.target.value.toUpperCase() })}
                placeholder="NIGHT"
                className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl outline-none font-mono font-bold focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 transition-all text-slate-800 uppercase"
              />
            </div>
          </div>

          {/* Working Hours Panel */}
          <div className="p-3.5 bg-slate-50/90 rounded-xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-indigo-600" />
                Working Hours Window
              </span>
              <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-full">
                Duration: {calculateShiftDuration(editFormData.start_time, editFormData.end_time, editFormData.is_night_shift)}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Start Time (Punch-in)</label>
                <input
                  type="time"
                  required
                  value={editFormData.start_time}
                  onChange={(e) => setEditFormData({ ...editFormData, start_time: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg outline-none bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 font-medium"
                />
                <span className="block text-[10px] text-slate-400 mt-1 font-mono">
                  Starts: {formatTime12h(editFormData.start_time)}
                </span>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">End Time (Punch-out)</label>
                <input
                  type="time"
                  required
                  value={editFormData.end_time}
                  onChange={(e) => setEditFormData({ ...editFormData, end_time: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg outline-none bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 font-medium"
                />
                <span className="block text-[10px] text-slate-400 mt-1 font-mono">
                  Ends: {formatTime12h(editFormData.end_time)} {editFormData.is_night_shift ? '(Next day)' : ''}
                </span>
              </div>
            </div>
          </div>

          {/* Grace Period */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-slate-700">
                Grace Period Tolerance
              </label>
              <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                +{editFormData.grace_period_minutes || 0} mins late allowance
              </span>
            </div>
            <div className="relative">
              <input
                type="number"
                min="0"
                max="120"
                value={editFormData.grace_period_minutes}
                onChange={(e) =>
                  setEditFormData({ ...editFormData, grace_period_minutes: parseInt(e.target.value) || 0 })
                }
                className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 transition-all font-medium pr-16"
                placeholder="15"
              />
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-semibold pointer-events-none">
                minutes
              </span>
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              Arrivals within this threshold are marked on-time and avoid shortfall wage deductions.
            </p>
          </div>

          {/* Night Shift Interactive Toggle Card */}
          <div
            onClick={() => setEditFormData({ ...editFormData, is_night_shift: !editFormData.is_night_shift })}
            className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
              editFormData.is_night_shift
                ? 'bg-purple-50/70 border-purple-300 ring-2 ring-purple-500/20 shadow-xs'
                : 'bg-slate-50/70 border-slate-200 hover:bg-slate-100/60'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-xl shrink-0 transition-colors ${
                editFormData.is_night_shift ? 'bg-purple-600 text-white shadow-xs' : 'bg-slate-200 text-slate-500'
              }`}>
                <Moon className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-xs font-bold text-slate-900">Overnight Shift Schedule</p>
                  {editFormData.is_night_shift && (
                    <span className="text-[9px] font-bold text-purple-700 bg-purple-100 px-1.5 py-0.2 rounded uppercase">
                      Active
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 leading-tight mt-0.5">
                  Working hours cross midnight into next day (e.g. 9:00 PM &rarr; 6:00 AM)
                </p>
              </div>
            </div>
            {/* Toggle Switch */}
            <div className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors duration-200 shrink-0 ${
              editFormData.is_night_shift ? 'bg-purple-600' : 'bg-slate-300'
            }`}>
              <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ${
                editFormData.is_night_shift ? 'translate-x-5' : 'translate-x-0'
              }`} />
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setEditingShift(null)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Update Shift</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* ---------------------------------------------------- */}
      {/* Modal 3: Shift Roster Viewer & Employee Assignment   */}
      {/* ---------------------------------------------------- */}
      <Modal
        isOpen={Boolean(rosterShift)}
        onClose={() => setRosterShift(null)}
        title={`Roster Management — ${rosterShift?.name || ''}`}
        subtitle="Assign employees and manage active staff coverage for this shift schedule"
        maxWidth="max-w-2xl"
      >
        <div className="space-y-5">
          {/* Shift Snapshot Header */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-slate-700 bg-white px-2 py-0.5 rounded border border-slate-200">
                {rosterShift?.code}
              </span>
              <span className="font-semibold text-slate-900 font-mono">
                {formatTime12h(rosterShift?.start_time)} &rarr; {formatTime12h(rosterShift?.end_time)}
              </span>
              <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">
                {calculateShiftDuration(rosterShift?.start_time, rosterShift?.end_time, rosterShift?.is_night_shift || rosterShift?.is_overnight)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-semibold text-[11px] border border-emerald-200">
                +{rosterShift?.grace_period_minutes}m Grace
              </span>
              <Badge variant={rosterShift?.is_night_shift || rosterShift?.is_overnight ? 'purple' : 'info'}>
                {rosterShift?.is_night_shift || rosterShift?.is_overnight ? 'NIGHT SHIFT' : 'DAY SHIFT'}
              </Badge>
            </div>
          </div>

          {/* Form to Assign New Employee to this Shift Roster */}
          {canManageShifts && (
            <form onSubmit={handleAssignEmployee} className="p-4 bg-indigo-50/60 border border-indigo-100 rounded-xl space-y-3">
              <h4 className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
                <UserPlus className="w-4 h-4 text-indigo-600" />
                <span>Assign Staff Member to this Roster</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Select Employee *
                  </label>
                  <select
                    required
                    value={assignEmployeeId}
                    onChange={(e) => setAssignEmployeeId(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg outline-none bg-white focus:ring-2 focus:ring-indigo-600"
                  >
                    <option value="">-- Choose Employee --</option>
                    {employeesList.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.first_name} {emp.last_name} ({emp.employee_code}) - {emp.department_name || 'General'}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Effective From
                  </label>
                  <input
                    type="date"
                    required
                    value={assignEffectiveFrom}
                    onChange={(e) => setAssignEffectiveFrom(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg outline-none bg-white"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  disabled={assigning || !assignEmployeeId}
                  className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>{assigning ? 'Assigning...' : 'Assign to Roster'}</span>
                </button>
              </div>
            </form>
          )}

          {/* Current Roster Members Table */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Assigned Staff ({rosterData.length})
              </h4>
              <span className="text-[11px] text-slate-400">Active roster members</span>
            </div>

            {rosterLoading ? (
              <Loader message="Loading assigned roster staff..." />
            ) : rosterData.length === 0 ? (
              <div className="p-8 border border-dashed border-slate-200 rounded-xl text-center text-slate-400 text-xs">
                No employees are currently assigned to this shift roster. Select an employee above to assign them.
              </div>
            ) : (
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[11px]">
                        <th className="py-2.5 px-3">Employee</th>
                        <th className="py-2.5 px-3">Branch & Dept</th>
                        <th className="py-2.5 px-3">Effective Date</th>
                        {canManageShifts && <th className="py-2.5 px-3 text-right">Action</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {rosterData.map((row) => (
                        <tr key={row.id} className="hover:bg-slate-50/75 transition-colors">
                          <td className="py-2.5 px-3">
                            <p className="font-semibold text-slate-900">{row.employee_name}</p>
                            <p className="font-mono text-[11px] text-slate-400">{row.employee_code}</p>
                          </td>
                          <td className="py-2.5 px-3 text-slate-600">
                            <p>{row.department}</p>
                            <p className="text-[11px] text-slate-400">{row.branch}</p>
                          </td>
                          <td className="py-2.5 px-3 text-slate-600 font-mono text-[11px]">
                            {row.effective_from ? formatDate(row.effective_from) : '-'}
                          </td>
                          {canManageShifts && (
                            <td className="py-2.5 px-3 text-right">
                              <button
                                type="button"
                                onClick={() => handleRemoveFromRoster(row.employee_id, row.employee_name)}
                                title="Unassign from this shift"
                                className="inline-flex items-center gap-1 px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded text-[11px] font-semibold transition-colors cursor-pointer"
                              >
                                <UserMinus className="w-3 h-3" />
                                <span>Remove</span>
                              </button>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* Modal Footer */}
          <div className="pt-3 border-t border-slate-100 flex justify-end">
            <button
              type="button"
              onClick={() => setRosterShift(null)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
            >
              Close Roster
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
