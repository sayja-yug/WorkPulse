import React, { useState, useEffect } from 'react';
import api from '../api/client';
import { usePermissions } from '../hooks/usePermissions';
import { Clock, Plus, Moon, Sun, Users } from 'lucide-react';
import { Modal } from '../components/ui/Modal';
import { Badge } from '../components/ui/Badge';
import { Loader } from '../components/ui/Loader';

export const Shifts = () => {
  const { canManageShifts } = usePermissions();

  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    start_time: '09:00',
    end_time: '18:00',
    grace_period_minutes: 15,
    is_night_shift: false,
  });

  const fetchShifts = async () => {
    try {
      setLoading(true);
      const res = await api.get('/shifts/');
      const data = res.data.data;
      setShifts(Array.isArray(data) ? data : data.results || []);
    } catch (err) {
      console.error('Failed to load shifts', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShifts();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await api.post('/shifts/', formData);
      setShowModal(false);
      setFormData({
        name: '',
        code: '',
        start_time: '09:00',
        end_time: '18:00',
        grace_period_minutes: 15,
        is_night_shift: false,
      });
      fetchShifts();
      alert('Shift created successfully!');
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Failed to create shift');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
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
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold shadow-sm transition-colors"
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
          No shifts configured yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {shifts.map((s) => (
            <div key={s.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    {s.is_night_shift ? (
                      <Moon className="w-4 h-4 text-purple-600" />
                    ) : (
                      <Sun className="w-4 h-4 text-amber-500" />
                    )}
                    <h3 className="text-sm font-bold text-slate-900">{s.name}</h3>
                  </div>
                  <span className="font-mono text-[10px] font-semibold bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                    {s.code}
                  </span>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between text-slate-600">
                    <span>Working Hours:</span>
                    <span className="font-semibold text-slate-900">
                      {s.start_time} - {s.end_time}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-slate-600">
                    <span>Grace Period:</span>
                    <span className="font-semibold text-emerald-600">
                      +{s.grace_period_minutes || 15} mins late allowance
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-slate-600">
                    <span>Shift Type:</span>
                    <Badge variant={s.is_night_shift ? 'purple' : 'info'}>
                      {s.is_night_shift ? 'NIGHT SHIFT' : 'DAY SHIFT'}
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                <span className="flex items-center gap-1">
                  <Users className="w-3.5 h-3.5 text-slate-400" /> Standard Shift
                </span>
                <span className="text-indigo-600 font-semibold cursor-pointer hover:underline">
                  View Roster
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Shift Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Configure New Shift Schedule">
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Shift Name</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Morning General"
                className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Shift Code</label>
              <input
                type="text"
                required
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                placeholder="e.g. S-GEN"
                className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Start Time</label>
              <input
                type="time"
                required
                value={formData.start_time}
                onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">End Time</label>
              <input
                type="time"
                required
                value={formData.end_time}
                onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Grace Period (Minutes)</label>
            <input
              type="number"
              min="0"
              max="60"
              value={formData.grace_period_minutes}
              onChange={(e) => setFormData({ ...formData, grace_period_minutes: parseInt(e.target.value) || 0 })}
              className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg outline-none"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is_night_shift"
              checked={formData.is_night_shift}
              onChange={(e) => setFormData({ ...formData, is_night_shift: e.target.checked })}
              className="rounded text-indigo-600 focus:ring-indigo-500"
            />
            <label htmlFor="is_night_shift" className="text-xs font-semibold text-slate-700 cursor-pointer">
              Is Night Shift (Crosses midnight)
            </label>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-sm transition-colors"
            >
              Save Shift
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

