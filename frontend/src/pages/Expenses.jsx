import React, { useState, useEffect } from 'react';
import api from '../api/client';
import { usePermissions } from '../hooks/usePermissions';
import { useNotification } from '../context/NotificationContext';
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
  const { toast } = useNotification();

  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [summary, setSummary] = useState({ total_in: 0, total_out: 0, balance: 0 });
  const [formData, setFormData] = useState({
    type: 'CASH_OUT',
    amount: '',
    description: '',
    payment_mode: 'CASH',
    date: new Date().toISOString().split('T')[0],
  });

  const fetchExpenses = async () => {
    try {
      setLoading(true);
      const [txRes, balRes] = await Promise.all([
        api.get('/expenses/transactions/'),
        api.get('/expenses/balance/').catch(() => null),
      ]);
      const data = txRes.data?.data || txRes.data?.results || txRes.data || [];
      const list = Array.isArray(data) ? data : data.results || [];
      setTransactions(list);

      // Compute totals
      let tin = 0;
      let tout = 0;
      list.forEach((t) => {
        if (t.type === 'CASH_IN') tin += Number(t.amount || 0);
        else tout += Number(t.amount || 0);
      });
      const currentBalance = balRes?.data?.data?.current_balance !== undefined
        ? Number(balRes.data.data.current_balance)
        : (list.length > 0 ? Number(list[0].balance_after || tin - tout) : tin - tout);
      setSummary({ total_in: tin, total_out: tout, balance: currentBalance });
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
      await api.post('/expenses/transactions/', formData);
      setShowModal(false);
      setFormData({
        type: 'CASH_OUT',
        amount: '',
        description: '',
        payment_mode: 'CASH',
        date: new Date().toISOString().split('T')[0],
      });
      fetchExpenses();
      toast.success('Transaction recorded in Cashbook successfully!');
    } catch (err) {
      toast.error(err.response?.data?.error?.message || err.response?.data?.detail || 'Transaction recording failed');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-zinc-950 dark:text-zinc-50 tracking-tight flex items-center gap-2">
            <Wallet className="w-5 h-5 text-zinc-900 dark:text-zinc-100" />
            <span>Cashbook &amp; Business Expenses</span>
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            Real-time daily cash inflows, business expenditures, receipts, and petty cash ledger
          </p>
        </div>

        {/* Record Transaction Button: Only visible to Accountants & Owners */}
        {canManageExpenses && (
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-zinc-950 hover:bg-black text-white dark:bg-zinc-100 dark:hover:bg-white dark:text-zinc-950 rounded-lg text-xs font-bold shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Record Cash Entry</span>
          </button>
        )}

        {isAuditor && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 rounded-lg text-xs font-semibold">
            <Shield className="w-4 h-4 text-zinc-700 dark:text-zinc-300" />
            <span>Auditor Compliance (Read-Only)</span>
          </div>
        )}
      </div>

      {/* Cash Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-zinc-900 p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Current Cash Balance</p>
            <p className="text-2xl font-bold text-zinc-950 dark:text-zinc-50 mt-1">{formatINR(summary.balance)}</p>
            <p className="text-[11px] text-zinc-400 mt-0.5">Available in petty cash safe</p>
          </div>
          <div className="p-3 bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-xl border border-zinc-200 dark:border-zinc-700">
            <Wallet className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Total Cash In (Inflow)</p>
            <p className="text-2xl font-bold text-zinc-950 dark:text-zinc-50 mt-1">{formatINR(summary.total_in)}</p>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">Deposits &amp; sales receipts</p>
          </div>
          <div className="p-3 bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-xl border border-zinc-200 dark:border-zinc-700">
            <ArrowDownLeft className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Total Cash Out (Expenses)</p>
            <p className="text-2xl font-bold text-zinc-950 dark:text-zinc-50 mt-1">{formatINR(summary.total_out)}</p>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">Disbursements &amp; purchases</p>
          </div>
          <div className="p-3 bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-xl border border-zinc-200 dark:border-zinc-700">
            <ArrowUpRight className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Transactions Ledger */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-850/50 flex items-center justify-between">
          <h3 className="text-xs font-bold text-zinc-950 dark:text-zinc-100 uppercase tracking-wider">
            Daily Cashbook Audit Trail
          </h3>
          <span className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">{transactions.length} Transactions</span>
        </div>

        {loading ? (
          <Loader message="Loading cashbook transactions..." />
        ) : transactions.length === 0 ? (
          <div className="p-12 text-center text-zinc-500 dark:text-zinc-400 text-xs">
            No entries recorded in cashbook for this period.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[650px] text-left text-xs border-collapse">
              <thead>
                <tr className="bg-zinc-50 dark:bg-zinc-850 border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 font-semibold uppercase text-[11px] tracking-wider">
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Description</th>
                  <th className="py-3 px-4">Mode</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4 text-right">Balance After</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {transactions.map((t) => (
                  <tr key={t.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors">
                    <td className="py-3.5 px-4 font-semibold text-zinc-900 dark:text-zinc-100">
                      {formatDate(t.date || t.created_at)}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border border-zinc-300 dark:border-zinc-700"
                      >
                        {t.type === 'CASH_IN' ? (
                          <ArrowDownLeft className="w-3 h-3 text-zinc-700 dark:text-zinc-300" />
                        ) : (
                          <ArrowUpRight className="w-3 h-3 text-zinc-700 dark:text-zinc-300" />
                        )}
                        {t.type}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-zinc-700 dark:text-zinc-300 font-medium">
                      {t.description || 'Petty cash disbursement'}
                    </td>
                    <td className="py-3.5 px-4 text-zinc-500 dark:text-zinc-400 font-mono text-[11px]">
                      {t.payment_mode || 'CASH'}
                    </td>
                    <td
                      className="py-3.5 px-4 font-bold text-zinc-950 dark:text-zinc-50"
                    >
                      {t.type === 'CASH_IN' ? '+' : '-'} {formatINR(t.amount)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-zinc-900 dark:text-zinc-100 font-semibold">
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
        <form onSubmit={handleCreate} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Entry Type</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 outline-none focus:ring-1 focus:ring-zinc-950"
              >
                <option value="CASH_OUT">Cash Out (Expense)</option>
                <option value="CASH_IN">Cash In (Deposit / Revenue)</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Amount (₹)</label>
              <input
                type="number"
                required
                min="1"
                step="0.01"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                placeholder="e.g. 2500"
                className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 outline-none focus:ring-1 focus:ring-zinc-950"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Description / Narration</label>
            <input
              type="text"
              required
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="e.g. Office tea, client refreshments, courier charges"
              className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 outline-none focus:ring-1 focus:ring-zinc-950"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Payment Mode</label>
              <select
                value={formData.payment_mode}
                onChange={(e) => setFormData({ ...formData, payment_mode: e.target.value })}
                className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 outline-none focus:ring-1 focus:ring-zinc-950"
              >
                <option value="CASH">Cash</option>
                <option value="UPI">UPI / GPay / PhonePe</option>
                <option value="BANK_TRANSFER">Bank Transfer (IMPS/NEFT)</option>
                <option value="CARD">Debit / Credit Card</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Date</label>
              <input
                type="date"
                required
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 outline-none focus:ring-1 focus:ring-zinc-950"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="px-3 py-1.5 text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 text-xs font-bold bg-zinc-950 hover:bg-black text-white dark:bg-zinc-100 dark:hover:bg-white dark:text-zinc-950 rounded-lg shadow-xs transition-colors cursor-pointer"
            >
              Save Entry
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

