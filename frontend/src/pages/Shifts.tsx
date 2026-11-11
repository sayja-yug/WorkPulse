import React, { useState, useEffect } from 'react';
import api from '../api/client';
import { Clock, Plus, Users, CheckCircle2, Moon, Sun } from 'lucide-react';

export const Shifts: React.FC = () => {
  const [shifts, setShifts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Shifts & Roster Management</h2>
          <p className="text-xs text-slate-500 mt-0.5">Fixed, night, flexible rosters, grace windows & overtime thresholds</p>
        </div>

        <button
          onClick={() => alert('New shift template creation modal')}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold shadow-sm transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Create Shift</span>
        </button>
      </div>

      {/* Shifts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {shifts.map((sh) => (
          <div key={sh.id} className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {sh.is_overnight ? (
                  <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
                    <Moon className="w-4 h-4" />
                  </div>
                ) : (
                  <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
                    <Sun className="w-4 h-4" />
                  </div>
                )}
                <div>
                  <h3 className="font-bold text-slate-900 text-sm leading-tight">{sh.name}</h3>
                  <span className="text-[10px] font-mono font-medium text-slate-400">{sh.code}</span>
                </div>
              </div>

              <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-100 text-slate-700 rounded-full border border-slate-200">
                {sh.type}
              </span>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 space-y-1.5 text-xs text-slate-600">
              <div className="flex justify-between">
                <span>Working Hours:</span>
                <span className="font-semibold text-slate-900 font-mono">
                  {sh.start_time} - {sh.end_time}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Grace Arrival:</span>
                <span className="font-semibold text-slate-900">{sh.grace_period_minutes} mins</span>
              </div>
              <div className="flex justify-between">
                <span>Full Day Minimum:</span>
                <span className="font-semibold text-slate-900">{sh.full_day_hours} hrs</span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
              <span className="text-slate-500 font-medium">Overnight Rollover: {sh.is_overnight ? 'Yes' : 'No'}</span>
              <button
                onClick={() => alert(`Assigning employees to shift ${sh.name}`)}
                className="text-indigo-600 font-semibold hover:underline"
              >
                Assign Roster
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

