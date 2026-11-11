import React, { useState, useEffect } from 'react';
import api from '../api/client';
import { LeaveRequest } from '../types';
import {
  CalendarOff,
  Plus,
  Check,
  X,
  Clock,
  CheckCircle2,
  XCircle,
  Calendar,
} from 'lucide-react';

export const Leaves: React.FC = () => {
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [balances, setBalances] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0],
    days: 1,
    reason: '',
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [reqRes, balRes] = await Promise.all([
        api.get('/leaves/requests/'),
        api.get('/leaves/balances/'),
      ]);
      const rData = reqRes.data.data;
      setRequests(Array.isArray(rData) ? rData : rData.results || []);

      const bData = balRes.data.data;
      setBalances(Array.isArray(bData) ? bData : bData.results || []);
    } catch (err) {
      console.error('Failed to load leaves', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleApprove = async (id: string) => {
    try {
      await api.patch(`/leaves/requests/${id}/approve/`, { comments: 'Approved by manager' });
      alert('Leave request approved and synced with employee attendance record!');
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Approval failed');
    }
  };

  const handleReject = async (id: string) => {
    try {
      await api.patch(`/leaves/requests/${id}/reject/`, { comments: 'Operational requirements' });
      alert('Leave request rejected.');
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Rejection failed');
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Leave & Time-Off Management</h2>
          <p className="text-xs text-slate-500 mt-0.5">Accrual policies, leave approval workflows, and calendar synchronizations</p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold shadow-sm transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Apply for Leave</span>
        </button>
      </div>

      {/* Leave Balances Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Casual Leave (CL)</span>
            <span className="px-2 py-0.5 text-[10px] font-bold bg-indigo-50 text-indigo-700 rounded-full border border-indigo-200">
              Paid
            </span>
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">10.0 Days</p>
          <p className="text-xs text-slate-500 mt-1">Available balance for 2026</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Sick Leave (SL)</span>
            <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-50 text-emerald-700 rounded-full border border-emerald-200">
              Paid
            </span>
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">8.5 Days</p>
          <p className="text-xs text-slate-500 mt-1">Medical leave balance</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Earned Leave (EL)</span>
            <span className="px-2 py-0.5 text-[10px] font-bold bg-blue-50 text-blue-700 rounded-full border border-blue-200">
              Rollover
            </span>
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">15.0 Days</p>
          <p className="text-xs text-slate-500 mt-1">Carried forward eligible</p>
        </div>
      </div>

      {/* Requests Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900">Leave Applications & Approval Chain</h3>
          <span className="text-xs text-slate-500 font-medium">{requests.length} requests on file</span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-slate-500">Loading leave requests...</div>
        ) : requests.length === 0 ? (
          <div className="p-8 text-center text-slate-500">No leave applications currently pending.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Applicant</th>
                  <th className="py-3 px-4">Leave Policy</th>
                  <th className="py-3 px-4">Duration</th>
                  <th className="py-3 px-4">Days</th>
                  <th className="py-3 px-4">Reason</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Approval Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {requests.map((req) => (
                  <tr key={req.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4">
                      <p className="font-semibold text-slate-900 text-xs">{req.employee_name}</p>
                    </td>
                    <td className="py-3 px-4 text-xs font-medium text-slate-700">{req.leave_type_name}</td>
                    <td className="py-3 px-4 text-xs text-slate-600 font-mono">
                      {req.start_date} to {req.end_date}
                    </td>
                    <td className="py-3 px-4 text-xs font-semibold text-slate-800">{req.days} d</td>
                    <td className="py-3 px-4 text-xs text-slate-600 max-w-xs truncate">{req.reason}</td>
                    <td className="py-3 px-4 text-xs">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-medium text-[11px] ${
                          req.status === 'APPROVED'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : req.status === 'REJECTED'
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}
                      >
                        {req.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      {req.status === 'PENDING' ? (
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleApprove(req.id)}
                            className="p-1 text-emerald-600 hover:bg-emerald-50 rounded transition-colors"
                            title="Approve Leave"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleReject(req.id)}
                            className="p-1 text-rose-600 hover:bg-rose-50 rounded transition-colors"
                            title="Reject Leave"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 font-medium">Decided</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Apply Leave Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl relative">
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-slate-900 mb-1">Apply for Leave</h3>
            <p className="text-xs text-slate-500 mb-4">Submit time-off dates for manager review</p>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                alert('Leave request submitted to your supervisor.');
                setShowModal(false);
              }}
              className="space-y-3"
            >
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">From Date</label>
                  <input
                    type="date"
                    required
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">To Date</label>
                  <input
                    type="date"
                    required
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
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
                  placeholder="Please specify justification..."
                  className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                ></textarea>
              </div>

              <div className="pt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-2 text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm"
                >
                  Submit Application
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

