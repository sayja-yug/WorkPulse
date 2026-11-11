import React, { useState, useEffect } from 'react';
import api from '../api/client';
import { HandCoins, Plus, CheckCircle2, Clock, Check, X, ShieldAlert } from 'lucide-react';

export const Advances: React.FC = () => {
  const [advances, setAdvances] = useState<any[]>([]);
  const [loans, setLoans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [advRes, loanRes] = await Promise.all([
        api.get('/advances/'),
        api.get('/advances/loans/'),
      ]);
      const aData = advRes.data.data;
      setAdvances(Array.isArray(aData) ? aData : aData.results || []);

      const lData = loanRes.data.data;
      setLoans(Array.isArray(lData) ? lData : lData.results || []);
    } catch (err) {
      console.error('Failed to load advances', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleApprove = async (id: string) => {
    try {
      await api.patch(`/advances/${id}/approve/`);
      alert('Advance approved for payroll amortization!');
      fetchData();
    } catch (err: any) {
      alert('Approval failed');
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Salary Advances & Employee Loans</h2>
          <p className="text-xs text-slate-500 mt-0.5">Credit requests, interest-bearing loans & automatic monthly salary deductions</p>
        </div>

        <button
          onClick={() => alert('New advance request modal')}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold shadow-sm transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Request Advance</span>
        </button>
      </div>

      {/* Advances Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900">Salary Advances Ledger</h3>
          <span className="text-xs text-slate-500 font-medium">{advances.length} requests</span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-slate-500">Loading advances records...</div>
        ) : advances.length === 0 ? (
          <div className="p-8 text-center text-slate-500">No active advance requests found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Employee</th>
                  <th className="py-3 px-4">Requested Amount</th>
                  <th className="py-3 px-4">Remaining Balance</th>
                  <th className="py-3 px-4">Reason</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {advances.map((adv) => (
                  <tr key={adv.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-semibold text-slate-900 text-xs">
                      {adv.employee_name}
                    </td>
                    <td className="py-3 px-4 text-xs font-bold text-slate-900">
                      ₹{parseFloat(adv.amount).toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-4 text-xs font-bold text-indigo-600 font-mono">
                      ₹{parseFloat(adv.remaining_balance).toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-600">{adv.reason}</td>
                    <td className="py-3 px-4 text-xs">
                      <span className="px-2.5 py-0.5 rounded-full font-medium text-[11px] bg-slate-100 text-slate-700 border border-slate-200">
                        {adv.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      {adv.status === 'PENDING' && (
                        <button
                          onClick={() => handleApprove(adv.id)}
                          className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                        >
                          Approve
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

