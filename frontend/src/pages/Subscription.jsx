import React, { useEffect, useState } from 'react';
import api from '../api/client';
import { CreditCard, CheckCircle2, FileText } from 'lucide-react';
import { Loader } from '../components/ui/Loader';
import { Badge } from '../components/ui/Badge';
import { formatDate, formatINR } from '../utils/formatters';

export const Subscription = () => {
  const [currentSub, setCurrentSub] = useState(null);
  const [plans, setPlans] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSubData = async () => {
      try {
        setLoading(true);
        const [curRes, plansRes, invRes] = await Promise.allSettled([
          api.get('/subscriptions/current/'),
          api.get('/subscriptions/plans/'),
          api.get('/subscriptions/invoices/'),
        ]);

        if (curRes.status === 'fulfilled') {
          setCurrentSub(curRes.value.data?.data || curRes.value.data || null);
        }
        if (plansRes.status === 'fulfilled') {
          const d = plansRes.value.data?.data || plansRes.value.data?.results || [];
          setPlans(Array.isArray(d) ? d : []);
        }
        if (invRes.status === 'fulfilled') {
          const d = invRes.value.data?.data || invRes.value.data?.results || [];
          setInvoices(Array.isArray(d) ? d : []);
        }
      } finally {
        setLoading(false);
      }
    };
    fetchSubData();
  }, []);

  if (loading) {
    return <Loader message="Loading subscription & billing details..." />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <CreditCard className="w-5 h-5 text-indigo-600" />
          <span>Subscription — Plans &amp; Billing</span>
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          View your active WorkPulse SaaS plan, quota limits, and billing invoices
        </p>
      </div>

      {/* Current Subscription Card */}
      <div className="bg-gradient-to-r from-indigo-700 to-violet-800 rounded-2xl p-6 text-white shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full bg-white/20">
            {currentSub?.status || 'ACTIVE'}
          </span>
          <h3 className="text-2xl font-bold mt-2">
            {currentSub?.plan_name || currentSub?.plan?.name || 'Professional Suite'}
          </h3>
          <p className="text-xs text-indigo-100 mt-1">
            Billing Cycle: {currentSub?.billing_cycle || 'ANNUAL'}
            {currentSub?.current_period_end ? ` • Renews on ${formatDate(currentSub.current_period_end)}` : ''}
          </p>
        </div>
        <div className="text-left sm:text-right">
          <p className="text-xs text-indigo-200 uppercase font-bold">Status</p>
          <p className="text-sm font-semibold flex items-center gap-1.5 mt-1 sm:justify-end">
            <CheckCircle2 className="w-4 h-4 text-emerald-300" />
            <span>All Enterprise Features Active</span>
          </p>
        </div>
      </div>

      {/* Available Plans */}
      <div>
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Available SaaS Plans</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {plans.map((p) => {
            const isCurrent = currentSub?.plan === p.id || currentSub?.plan_code === p.code || currentSub?.plan?.code === p.code;
            return (
              <div
                key={p.id}
                className={`bg-white p-5 rounded-xl border shadow-sm flex flex-col justify-between ${
                  isCurrent ? 'border-indigo-600 ring-2 ring-indigo-600/20' : 'border-slate-200'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 uppercase">
                      {p.code}
                    </span>
                    {isCurrent && <Badge variant="info">CURRENT</Badge>}
                  </div>
                  <h4 className="text-sm font-bold text-slate-900 mt-2">{p.name}</h4>
                  <p className="text-xl font-bold text-indigo-600 mt-1">
                    {formatINR(p.monthly_price)}
                    <span className="text-xs font-normal text-slate-400">/mo</span>
                  </p>
                  <p className="text-xs text-slate-500 mt-2">{p.description}</p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-600 space-y-1">
                  <p>Employees: <strong>{p.max_employees === -1 ? 'Unlimited' : p.max_employees}</strong></p>
                  <p>Branches: <strong>{p.max_branches === -1 ? 'Unlimited' : p.max_branches}</strong></p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Invoices */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
          <FileText className="w-4 h-4 text-slate-500" />
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Billing Invoices</h3>
        </div>
        {invoices.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">No billing invoices generated yet.</div>
        ) : (
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[11px]">
                <th className="py-3 px-4">Invoice #</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Amount</th>
                <th className="py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {invoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-slate-50">
                  <td className="py-3 px-4 font-mono font-semibold text-slate-900">{inv.invoice_number}</td>
                  <td className="py-3 px-4 text-slate-600">{formatDate(inv.issued_date || inv.created_at)}</td>
                  <td className="py-3 px-4 font-bold text-slate-900">{formatINR(inv.amount)}</td>
                  <td className="py-3 px-4"><Badge variant={inv.status === 'PAID' ? 'success' : 'warning'}>{inv.status}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
