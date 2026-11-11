import React, { useState, useEffect } from 'react';
import api from '../api/client';
import { usePermissions } from '../hooks/usePermissions';
import {
  Receipt,
  Plus,
  ArrowDownLeft,
  ArrowUpRight,
  TrendingDown,
  TrendingUp,
  Wallet,
  Shield,
} from 'lucide-react';
import { Modal } from '../components/ui/Modal';
import { Badge } from '../components/ui/Badge';
import { Loader } from '../components/ui/Loader';
import { formatINR, formatDate } from '../utils/formatters';

export const Expenses = () => {
  const { canManageExpenses, isAuditor } = usePermissions();

  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [summary, setSummary] = useState({ total_in: 0, total_out: 0, balance: 48500 });
  const [formData, setFormData] = useState({
    type: 'CASH_OUT',
    amount: '',
    category: 'OFFICE_SUPPLIES',
    description: '',
    payment_mode: 'CASH',
    date: new Date().toISOString().split('T')[0],
  });

  const fetchExpenses = async () => {
    try {
      setLoading(true);
      const res = await api.get('/expenses/');
      const data = res.data.data;
      const list = Array.isArray(data) ? data : data.results || [];
      setTransactions(list);

      // Compute totals
      let tin = 0;
      let tout = 0;
      list.forEach((t) => {
        if (t.type === 'CASH_IN') tin += Number(t.amount || 0);
        else tout += Number(t.amount || 0);
      });
      setSummary({ total_in: tin, total_out: tout, balance: tin - tout + 48500 });
    } catch (err) {
      console.error('Failed to load expenses', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await api.post('/expenses/', formData);
      setShowModal(false);
      setFormData({
        type: 'CASH_OUT',
        amount: '',
        category: 'OFFICE_SUPPLIES',
        description: '',
        payment_mode: 'CASH',
        date: new Date().toISOString().split('T')[0],
      });
      fetchExpenses();
      alert('Transaction recorded in Cashbook!');
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Transaction recording failed');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Receipt className="w-5 h-5 text-indigo-600" />
            <span>Business Expenses & Cashbook Ledger</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time daily cash inflows, business expenditures, receipts, and petty cash ledger
          </p>
        </div>

        {/* Record Transaction Button: Only visible to Accountants & Owners */}
        {canManageExpenses && (
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Record Cash Entry</span>
          </button>
        )}

        {isAuditor && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-xs font-semibold">
            <Shield className="w-4 h-4" />
            <span>Auditor Compliance (Read-Only)</span>
          </div>
        )}
      </div>

      {/* Cash Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Current Cash Balance</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{formatINR(summary.balance)}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Available in petty cash safe</p>
          </div>
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
            <Wallet className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Cash In (Inflow)</p>
            <p className="text-2xl font-bold text-emerald-600 mt-1">{formatINR(summary.total_in)}</p>
            <p className="text-[11px] text-emerald-600 mt-0.5">Deposits & sales receipts</p>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <ArrowDownLeft className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Cash Out (Expenses)</p>
            <p className="text-2xl font-bold text-rose-600 mt-1">{formatINR(summary.total_out)}</p>
            <p className="text-[11px] text-rose-600 mt-0.5">Disbursements & purchases</p>
          </div>
          <div className="p-3 bg-rose-50 text-rose-600 rounded-xl">
            <ArrowUpRight className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Transactions Ledger */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            Daily Cashbook Audit Trail
          </h3>
          <span className="text-[11px] text-slate-500">{transactions.length} Transactions</span>
        </div>

        {loading ? (
          <Loader message="Loading cashbook transactions..." />
        ) : transactions.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-xs">
            No entries recorded in cashbook for this period.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/75 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[11px] tracking-wider">
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Description</th>
                  <th className="py-3 px-4">Mode</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4 text-right">Balance After</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {transactions.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 px-4 font-semibold text-slate-900">
                      {formatDate(t.date || t.created_at)}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                          t.type === 'CASH_IN'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}
                      >
                        {t.type === 'CASH_IN' ? (
                          <ArrowDownLeft className="w-3 h-3" />
                        ) : (
                          <ArrowUpRight className="w-3 h-3" />
                        )}
                        {t.type}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-700 font-medium">
                      {t.description || 'Petty cash disbursement'}
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 font-mono text-[11px]">
                      {t.payment_mode || 'CASH'}
                    </td>
                    <td
                      className={`py-3.5 px-4 font-bold ${
                        t.type === 'CASH_IN' ? 'text-emerald-600' : 'text-rose-600'
                      }`}
                    >
                      {t.type === 'CASH_IN' ? '+' : '-'} {formatINR(t.amount)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-slate-900 font-semibold">
                      {formatINR(t.balance_after || summary.balance)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Record Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Record Cashbook Entry">
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Entry Type</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg outline-none bg-white"
              >
                <option value="CASH_OUT">Cash Out (Expense)</option>
                <option value="CASH_IN">Cash In (Deposit / Revenue)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Amount (₹)</label>
              <input
                type="number"
                required
                min="1"
                step="0.01"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                placeholder="e.g. 2500"
                className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Description / Narration</label>
            <input
              type="text"
              required
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="e.g. Office tea, client refreshments, courier charges"
              className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Payment Mode</label>
              <select
                value={formData.payment_mode}
                onChange={(e) => setFormData({ ...formData, payment_mode: e.target.value })}
                className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg outline-none bg-white"
              >
                <option value="CASH">Cash</option>
                <option value="UPI">UPI / GPay / PhonePe</option>
                <option value="BANK_TRANSFER">Bank Transfer (IMPS/NEFT)</option>
                <option value="CARD">Debit / Credit Card</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Date</label>
              <input
                type="date"
                required
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg outline-none"
              />
            </div>
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
              Save Entry
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

