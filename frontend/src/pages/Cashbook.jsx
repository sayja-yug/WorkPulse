import React, { useEffect, useState } from 'react';
import api from '../api/client';
import { usePermissions } from '../hooks/usePermissions';
import { Wallet, ArrowDownLeft, ArrowUpRight, Plus } from 'lucide-react';
import { Loader } from '../components/ui/Loader';
import { Modal } from '../components/ui/Modal';
import { Badge } from '../components/ui/Badge';
import { formatDate, formatINR } from '../utils/formatters';

export const Cashbook = () => {
  const { canManageExpenses, isAuditor } = usePermissions();
  const [transactions, setTransactions] = useState([]);
  const [balance, setBalance] = useState('0.00');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    type: 'CASH_IN',
    amount: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    payment_mode: 'Cash',
    reference: '',
  });

  const fetchCashbook = async () => {
    try {
      setLoading(true);
      const [txRes, balRes] = await Promise.allSettled([
        api.get('/expenses/transactions/'),
        api.get('/expenses/balance/'),
      ]);
      if (txRes.status === 'fulfilled') {
        const d = txRes.value.data?.data || txRes.value.data?.results || [];
        setTransactions(Array.isArray(d) ? d : []);
      }
      if (balRes.status === 'fulfilled') {
        setBalance(balRes.value.data?.data?.current_balance || '0.00');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCashbook();
  }, []);

  const handleRecord = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      await api.post('/expenses/transactions/', form);
      setShowModal(false);
      setForm({
        type: 'CASH_IN',
        amount: '',
        description: '',
        date: new Date().toISOString().split('T')[0],
        payment_mode: 'Cash',
        reference: '',
      });
      fetchCashbook();
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Failed to record cashbook transaction');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Wallet className="w-5 h-5 text-indigo-600" />
            <span>Cashbook — Income &amp; Expense Ledger</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Track daily cash-in, cash-out, and running petty cash balances
          </p>
        </div>

        {canManageExpenses && !isAuditor && (
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Record Cash Entry</span>
          </button>
        )}
      </div>

      {/* Balance Card */}
      <div className="bg-gradient-to-r from-slate-900 to-indigo-950 rounded-2xl p-6 text-white shadow-md flex items-center justify-between">
        <div>
          <p className="text-xs text-indigo-200 uppercase font-bold tracking-wider">Current Cashbook Balance</p>
          <p className="text-3xl font-bold mt-1">{formatINR(balance)}</p>
        </div>
        <div className="p-3 bg-white/10 rounded-xl">
          <Wallet className="w-7 h-7 text-indigo-300" />
        </div>
      </div>

      {/* Ledger Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <Loader message="Loading cashbook transactions..." />
        ) : transactions.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-xs">
            No cashbook transactions recorded yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[11px]">
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Description</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Mode</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                  <th className="py-3 px-4 text-right">Balance After</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-semibold text-slate-900">{formatDate(tx.date)}</td>
                    <td className="py-3 px-4 text-slate-800">{tx.description}</td>
                    <td className="py-3 px-4">
                      <Badge variant={tx.type === 'CASH_IN' ? 'success' : 'danger'}>
                        <span className="inline-flex items-center gap-1">
                          {tx.type === 'CASH_IN' ? <ArrowDownLeft className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
                          {tx.type === 'CASH_IN' ? 'CASH IN' : 'CASH OUT'}
                        </span>
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-slate-500">{tx.payment_mode || 'Cash'}</td>
                    <td className={`py-3 px-4 text-right font-bold ${tx.type === 'CASH_IN' ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {tx.type === 'CASH_IN' ? '+' : '-'}{formatINR(tx.amount)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-semibold text-slate-700">
                      {formatINR(tx.balance_after)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Record Cashbook Entry">
        <form onSubmit={handleRecord} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Entry Type *</label>
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
                className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
              >
                <option value="CASH_IN">Cash In (Income)</option>
                <option value="CASH_OUT">Cash Out (Expense)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Amount (₹) *</label>
              <input
                type="number"
                step="0.01"
                required
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Description *</label>
            <input
              type="text"
              required
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Date *</label>
              <input
                type="date"
                required
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Payment Mode</label>
              <input
                type="text"
                value={form.payment_mode}
                onChange={(e) => setForm({ ...form, payment_mode: e.target.value })}
                className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg"
              />
            </div>
          </div>
          <div className="pt-3 flex justify-end gap-2">
            <button type="button" onClick={() => setShowModal(false)} className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg">
              Cancel
            </button>
            <button type="submit" disabled={submitting} className="px-4 py-1.5 text-xs font-semibold bg-indigo-600 text-white rounded-lg">
              {submitting ? 'Saving...' : 'Save Transaction'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
