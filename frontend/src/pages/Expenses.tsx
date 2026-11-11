import React, { useState, useEffect } from 'react';
import api from '../api/client';
import { CashTransaction } from '../types';
import {
  Receipt,
  Plus,
  ArrowUpRight,
  ArrowDownLeft,
  Wallet,
  CheckCircle2,
  X,
  CreditCard,
} from 'lucide-react';

export const Expenses: React.FC = () => {
  const [transactions, setTransactions] = useState<CashTransaction[]>([]);
  const [balance, setBalance] = useState<string>('0.00');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    type: 'CASH_OUT',
    amount: '',
    description: '',
    payment_mode: 'Cash',
    date: new Date().toISOString().split('T')[0],
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [txRes, balRes] = await Promise.all([
        api.get('/expenses/transactions/'),
        api.get('/expenses/balance/'),
      ]);
      const txData = txRes.data.data;
      setTransactions(Array.isArray(txData) ? txData : txData.results || []);
      setBalance(balRes.data.data.current_balance || '0.00');
    } catch (err) {
      console.error('Failed to load expenses', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/expenses/transactions/', formData);
      setShowModal(false);
      setFormData({
        type: 'CASH_OUT',
        amount: '',
        description: '',
        payment_mode: 'Cash',
        date: new Date().toISOString().split('T')[0],
      });
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Transaction record failed');
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Expenses & Daily Cashbook</h2>
          <p className="text-xs text-slate-500 mt-0.5">Petty cash registry, cash in/out audit trails, and expense vouchers</p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold shadow-sm transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Record Transaction</span>
        </button>
      </div>

      {/* Balance Card */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-xl p-6 text-white shadow-lg flex items-center justify-between">
        <div>
          <span className="text-xs uppercase font-semibold tracking-wider text-indigo-300">Net Petty Cash Balance</span>
          <h3 className="text-3xl font-extrabold tracking-tight mt-1">
            ₹{parseFloat(balance).toLocaleString('en-IN')}
          </h3>
          <p className="text-xs text-slate-400 mt-1">Continuous ledger running balance</p>
        </div>
        <div className="p-3 bg-white/10 rounded-xl border border-white/10">
          <Wallet className="w-8 h-8 text-indigo-400" />
        </div>
      </div>

      {/* Transactions Register */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900">Cashbook Transactions Ledger</h3>
          <span className="text-xs text-slate-500 font-medium">{transactions.length} entries</span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-slate-500">Loading cash transactions...</div>
        ) : transactions.length === 0 ? (
          <div className="p-8 text-center text-slate-500">No transactions recorded yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Description</th>
                  <th className="py-3 px-4">Tender Mode</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4 text-right">Running Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 text-xs font-mono text-slate-600">{tx.date}</td>
                    <td className="py-3 px-4 text-xs">
                      {tx.type === 'CASH_IN' ? (
                        <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-semibold text-[11px] border border-emerald-200">
                          <ArrowDownLeft className="w-3 h-3" />
                          <span>Cash In</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-rose-700 bg-rose-50 px-2 py-0.5 rounded font-semibold text-[11px] border border-rose-200">
                          <ArrowUpRight className="w-3 h-3" />
                          <span>Cash Out</span>
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-xs font-medium text-slate-800">{tx.description}</td>
                    <td className="py-3 px-4 text-xs text-slate-500">{tx.payment_mode}</td>
                    <td className="py-3 px-4 text-xs font-bold">
                      <span className={tx.type === 'CASH_IN' ? 'text-emerald-600' : 'text-rose-600'}>
                        {tx.type === 'CASH_IN' ? '+' : '-'}₹{parseFloat(tx.amount).toLocaleString('en-IN')}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-xs font-mono font-semibold text-slate-700 text-right">
                      ₹{parseFloat(tx.balance_after || '0').toLocaleString('en-IN')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Record Transaction Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl relative">
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-slate-900 mb-1">Record Cashbook Entry</h3>
            <p className="text-xs text-slate-500 mb-4">Post a cash in-flow or expense payment</p>

            <form onSubmit={handleRecord} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, type: 'CASH_IN' })}
                  className={`py-2 text-xs font-bold rounded-lg border flex items-center justify-center gap-1.5 ${
                    formData.type === 'CASH_IN'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-300 ring-2 ring-emerald-500'
                      : 'bg-slate-50 text-slate-600 border-slate-200'
                  }`}
                >
                  <ArrowDownLeft className="w-3.5 h-3.5" />
                  <span>Cash In (Receipt)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, type: 'CASH_OUT' })}
                  className={`py-2 text-xs font-bold rounded-lg border flex items-center justify-center gap-1.5 ${
                    formData.type === 'CASH_OUT'
                      ? 'bg-rose-50 text-rose-700 border-rose-300 ring-2 ring-rose-500'
                      : 'bg-slate-50 text-slate-600 border-slate-200'
                  }`}
                >
                  <ArrowUpRight className="w-3.5 h-3.5" />
                  <span>Cash Out (Expense)</span>
                </button>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Amount (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="0.00"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Description / Purpose</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Office courier fees, Client refreshment"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Tender Mode</label>
                  <select
                    value={formData.payment_mode}
                    onChange={(e) => setFormData({ ...formData, payment_mode: e.target.value })}
                    className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="Cash">Cash</option>
                    <option value="UPI">UPI</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Date</label>
                  <input
                    type="date"
                    required
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
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
                  Save Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

