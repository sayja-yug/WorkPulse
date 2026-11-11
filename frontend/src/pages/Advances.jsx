import React, { useState, useEffect } from 'react';
import api from '../api/client';
import { usePermissions } from '../hooks/usePermissions';
import {
  HandCoins,
  Plus,
  CheckCircle2,
  XCircle,
  Clock,
  Banknote,
  AlertCircle,
} from 'lucide-react';
import { Modal } from '../components/ui/Modal';
import { Badge } from '../components/ui/Badge';
import { Loader } from '../components/ui/Loader';
import { formatINR, formatDate } from '../utils/formatters';

export const Advances = () => {
  const { isEmployee, canApproveAdvances } = usePermissions();

  const [advances, setAdvances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    amount: '',
    reason: '',
    repayment_months: '1',
  });

  const fetchAdvances = async () => {
    try {
      setLoading(true);
      const res = await api.get('/advances/');
      const data = res.data.data;
      setAdvances(Array.isArray(data) ? data : data.results || []);
    } catch (err) {
      console.error('Failed to load advances', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdvances();
  }, []);

  const handleApply = async (e) => {
    e.preventDefault();
    try {
      await api.post('/advances/request/', formData);
      setShowModal(false);
      setFormData({ amount: '', reason: '', repayment_months: '1' });
      fetchAdvances();
      alert('Salary advance request submitted successfully!');
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Request failed');
    }
  };

  const handleApprove = async (id) => {
    try {
      await api.post(`/advances/${id}/approve/`);
      fetchAdvances();
      alert('Salary advance approved and marked for payroll recovery!');
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Approval failed');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <HandCoins className="w-5 h-5 text-indigo-600" />
            <span>{isEmployee ? 'My Salary Advance Requests' : 'Salary Advances & Employee Loans'}</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {isEmployee
              ? 'Request an advance against upcoming salary and monitor EMI repayments'
              : 'Review and approve employee advance requests with automated payroll deductions'}
          </p>
        </div>

        {/* Apply Button (Available to employees & staff) */}
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold shadow-sm transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Request Advance</span>
        </button>
      </div>

      {/* Advance Records Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            {isEmployee ? 'My Advance Records' : 'Staff Salary Advance Requests'}
          </h3>
          <span className="text-[11px] text-slate-500">{advances.length} Records</span>
        </div>

        {loading ? (
          <Loader message="Loading advances and loans..." />
        ) : advances.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-xs">
            No salary advance applications on record.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/75 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[11px] tracking-wider">
                  <th className="py-3 px-4">Request Date</th>
                  {!isEmployee && <th className="py-3 px-4">Employee</th>}
                  <th className="py-3 px-4">Amount Requested</th>
                  <th className="py-3 px-4">Repayment (EMIs)</th>
                  <th className="py-3 px-4">Reason</th>
                  <th className="py-3 px-4">Status</th>
                  {canApproveAdvances && <th className="py-3 px-4 text-right">Approval Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {advances.map((adv) => (
                  <tr key={adv.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 px-4 font-semibold text-slate-900">
                      {formatDate(adv.request_date || adv.created_at)}
                    </td>
                    {!isEmployee && (
                      <td className="py-3.5 px-4 text-slate-700 font-medium">
                        {adv.employee_name || 'Staff Associate'}
                      </td>
                    )}
                    <td className="py-3.5 px-4 font-bold text-slate-900">
                      {formatINR(adv.amount)}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">
                      {adv.repayment_months || 1} month(s)
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 max-w-xs truncate">
                      {adv.reason || 'Personal / Medical expense'}
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
                    {/* Approve Button ONLY for Accountants & Owners */}
                    {canApproveAdvances && (
                      <td className="py-3.5 px-4 text-right">
                        {adv.status === 'PENDING' ? (
                          <button
                            onClick={() => handleApprove(adv.id)}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-semibold transition-colors"
                          >
                            Approve Advance
                          </button>
                        ) : (
                          <span className="text-[11px] text-slate-400 font-mono">Recovered via Payroll</span>
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

      {/* Request Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Request Salary Advance">
        <form onSubmit={handleApply} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Advance Amount (₹)</label>
            <input
              type="number"
              required
              min="1000"
              max="100000"
              step="500"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              placeholder="e.g. 15000"
              className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg outline-none"
            />
            <p className="text-[11px] text-slate-400 mt-1">Maximum eligible: 50% of monthly gross salary</p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Repayment Schedule</label>
            <select
              value={formData.repayment_months}
              onChange={(e) => setFormData({ ...formData, repayment_months: e.target.value })}
              className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg outline-none bg-white"
            >
              <option value="1">1 Month (Deduct from next payslip)</option>
              <option value="2">2 Months (Equal split)</option>
              <option value="3">3 Months (Equal split)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Reason for Advance</label>
            <textarea
              required
              rows={3}
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              placeholder="State purpose of advance..."
              className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg outline-none"
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
              className="px-4 py-1.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-sm transition-colors"
            >
              Submit Request
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

