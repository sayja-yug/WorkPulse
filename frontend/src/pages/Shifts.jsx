import React, { useState, useEffect } from 'react';
import {
  Clock,
  Plus,
  Users,
  Moon,
  Sun,
  Edit2,
  Trash2,
  Check,
  ArrowRight,
  UserPlus,
  UserMinus,
} from 'lucide-react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { formatDate } from '../utils/formatters';
import { PageHeader } from '../components/layout/PageHeader';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Button,
  Input,
  Select,
  Badge,
  Loader,
  Modal,
} from '../components/ui';

export const Shifts = () => {
  const { user, activeRole, hasPermission } = useAuth();
  const { toast, confirm } = useNotification();

  // Role permissions
  const canManageShifts =
    activeRole === 'BUSINESS_OWNER' ||
    activeRole === 'HR_MANAGER' ||
    activeRole === 'SUPER_ADMIN' ||
    hasPermission('MANAGE_SHIFTS');

  // State
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingShift, setEditingShift] = useState(null);
  const [rosterShift, setRosterShift] = useState(null);

  // Form State for Create
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    start_time: '09:30',
    end_time: '18:30',
    grace_period_minutes: 15,
    is_night_shift: false,
    description: '',
  });

  // Form State for Edit
  const [editFormData, setEditFormData] = useState({
    name: '',
    code: '',
    start_time: '',
    end_time: '',
    grace_period_minutes: 15,
    is_night_shift: false,
    description: '',
  });

  // Roster Management State
  const [rosterData, setRosterData] = useState([]);
  const [rosterLoading, setRosterLoading] = useState(false);
  const [employeesList, setEmployeesList] = useState([]);
  const [assignEmployeeId, setAssignEmployeeId] = useState('');
  const [assignEffectiveFrom, setAssignEffectiveFrom] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [assigning, setAssigning] = useState(false);

  // Format 24h to 12h display
  const formatTime12h = (timeStr) => {
    if (!timeStr) return '--:--';
    const [hours, minutes] = timeStr.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${String(minutes).padStart(2, '0')} ${period}`;
  };

  // Calculate shift duration
  const calculateShiftDuration = (startStr, endStr, isNight) => {
    if (!startStr || !endStr) return '0 hrs';
    const [startH, startM] = startStr.split(':').map(Number);
    const [endH, endM] = endStr.split(':').map(Number);

    let startTotalMins = startH * 60 + startM;
    let endTotalMins = endH * 60 + endM;

    if (isNight || endTotalMins < startTotalMins) {
      endTotalMins += 24 * 60;
    }

    const diffMins = endTotalMins - startTotalMins;
    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;

    if (mins === 0) return `${hours} hrs`;
    return `${hours}h ${mins}m`;
  };

  // 1. Fetch all configured shifts
  const fetchShifts = async () => {
    try {
      setLoading(true);
      const res = await api.get('/shifts/');
      const data = res.data?.data || res.data?.results || res.data || [];
      setShifts(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load shifts', err);
      toast.error('Could not load company shift schedules.');
    } finally {
      setLoading(false);
    }
  };

  // Fetch employees list for roster dropdown
  const fetchEmployeesList = async () => {
    try {
      const res = await api.get('/employees/');
      const data = res.data?.data || res.data?.results || res.data || [];
      setEmployeesList(Array.isArray(data) ? data : []);
    } catch (err) {
      console.warn('Could not load workforce list for roster assignment', err);
    }
  };

  useEffect(() => {
    fetchShifts();
    if (canManageShifts) {
      fetchEmployeesList();
    }
  }, []);

  // 2. Create Shift
  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await api.post('/shifts/', {
        ...formData,
        code: formData.code.toUpperCase().trim(),
        grace_period_minutes: Number(formData.grace_period_minutes) || 0,
      });
      toast.success(`Shift "${formData.name}" created successfully!`);
      setShowCreateModal(false);
      setFormData({
        name: '',
        code: '',
        start_time: '09:30',
        end_time: '18:30',
        grace_period_minutes: 15,
        is_night_shift: false,
        description: '',
      });
      fetchShifts();
    } catch (err) {
      toast.error(
        err.response?.data?.error?.message ||
        err.response?.data?.code?.[0] ||
        'Failed to create shift schedule.'
      );
    }
  };

  // 3. Open Edit Modal
  const openEditModal = (shift) => {
    setEditingShift(shift);
    setEditFormData({
      name: shift.name || '',
      code: shift.code || '',
      start_time: shift.start_time?.substring(0, 5) || '09:30',
      end_time: shift.end_time?.substring(0, 5) || '18:30',
      grace_period_minutes: shift.grace_period_minutes ?? 15,
      is_night_shift: Boolean(shift.is_night_shift || shift.is_overnight),
      description: shift.description || '',
    });
  };

  // 4. Update Shift
  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!editingShift) return;
    try {
      await api.patch(`/shifts/${editingShift.id}/`, {
        ...editFormData,
        code: editFormData.code.toUpperCase().trim(),
        grace_period_minutes: Number(editFormData.grace_period_minutes) || 0,
      });
      toast.success(`Shift "${editFormData.name}" updated successfully!`);
      setEditingShift(null);
      fetchShifts();
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Failed to update shift schedule.');
    }
  };

  // 5. Delete Shift
  const handleDelete = async (shift) => {
    const confirmed = await confirm({
      title: 'Delete Shift Schedule',
      message: `Are you sure you want to delete "${shift.name}" (${shift.code})? Employees assigned to this shift may need a new schedule assigned.`,
      confirmText: 'Delete Shift',
      cancelText: 'Cancel',
      type: 'danger',
    });
    if (!confirmed) return;

    try {
      await api.delete(`/shifts/${shift.id}/`);
      toast.info(`Shift "${shift.name}" deleted.`);
      fetchShifts();
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Could not delete shift.');
    }
  };

  // 6. Roster Inspection & Assignment
  const handleOpenRoster = async (shift) => {
    setRosterShift(shift);
    setAssignEmployeeId('');
    await fetchRosterData(shift.id);
  };

  const fetchRosterData = async (shiftId) => {
    try {
      setRosterLoading(true);
      const res = await api.get(`/shifts/${shiftId}/roster/`);
      const data = res.data?.data || res.data?.results || res.data || [];
      setRosterData(Array.isArray(data) ? data : []);
    } catch (err) {
      console.warn('Could not load roster data', err);
      setRosterData([]);
    } finally {
      setRosterLoading(false);
    }
  };

  const handleAssignEmployee = async (e) => {
    e.preventDefault();
    if (!rosterShift || !assignEmployeeId) return;
    try {
      setAssigning(true);
      await api.post(`/shifts/${rosterShift.id}/assign-employee/`, {
        employee_id: assignEmployeeId,
        effective_from: assignEffectiveFrom,
      });
      toast.success('Employee successfully assigned to this shift roster!');
      setAssignEmployeeId('');
      await fetchRosterData(rosterShift.id);
      fetchShifts();
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Failed to assign employee to roster');
    } finally {
      setAssigning(false);
    }
  };

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
      {/* Global Standard Page Header */}
      <PageHeader
        title="Shifts & Rostering"
        description="Configure work schedules, night shifts, late-grace periods, and department roster assignments"
        actions={
          canManageShifts ? (
            <Button
              variant="primary"
              size="sm"
              leftIcon={Plus}
              onClick={() => setShowCreateModal(true)}
            >
              Create New Shift
            </Button>
          ) : null
        }
      />

      {/* Shifts Grid */}
      {loading ? (
        <Loader message="Loading shift configurations..." />
      ) : shifts.length === 0 ? (
        <div className="bg-white p-12 rounded-xl border border-zinc-200 text-center text-zinc-500 text-xs">
          No shifts configured yet. Click &ldquo;Create New Shift&rdquo; above to add your first schedule.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {shifts.map((s) => {
            const isNight = Boolean(s.is_night_shift || s.is_overnight);
            const staffCount = s.assigned_count ?? 0;
            const duration = calculateShiftDuration(s.start_time, s.end_time, isNight);

            return (
              <Card
                key={s.id}
                className="flex flex-col justify-between hover:border-zinc-400 transition-all duration-200"
              >
                <div className="p-5">
                  {/* Card Header: Icon, Shift Title, Code Badge, and Actions */}
                  <div className="flex items-start justify-between gap-2 mb-3.5">
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`p-2.5 rounded-xl shrink-0 shadow-2xs border ${
                          isNight
                            ? 'bg-zinc-950 text-white border-zinc-900'
                            : 'bg-zinc-100 text-zinc-900 border-zinc-200'
                        }`}
                      >
                        {isNight ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-sm font-bold text-zinc-950 truncate" title={s.name}>
                          {s.name}
                        </h3>
                        <span className="font-mono text-[10px] font-bold text-zinc-600 bg-zinc-100 border border-zinc-200 px-1.5 py-0.5 rounded">
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
                          className="p-1.5 text-zinc-400 hover:text-black hover:bg-zinc-100 rounded-lg transition-colors cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(s)}
                          title="Delete Shift"
                          className="p-1.5 text-zinc-400 hover:text-black hover:bg-zinc-100 rounded-lg transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Shift Timing Highlight Box: High Contrast Light Mode */}
                  <div className="p-3.5 rounded-xl border border-zinc-200 bg-zinc-50 mb-3 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                        Working Window
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-zinc-200 text-zinc-800">
                        {duration} Shift
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-zinc-950 font-mono font-bold text-sm">
                      <span>{formatTime12h(s.start_time)}</span>
                      <span className="text-zinc-400 text-xs font-sans font-normal">&rarr;</span>
                      <span>{formatTime12h(s.end_time)}</span>
                    </div>
                  </div>

                  {/* Metadata Badges: Grace Allowance & Shift Type */}
                  <div className="flex items-center justify-between text-xs pt-1">
                    <span className="text-[11px] font-semibold text-zinc-800 bg-zinc-100 border border-zinc-200 px-2 py-0.5 rounded-md flex items-center gap-1">
                      <Clock className="w-3 h-3 text-zinc-500" />
                      +{s.grace_period_minutes || 15}m Grace
                    </span>
                    <Badge variant={isNight ? 'inverted' : 'neutral'}>
                      {isNight ? 'NIGHT SHIFT' : 'DAY SHIFT'}
                    </Badge>
                  </div>
                </div>

                {/* Card Footer: Assigned count & View Roster action */}
                <div className="px-5 py-3.5 bg-zinc-50/70 border-t border-zinc-100 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs text-zinc-600 font-semibold">
                    <Users className="w-3.5 h-3.5 text-zinc-700" />
                    <span>{staffCount} Staff Assigned</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleOpenRoster(s)}
                    className="text-xs font-bold text-zinc-950 hover:underline px-2 py-1 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <span>View Roster</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Global Standard Modal: Create Shift Schedule */}
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
              <Input
                label="Shift Name"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. General Day Shift"
              />
            </div>
            <div>
              <Input
                label="Shift Code"
                required
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                placeholder="GEN"
              />
            </div>
          </div>

          {/* Working Hours Panel */}
          <div className="p-3.5 bg-zinc-50 rounded-xl border border-zinc-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-zinc-900 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-zinc-700" />
                Working Hours Window
              </span>
              <span className="text-[11px] font-bold text-zinc-800 bg-zinc-200 px-2 py-0.5 rounded-full">
                Duration: {calculateShiftDuration(formData.start_time, formData.end_time, formData.is_night_shift)}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-zinc-700 uppercase tracking-wider mb-1">
                  Start Time
                </label>
                <input
                  type="time"
                  required
                  value={formData.start_time}
                  onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-zinc-300 rounded-lg outline-none bg-white text-zinc-900 focus:border-zinc-950 font-medium"
                />
                <span className="block text-[10px] text-zinc-500 mt-1 font-mono">
                  Starts: {formatTime12h(formData.start_time)}
                </span>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-zinc-700 uppercase tracking-wider mb-1">
                  End Time
                </label>
                <input
                  type="time"
                  required
                  value={formData.end_time}
                  onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-zinc-300 rounded-lg outline-none bg-white text-zinc-900 focus:border-zinc-950 font-medium"
                />
                <span className="block text-[10px] text-zinc-500 mt-1 font-mono">
                  Ends: {formatTime12h(formData.end_time)} {formData.is_night_shift ? '(Next day)' : ''}
                </span>
              </div>
            </div>
          </div>

          {/* Grace Period */}
          <Input
            label="Grace Period (Minutes)"
            type="number"
            min="0"
            max="120"
            value={formData.grace_period_minutes}
            onChange={(e) =>
              setFormData({ ...formData, grace_period_minutes: parseInt(e.target.value) || 0 })
            }
            helperText="Arrivals within this threshold are marked on-time and avoid shortfall wage deductions."
          />

          {/* Overnight Shift Toggle Card */}
          <div
            onClick={() => setFormData({ ...formData, is_night_shift: !formData.is_night_shift })}
            className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
              formData.is_night_shift
                ? 'bg-zinc-100 border-zinc-950 shadow-xs'
                : 'bg-zinc-50 border-zinc-200 hover:bg-zinc-100'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-xl shrink-0 transition-colors ${
                formData.is_night_shift ? 'bg-zinc-950 text-white' : 'bg-zinc-200 text-zinc-600'
              }`}>
                <Moon className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-xs font-bold text-zinc-950">Overnight Shift Schedule</p>
                  {formData.is_night_shift && (
                    <span className="text-[9px] font-bold text-white bg-zinc-950 px-1.5 py-0.5 rounded uppercase">
                      Active
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-zinc-500 leading-tight mt-0.5">
                  Working hours cross midnight into next day (e.g. 9:00 PM &rarr; 6:00 AM)
                </p>
              </div>
            </div>

            <div className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors duration-200 shrink-0 ${
              formData.is_night_shift ? 'bg-zinc-950' : 'bg-zinc-300'
            }`}>
              <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ${
                formData.is_night_shift ? 'translate-x-5' : 'translate-x-0'
              }`} />
            </div>
          </div>

          <div className="pt-4 border-t border-zinc-100 flex items-center justify-end gap-2.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowCreateModal(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              leftIcon={Check}
            >
              Save Shift
            </Button>
          </div>
        </form>
      </Modal>

      {/* Global Standard Modal: Edit Shift Schedule */}
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
              <Input
                label="Shift Name"
                required
                value={editFormData.name}
                onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
              />
            </div>
            <div>
              <Input
                label="Shift Code"
                required
                value={editFormData.code}
                onChange={(e) => setEditFormData({ ...editFormData, code: e.target.value.toUpperCase() })}
              />
            </div>
          </div>

          {/* Working Hours Panel */}
          <div className="p-3.5 bg-zinc-50 rounded-xl border border-zinc-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-zinc-900 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-zinc-700" />
                Working Hours Window
              </span>
              <span className="text-[11px] font-bold text-zinc-800 bg-zinc-200 px-2 py-0.5 rounded-full">
                Duration: {calculateShiftDuration(editFormData.start_time, editFormData.end_time, editFormData.is_night_shift)}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-zinc-700 uppercase tracking-wider mb-1">
                  Start Time
                </label>
                <input
                  type="time"
                  required
                  value={editFormData.start_time}
                  onChange={(e) => setEditFormData({ ...editFormData, start_time: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-zinc-300 rounded-lg outline-none bg-white text-zinc-900 focus:border-zinc-950 font-medium"
                />
                <span className="block text-[10px] text-zinc-500 mt-1 font-mono">
                  Starts: {formatTime12h(editFormData.start_time)}
                </span>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-zinc-700 uppercase tracking-wider mb-1">
                  End Time
                </label>
                <input
                  type="time"
                  required
                  value={editFormData.end_time}
                  onChange={(e) => setEditFormData({ ...editFormData, end_time: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-zinc-300 rounded-lg outline-none bg-white text-zinc-900 focus:border-zinc-950 font-medium"
                />
                <span className="block text-[10px] text-zinc-500 mt-1 font-mono">
                  Ends: {formatTime12h(editFormData.end_time)} {editFormData.is_night_shift ? '(Next day)' : ''}
                </span>
              </div>
            </div>
          </div>

          {/* Grace Period */}
          <Input
            label="Grace Period (Minutes)"
            type="number"
            min="0"
            max="120"
            value={editFormData.grace_period_minutes}
            onChange={(e) =>
              setEditFormData({ ...editFormData, grace_period_minutes: parseInt(e.target.value) || 0 })
            }
          />

          {/* Overnight Toggle Card */}
          <div
            onClick={() => setEditFormData({ ...editFormData, is_night_shift: !editFormData.is_night_shift })}
            className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
              editFormData.is_night_shift
                ? 'bg-zinc-100 border-zinc-950 shadow-xs'
                : 'bg-zinc-50 border-zinc-200 hover:bg-zinc-100'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-xl shrink-0 transition-colors ${
                editFormData.is_night_shift ? 'bg-zinc-950 text-white' : 'bg-zinc-200 text-zinc-600'
              }`}>
                <Moon className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-xs font-bold text-zinc-950">Overnight Shift Schedule</p>
                  {editFormData.is_night_shift && (
                    <span className="text-[9px] font-bold text-white bg-zinc-950 px-1.5 py-0.5 rounded uppercase">
                      Active
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-zinc-500 leading-tight mt-0.5">
                  Working hours cross midnight into next day (e.g. 9:00 PM &rarr; 6:00 AM)
                </p>
              </div>
            </div>

            <div className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors duration-200 shrink-0 ${
              editFormData.is_night_shift ? 'bg-zinc-950' : 'bg-zinc-300'
            }`}>
              <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ${
                editFormData.is_night_shift ? 'translate-x-5' : 'translate-x-0'
              }`} />
            </div>
          </div>

          <div className="pt-4 border-t border-zinc-100 flex items-center justify-end gap-2.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditingShift(null)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              leftIcon={Check}
            >
              Update Shift
            </Button>
          </div>
        </form>
      </Modal>

      {/* Global Standard Modal: Shift Roster Viewer & Assignment */}
      <Modal
        isOpen={Boolean(rosterShift)}
        onClose={() => setRosterShift(null)}
        title={`Roster Management — ${rosterShift?.name || ''}`}
        subtitle="Assign employees and manage active staff coverage for this shift schedule"
        maxWidth="max-w-2xl"
      >
        <div className="space-y-5">
          {/* Shift Snapshot Header */}
          <div className="p-4 bg-zinc-50 border border-zinc-200 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-zinc-900 bg-white px-2 py-0.5 rounded border border-zinc-200">
                {rosterShift?.code}
              </span>
              <span className="font-bold text-zinc-900 font-mono">
                {formatTime12h(rosterShift?.start_time)} &rarr; {formatTime12h(rosterShift?.end_time)}
              </span>
              <span className="text-[10px] font-bold text-zinc-800 bg-zinc-200 px-2 py-0.5 rounded-full">
                {calculateShiftDuration(rosterShift?.start_time, rosterShift?.end_time, rosterShift?.is_night_shift || rosterShift?.is_overnight)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-zinc-800 bg-zinc-100 px-2 py-0.5 rounded font-semibold text-[11px] border border-zinc-200">
                +{rosterShift?.grace_period_minutes}m Grace
              </span>
              <Badge variant={rosterShift?.is_night_shift || rosterShift?.is_overnight ? 'inverted' : 'neutral'}>
                {rosterShift?.is_night_shift || rosterShift?.is_overnight ? 'NIGHT SHIFT' : 'DAY SHIFT'}
              </Badge>
            </div>
          </div>

          {/* Form to Assign New Employee to this Shift Roster */}
          {canManageShifts && (
            <form onSubmit={handleAssignEmployee} className="p-4 bg-zinc-50 border border-zinc-200 rounded-xl space-y-3">
              <h4 className="text-xs font-bold text-zinc-950 flex items-center gap-1.5">
                <UserPlus className="w-4 h-4 text-zinc-700" />
                <span>Assign Staff Member to this Roster</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <Select
                    label="Select Employee"
                    required
                    value={assignEmployeeId}
                    onChange={(e) => setAssignEmployeeId(e.target.value)}
                  >
                    <option value="">-- Choose Employee --</option>
                    {employeesList.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.first_name} {emp.last_name} ({emp.employee_code}) - {emp.department_name || 'General'}
                      </option>
                    ))}
                  </Select>
                </div>

                <div>
                  <Input
                    label="Effective From"
                    type="date"
                    required
                    value={assignEffectiveFrom}
                    onChange={(e) => setAssignEffectiveFrom(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex justify-end pt-1">
                <Button
                  type="submit"
                  variant="primary"
                  size="xs"
                  disabled={assigning || !assignEmployeeId}
                  isLoading={assigning}
                  leftIcon={UserPlus}
                >
                  Assign to Roster
                </Button>
              </div>
            </form>
          )}

          {/* Current Roster Members Table */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-zinc-900 uppercase tracking-wider">
                Assigned Staff ({rosterData.length})
              </h4>
              <span className="text-[11px] text-zinc-500">Active roster members</span>
            </div>

            {rosterLoading ? (
              <Loader message="Loading assigned roster staff..." />
            ) : rosterData.length === 0 ? (
              <div className="p-8 border border-dashed border-zinc-200 rounded-xl text-center text-zinc-500 text-xs">
                No employees are currently assigned to this shift roster. Select an employee above to assign them.
              </div>
            ) : (
              <div className="border border-zinc-200 rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-zinc-50 border-b border-zinc-200 text-zinc-600 font-bold uppercase text-[11px] tracking-wider">
                        <th className="py-2.5 px-3">Employee</th>
                        <th className="py-2.5 px-3">Branch &amp; Dept</th>
                        <th className="py-2.5 px-3">Effective Date</th>
                        {canManageShifts && <th className="py-2.5 px-3 text-right">Action</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200">
                      {rosterData.map((row) => (
                        <tr key={row.id} className="hover:bg-zinc-50 transition-colors">
                          <td className="py-2.5 px-3">
                            <p className="font-bold text-zinc-900">{row.employee_name}</p>
                            <p className="font-mono text-[11px] text-zinc-500">{row.employee_code}</p>
                          </td>
                          <td className="py-2.5 px-3 text-zinc-600">
                            <p className="font-medium text-zinc-800">{row.department}</p>
                            <p className="text-[11px] text-zinc-500">{row.branch}</p>
                          </td>
                          <td className="py-2.5 px-3 text-zinc-600 font-mono text-[11px]">
                            {row.effective_from ? formatDate(row.effective_from) : '-'}
                          </td>
                          {canManageShifts && (
                            <td className="py-2.5 px-3 text-right">
                              <button
                                type="button"
                                onClick={() => handleRemoveFromRoster(row.employee_id, row.employee_name)}
                                title="Unassign from this shift"
                                className="inline-flex items-center gap-1 px-2.5 py-1 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 rounded text-[11px] font-semibold transition-colors cursor-pointer border border-zinc-200"
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
          <div className="pt-4 border-t border-zinc-100 flex justify-end">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setRosterShift(null)}
            >
              Close Roster
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Shifts;
