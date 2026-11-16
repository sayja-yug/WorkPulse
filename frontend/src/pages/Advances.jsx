import React, { useState, useEffect } from 'react';
import api from '../api/client';
import { usePermissions } from '../hooks/usePermissions';
import { useNotification } from '../context/NotificationContext';
import {
  HandCoins,
  Plus,
  CheckCircle2,
  XCircle,
  Clock,
  Banknote,
  AlertCircle,
  Users,
  Send,
  DollarSign,
  ArrowRight,
} from 'lucide-react';
import { Modal } from '../components/ui/Modal';
import { Badge } from '../components/ui/Badge';
import { Loader } from '../components/ui/Loader';
import { formatINR, formatDate } from '../utils/formatters';

export const Advances = () => {
  const { isEmployee, canApproveAdvances } = usePermissions();
  const { toast, confirm } = useNotification();

  const [advances, setAdvances] = useState([]);
  const [employeesList, setEmployeesList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    employee: '',
    amount: '',
    reason: '',
    repayment_months: '1',
  });

  const fetchAdvances = async () => {
    try {
      setLoading(true);
      const res = await api.get('/advances/');
      const data = res.data?.data || res.data?.results || res.data || [];
      setAdvances(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load advances', err);
      setAdvances([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    if (isEmployee) return;
    try {
      const res = await api.get('/employees/');
      const data = res.data?.data || res.data?.results || res.data || [];
      const list = Array.isArray(data) ? data : [];
      setEmployeesList(list);
      if (list.length > 0 && !formData.employee) {
        setFormData((prev) => ({ ...prev, employee: list[0].id }));
      }
    } catch (err) {
      console.error('Failed to load employees for advance dispatch', err);
    }
  };

  useEffect(() => {
    fetchAdvances();
    fetchEmployees();
  }, [isEmployee]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (isEmployee) {
        // Employee self-request
        await api.post('/advances/request/', {
          amount: formData.amount,
          reason: formData.reason,
          repayment_months: formData.repayment_months,
        });
        toast.success('Your salary advance request has been submitted to your employer!');
      } else {
        // Owner / Admin direct disbursement to employee
        if (!formData.employee) {
          toast.warning('Please select an employee to receive this advance.');
          setIsSubmitting(false);
          return;
        }
        await api.post('/advances/', {
          employee: formData.employee,
          amount: formData.amount,
          reason: formData.reason,
          repayment_months: formData.repayment_months,
          status: 'APPROVED',
        });
        toast.success('Salary advance issued and approved for the selected employee!');
      }

      setShowModal(false);
      setFormData({
        employee: employeesList[0]?.id || '',
        amount: '',
        reason: '',
        repayment_months: '1',
      });
      fetchAdvances();
    } catch (err) {
      toast.error(err.response?.data?.error?.message || err.response?.data?.detail || 'Action failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApprove = async (id) => {
    try {
      await api.post(`/advances/${id}/approve/`);
      fetchAdvances();
      toast.success('Salary advance approved! It will be scheduled for payroll recovery.');
    } catch (err) {
      toast.error(err.response?.data?.error?.message || err.response?.data?.detail || 'Approval failed');
    }
  };

  const handleDisburse = async (id) => {
    try {
      await api.post(`/advances/${id}/disburse/`);
      fetchAdvances();
      toast.success('Advance disbursed and funds marked as paid to employee!');
    } catch (err) {
      toast.error(err.response?.data?.error?.message || err.response?.data?.detail || 'Disbursement failed');
    }
  };

  const handleReject = async (id) => {
    const confirmed = await confirm({
      title: 'Reject Advance Request',
      message: 'Are you sure you want to reject this salary advance request?',
      confirmText: 'Reject Request',
      cancelText: 'Cancel',
      type: 'danger',
    });
    if (!confirmed) return;

    try {
      await api.post(`/advances/${id}/reject/`);
      fetchAdvances();
      toast.info('Salary advance request rejected.');
    } catch (err) {
      toast.error(err.response?.data?.error?.message || err.response?.data?.detail || 'Rejection failed');
    }
  };

  // KPI Metrics
  const pendingRequests = advances.filter((a) => a.status === 'PENDING');
  const activeAdvances = advances.filter((a) => a.status === 'APPROVED' || a.status === 'DISBURSED');
  const totalDisbursedAmount = advances
    .filter((a) => a.status === 'DISBURSED' || a.status === 'APPROVED')
    .reduce((acc, a) => acc + (Number(a.amount) || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-zinc-950 tracking-tight flex items-center gap-2">
            <HandCoins className="w-5 h-5 text-zinc-900" />
            <span>{isEmployee ? 'My Salary Advance Requests' : 'Salary Advances & Employee Loans'}</span>
          </h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            {isEmployee
              ? 'Request a salary advance against upcoming salary and track approval & EMI deductions.'
              : 'Review incoming employee advance requests, approve or reject them, or directly issue advances to staff.'}
          </p>
        </div>

        {/* Action Button: Role-Aware */}
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold shadow-xs transition-colors text-white bg-zinc-950 hover:bg-black cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>{isEmployee ? 'Request Advance' : 'Issue Advance to Employee'}</span>
        </button>
      </div>

      {/* KPI Cards (for Owners & Managers) */}
      {!isEmployee && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase text-slate-500 tracking-wider">
                Pending Requests
              </span>
              <p className="text-2xl font-bold text-amber-600 mt-1">{pendingRequests.length}</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Awaiting your approval</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
              <Clock className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase text-slate-500 tracking-wider">
                Active Advances
              </span>
              <p className="text-2xl font-bold text-indigo-600 mt-1">{activeAdvances.length}</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Approved &amp; Disbursed</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase text-slate-500 tracking-wider">
                Advance Volume
              </span>
              <p className="text-2xl font-bold text-emerald-600 mt-1">{formatINR(totalDisbursedAmount)}</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Under monthly payroll deduction</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
              <Banknote className="w-5 h-5" />
            </div>
          </div>
        </div>
      )}

      {/* Advance Records Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            {isEmployee ? 'My Advance Records' : 'Staff Salary Advance Requests & Disbursements'}
          </h3>
          <span className="text-[11px] font-semibold text-slate-500">{advances.length} Records</span>
        </div>

        {loading ? (
          <Loader message="Loading salary advances..." />
        ) : advances.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-xs">
            {isEmployee
              ? 'You have not submitted any salary advance requests.'
              : 'No salary advance applications submitted yet. Employees can request advances or you can issue one using the button above.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/75 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[11px] tracking-wider">
                  <th className="py-3 px-4">Request Date</th>
                  {!isEmployee && <th className="py-3 px-4">Employee</th>}
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4">Repayment (EMIs)</th>
                  <th className="py-3 px-4">Reason / Notes</th>
                  <th className="py-3 px-4">Status</th>
                  {canApproveAdvances && <th className="py-3 px-4 text-right">Owner / Admin Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {advances.map((adv) => (
                  <tr key={adv.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 px-4 font-semibold text-slate-900">
                      {formatDate(adv.requested_at || adv.created_at)}
                    </td>

                    {!isEmployee && (
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900">{adv.employee_name || 'Staff Member'}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{adv.employee_code || '-'}</div>
                      </td>
                    )}

                    <td className="py-3.5 px-4 font-bold text-slate-900">
                      {formatINR(adv.amount)}
                      {adv.monthly_deduction && (
                        <div className="text-[10px] text-slate-400 font-normal">
                          {formatINR(adv.monthly_deduction)}/mo
                        </div>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-slate-600">
                      {adv.repayment_months || 1} month(s)
                    </td>

                    <td className="py-3.5 px-4 text-slate-600 max-w-xs truncate">
                      {adv.reason || 'Salary advance'}
                    </td>

                    <td className="py-3.5 px-4">
                      <Badge
                        variant={
                          adv.status === 'APPROVED' || adv.status === 'DISBURSED'
                            ? 'success'
                            : adv.status === 'REJECTED'
                            ? 'danger'
                            : 'warning'
                        }
                      >
                        {adv.status}
                      </Badge>
                    </td>

                    {/* Owner / Approver Actions */}
                    {canApproveAdvances && (
                      <td className="py-3.5 px-4 text-right">
                        {adv.status === 'PENDING' ? (
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              onClick={() => handleApprove(adv.id)}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-semibold shadow-sm transition-colors"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleReject(adv.id)}
                              className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded text-xs font-semibold transition-colors"
                            >
                              Reject
                            </button>
                          </div>
                        ) : adv.status === 'APPROVED' ? (
                          <button
                            onClick={() => handleDisburse(adv.id)}
                            className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-xs font-semibold shadow-sm transition-colors"
                          >
                            Disburse Funds
                          </button>
                        ) : adv.status === 'DISBURSED' ? (
                          <span className="text-[11px] text-emerald-700 font-medium">
                            ✓ In Payroll Recovery
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">No action needed</span>
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

      {/* Role-Specific Advance Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={isEmployee ? 'Request Salary Advance' : 'Issue Salary Advance to Employee'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* If Owner / Admin: Select Employee */}
          {!isEmployee && (
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Select Recipient Employee *
              </label>
              <select
                required
                value={formData.employee}
                onChange={(e) => setFormData({ ...formData, employee: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg outline-none bg-white font-medium focus:ring-2 focus:ring-emerald-500"
              >
                <option value="" disabled>
                  -- Choose Employee --
                </option>
                {employeesList.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.first_name} {emp.last_name} ({emp.employee_code || emp.designation_name || 'Staff'})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Advance Amount (₹) *
            </label>
            <input
              type="number"
              required
              min="500"
              max="200000"
              step="500"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              placeholder="e.g. 15000"
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
            />
            {isEmployee && (
              <p className="text-[11px] text-slate-400 mt-1">Maximum eligible: 50% of monthly gross salary</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Repayment Schedule (EMIs) *
            </label>
            <select
              value={formData.repayment_months}
              onChange={(e) => setFormData({ ...formData, repayment_months: e.target.value })}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg outline-none bg-white font-medium"
            >
              <option value="1">1 Month (Deduct 100% from next payslip)</option>
              <option value="2">2 Months (Equal split across 2 payslips)</option>
              <option value="3">3 Months (Equal split across 3 payslips)</option>
              <option value="6">6 Months (Equal split across 6 payslips)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              {isEmployee ? 'Reason for Advance *' : 'Disbursement Notes / Reason *'}
            </label>
            <textarea
              required
              rows={3}
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              placeholder={isEmployee ? 'State reason for salary advance...' : 'Disbursement purpose or internal notes...'}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
            />
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
              disabled={isSubmitting}
              className={`px-4 py-2 text-xs font-semibold text-white rounded-lg shadow-sm transition-colors flex items-center gap-1.5 disabled:opacity-50 ${
                isEmployee ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-emerald-600 hover:bg-emerald-700'
              }`}
            >
              <span>{isEmployee ? 'Submit Advance Request' : 'Issue Advance to Employee'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
