import React, { useState, useEffect } from 'react';
import api from '../api/client';
import { usePermissions } from '../hooks/usePermissions';
import { useNotification } from '../context/NotificationContext';
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
import { HelpButton } from '../components/ui/HelpButton';

export const Leaves = () => {
  const { isEmployee, canApproveLeaves, hasPermission } = usePermissions();
  const { toast, prompt } = useNotification();

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
      const data = res.data?.data || res.data?.results || res.data || [];
      setLeaves(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load leaves', err);
      setLeaves([]);
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
      toast.success('Leave application submitted successfully!');
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Failed to submit leave application');
    }
  };

  const handleApprove = async (id) => {
    try {
      await api.post(`/leaves/${id}/approve/`);
      fetchLeaves();
      toast.success('Leave approved successfully!');
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Approval failed');
    }
  };

  const handleReject = async (id) => {
    const reason = await prompt({
      title: 'Reject Leave Request',
      message: 'Please provide a clear reason for rejecting this staff leave application:',
      placeholder: 'e.g. Operational coverage requirement / team deadlines...',
      confirmText: 'Reject Request',
      cancelText: 'Cancel',
    });
    if (!reason) return;
    try {
      await api.post(`/leaves/${id}/reject/`, { rejection_reason: reason });
      fetchLeaves();
      toast.info('Leave request has been rejected.');
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Rejection failed');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-zinc-950 tracking-tight flex items-center gap-2">
            <CalendarOff className="w-5 h-5 text-zinc-900" />
            <span>{isEmployee ? 'My Leave Applications & Balances' : 'Leave Management & Approvals'}</span>
          </h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            {isEmployee
              ? 'Check remaining leave balance, apply for paid/casual time off, and track approval status'
              : 'Review workforce time-off requests, balances, and operational coverage'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Apply Leave Button (Only available for employees; Owners & HR are approvers) */}
          {hasPermission('leave.apply') && (
            <button
              onClick={() => setShowApplyModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-zinc-950 hover:bg-black text-white rounded-lg text-xs font-bold shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Apply for Leave</span>
            </button>
          )}

          <HelpButton
            title="Leave Guide"
            whereAmI="Your leave requests and annual time-off balances."
            whatCanIDo="Apply for paid or casual leave, review pending applications, and track manager approval status."
            whatHappensNext="Approved leave excuses your absence on attendance records without cutting your salary."
          />
        </div>
      </div>

      {/* Leave Balances Strip */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {isEmployee ? (
          <>
            <div className="bg-white  p-4 rounded-xl border border-zinc-200  shadow-xs flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-zinc-500 uppercase">Paid Leave (PL)</p>
                <p className="text-2xl font-bold text-zinc-900  mt-1">12 Days</p>
                <p className="text-[11px] text-zinc-500 mt-0.5">Accrued monthly</p>
              </div>
              <div className="p-3 bg-zinc-100  text-zinc-900  rounded-xl">
                <Calendar className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white  p-4 rounded-xl border border-zinc-200  shadow-xs flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-zinc-500 uppercase">Casual / Sick Leave</p>
                <p className="text-2xl font-bold text-zinc-900  mt-1">6 Days</p>
                <p className="text-[11px] text-zinc-500 mt-0.5">Available for emergencies</p>
              </div>
              <div className="p-3 bg-zinc-100  text-zinc-900  rounded-xl">
                <Clock className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white  p-4 rounded-xl border border-zinc-200  shadow-xs flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-zinc-500 uppercase">Pending Requests</p>
                <p className="text-2xl font-bold text-zinc-900  mt-1">
                  {leaves.filter((l) => l.status === 'PENDING').length}
                </p>
                <p className="text-[11px] text-zinc-500 mt-0.5">Awaiting manager review</p>
              </div>
              <div className="p-3 bg-zinc-100  text-zinc-900  rounded-xl">
                <AlertCircle className="w-6 h-6" />
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="bg-white  p-4 rounded-xl border border-zinc-200  shadow-xs flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-zinc-500 uppercase">Total Applications</p>
                <p className="text-2xl font-bold text-zinc-900  mt-1">{leaves.length}</p>
                <p className="text-[11px] text-zinc-500 mt-0.5">Workforce time-off records</p>
              </div>
              <div className="p-3 bg-zinc-100  text-zinc-900  rounded-xl">
                <Calendar className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white  p-4 rounded-xl border border-zinc-200  shadow-xs flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-zinc-500 uppercase">Approved Leaves</p>
                <p className="text-2xl font-bold text-zinc-900  mt-1">
                  {leaves.filter((l) => l.status === 'APPROVED').length}
                </p>
                <p className="text-[11px] text-zinc-500 mt-0.5">Active approved leaves</p>
              </div>
              <div className="p-3 bg-zinc-100  text-zinc-900  rounded-xl">
                <CheckCircle2 className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white  p-4 rounded-xl border border-zinc-200  shadow-xs flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-zinc-500 uppercase">Pending Review</p>
                <p className="text-2xl font-bold text-zinc-900  mt-1">
                  {leaves.filter((l) => l.status === 'PENDING').length}
                </p>
                <p className="text-[11px] text-zinc-500 mt-0.5">Requires approval action</p>
              </div>
              <div className="p-3 bg-zinc-100  text-zinc-900  rounded-xl">
                <AlertCircle className="w-6 h-6" />
              </div>
            </div>
          </>
        )}
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
          <div className="p-12 text-center text-zinc-500 text-xs space-y-2">
            <CalendarOff className="w-8 h-8 text-zinc-300 mx-auto" />
            <p className="font-bold text-zinc-800 text-sm">No leave requests found.</p>
            <p className="text-zinc-500 text-xs">
              {isEmployee
                ? 'Click "Apply for Leave" above to request time off.'
                : 'There are currently no workforce leave applications in the queue.'}
            </p>
            {hasPermission('leave.apply') && (
              <button
                type="button"
                onClick={() => setShowApplyModal(true)}
                className="mt-2 inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-zinc-900 text-white rounded-lg text-xs font-bold hover:bg-black transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Apply for Leave</span>
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/75 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[11px] tracking-wider">
                  <th className="py-3 px-4">Type</th>
                  {!isEmployee && <th className="py-3 px-4">Employee</th>}
                  <th className="py-3 px-4">Duration</th>
                  <th className="py-3 px-4">Days</th>
                  <th className="py-3 px-4">Reason</th>
                  <th className="py-3 px-4">Status</th>
                  {(canApproveLeaves || hasPermission('leave.reject')) && <th className="py-3 px-4 text-right">Approval Actions</th>}
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
                    {(canApproveLeaves || hasPermission('leave.reject')) && (
                      <td className="py-3.5 px-4 text-right">
                        {l.status === 'PENDING' ? (
                          <div className="flex items-center justify-end gap-1.5">
                            {hasPermission('leave.approve') && (<button
                              onClick={() => handleApprove(l.id)}
                              className="px-2.5 py-1 bg-zinc-950 hover:bg-black text-white    rounded text-xs font-bold transition-colors"
                            >
                              Approve
                            </button>)}
                            {hasPermission('leave.reject') && (<button
                              onClick={() => handleReject(l.id)}
                              className="px-2.5 py-1 bg-zinc-100  hover:bg-zinc-200  text-zinc-800  border border-zinc-200  rounded text-xs font-semibold transition-colors"
                            >
                              Reject
                            </button>)}
                          </div>
                        ) : (
                          <span className="text-[11px] text-zinc-400 font-mono">Completed</span>
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
            <label className="block text-xs font-semibold text-zinc-700  mb-1">Leave Type</label>
            <select
              value={formData.leave_type}
              onChange={(e) => setFormData({ ...formData, leave_type: e.target.value })}
              className="w-full px-3 py-1.5 text-xs border border-zinc-200  rounded-lg outline-none bg-white  text-zinc-900 "
            >
              <option value="PAID">Paid Annual Leave (PL)</option>
              <option value="CASUAL">Casual Leave (CL)</option>
              <option value="SICK">Medical / Sick Leave (SL)</option>
              <option value="UNPAID">Unpaid Leave</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-zinc-700  mb-1">Start Date</label>
              <input
                type="date"
                required
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                className="w-full px-3 py-1.5 text-xs border border-zinc-200  rounded-lg outline-none bg-white  text-zinc-900 "
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-700  mb-1">End Date</label>
              <input
                type="date"
                required
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                className="w-full px-3 py-1.5 text-xs border border-zinc-200  rounded-lg outline-none bg-white  text-zinc-900 "
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-700  mb-1">Reason for Leave</label>
            <textarea
              required
              rows={3}
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              placeholder="State reason for absence..."
              className="w-full px-3 py-1.5 text-xs border border-zinc-200  rounded-lg outline-none bg-white  text-zinc-900 "
            />
          </div>

          <div className="pt-3 border-t border-zinc-200  flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowApplyModal(false)}
              className="px-3 py-1.5 text-xs font-semibold text-zinc-600  hover:bg-zinc-100  rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 text-xs font-bold bg-zinc-950 hover:bg-black text-white    rounded-lg shadow-xs transition-colors"
            >
              Submit Application
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

