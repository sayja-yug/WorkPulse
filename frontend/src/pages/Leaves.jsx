import React, { useState, useEffect } from 'react';
import api from '../api/client';
import { usePermissions } from '../hooks/usePermissions';
import {
  CalendarOff,
  Plus,
  CheckCircle2,
  XCircle,
  Clock,
  Calendar,
  AlertCircle,
} from 'lucide-react';
import { Modal } from '../components/ui/Modal';
import { Badge } from '../components/ui/Badge';
import { Loader } from '../components/ui/Loader';
import { formatDate } from '../utils/formatters';

export const Leaves = () => {
  const { isEmployee, canApproveLeaves } = usePermissions();

  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [formData, setFormData] = useState({
    leave_type: 'CASUAL',
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0],
    reason: '',
  });

  const fetchLeaves = async () => {
    try {
      setLoading(true);
      const res = await api.get('/leaves/');
      const data = res.data.data;
      setLeaves(Array.isArray(data) ? data : data.results || []);
    } catch (err) {
      console.error('Failed to load leaves', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaves();
  }, []);

  const handleApply = async (e) => {
    e.preventDefault();
    try {
      await api.post('/leaves/apply/', formData);
      setShowApplyModal(false);
      setFormData({
        leave_type: 'CASUAL',
        start_date: new Date().toISOString().split('T')[0],
        end_date: new Date().toISOString().split('T')[0],
        reason: '',
      });
      fetchLeaves();
      alert('Leave application submitted successfully!');
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Failed to submit leave application');
    }
  };

  const handleApprove = async (id) => {
    try {
      await api.post(`/leaves/${id}/approve/`);
      fetchLeaves();
      alert('Leave approved!');
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Approval failed');
    }
  };

  const handleReject = async (id) => {
    const reason = prompt('Enter rejection reason:');
    if (!reason) return;
    try {
      await api.post(`/leaves/${id}/reject/`, { rejection_reason: reason });
      fetchLeaves();
      alert('Leave rejected.');
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Rejection failed');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <CalendarOff className="w-5 h-5 text-indigo-600" />
            <span>{isEmployee ? 'My Leave Applications & Balances' : 'Leave Management & Approvals'}</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {isEmployee
              ? 'Check remaining leave balance, apply for paid/casual time off, and track approval status'
              : 'Review workforce time-off requests, balances, and operational coverage'}
          </p>
        </div>

        {/* Apply Leave Button (Always available for employees & staff) */}
        <button
          onClick={() => setShowApplyModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold shadow-sm transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Apply for Leave</span>
        </button>
      </div>

      {/* Leave Balances Strip */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase">Paid Leave (PL)</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">12 Days</p>
            <p className="text-[11px] text-emerald-600 mt-0.5">Accrued monthly</p>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <Calendar className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase">Casual / Sick Leave</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">6 Days</p>
            <p className="text-[11px] text-slate-500 mt-0.5">Available for emergencies</p>
          </div>
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase">Pending Requests</p>
            <p className="text-2xl font-bold text-amber-600 mt-1">
              {leaves.filter((l) => l.status === 'PENDING').length}
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">Awaiting manager review</p>
          </div>
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
            <AlertCircle className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Leave Requests Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            {isEmployee ? 'My Leave Applications' : 'All Staff Leave Applications'}
          </h3>
          <span className="text-[11px] text-slate-500">{leaves.length} Applications</span>
        </div>

        {loading ? (
          <Loader message="Loading leave applications..." />
        ) : leaves.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-xs">
            No leave applications on record.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/75 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[11px] tracking-wider">
                  <th className="py-3 px-4">Type</th>
                  {!isEmployee && <th className="py-3 px-4">Employee</th>}
                  <th className="py-3 px-4">Duration</th>
                  <th className="py-3 px-4">Days</th>
                  <th className="py-3 px-4">Reason</th>
                  <th className="py-3 px-4">Status</th>
                  {canApproveLeaves && <th className="py-3 px-4 text-right">Approval Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {leaves.map((l) => (
                  <tr key={l.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 px-4 font-semibold text-slate-900">
                      {l.leave_type_name || l.leave_type || 'Casual Leave'}
                    </td>
                    {!isEmployee && (
                      <td className="py-3.5 px-4 text-slate-700 font-medium">
                        {l.employee_name || 'Staff Member'}
                      </td>
                    )}
                    <td className="py-3.5 px-4 text-slate-600">
                      {formatDate(l.start_date)} to {formatDate(l.end_date)}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-800">
                      {l.days || 1} day(s)
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 max-w-xs truncate">
                      {l.reason || 'Personal reasons'}
                    </td>
                    <td className="py-3.5 px-4">
                      <Badge
                        variant={
                          l.status === 'APPROVED' ? 'success' : l.status === 'REJECTED' ? 'danger' : 'warning'
                        }
                      >
                        {l.status}
                      </Badge>
                    </td>
                    {/* Approve/Reject Buttons ONLY for Managers */}
                    {canApproveLeaves && (
                      <td className="py-3.5 px-4 text-right">
                        {l.status === 'PENDING' ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleApprove(l.id)}
                              className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-semibold transition-colors"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleReject(l.id)}
                              className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded text-xs font-semibold transition-colors"
                            >
                              Reject
                            </button>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400 font-mono">Completed</span>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Apply Leave Modal */}
      <Modal isOpen={showApplyModal} onClose={() => setShowApplyModal(false)} title="Apply for Time Off">
        <form onSubmit={handleApply} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Leave Type</label>
            <select
              value={formData.leave_type}
              onChange={(e) => setFormData({ ...formData, leave_type: e.target.value })}
              className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg outline-none bg-white"
            >
              <option value="PAID">Paid Annual Leave (PL)</option>
              <option value="CASUAL">Casual Leave (CL)</option>
              <option value="SICK">Medical / Sick Leave (SL)</option>
              <option value="UNPAID">Unpaid Leave</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Start Date</label>
              <input
                type="date"
                required
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">End Date</label>
              <input
                type="date"
                required
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Reason for Leave</label>
            <textarea
              required
              rows={3}
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              placeholder="State reason for absence..."
              className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg outline-none"
            />
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowApplyModal(false)}
              className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-sm transition-colors"
            >
              Submit Application
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
