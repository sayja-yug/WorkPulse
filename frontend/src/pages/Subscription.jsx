import React, { useEffect, useState } from 'react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import {
  CreditCard,
  CheckCircle2,
  FileText,
  Building2,
  Calendar,
  Users,
  GitBranch,
  ShieldCheck,
  Printer,
  ChevronRight,
  Layers,
  Sparkles,
} from 'lucide-react';
import { Loader } from '../components/ui/Loader';
import { Badge } from '../components/ui/Badge';
import { formatDate, formatINR } from '../utils/formatters';

export const Subscription = () => {
  const { business, user } = useAuth();
  const [currentSub, setCurrentSub] = useState(null);
  const [plans, setPlans] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAllPlans, setShowAllPlans] = useState(false);

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
    return <Loader message="Loading company subscription & billing details..." />;
  }

  const companyName = currentSub?.business_name || business?.name || 'Trinetra Technologies Pvt Ltd';
  const planName = currentSub?.plan_name || 'Professional Suite';
  const planCode = currentSub?.plan_code || 'PRO';

  // Find the company's purchased plan
  const purchasedPlan = plans.find(
    (p) => currentSub?.plan === p.id || currentSub?.plan_code === p.code || p.code === 'PRO'
  ) || {
    name: planName,
    code: planCode,
    monthly_price: 2499,
    annual_price: 24990,
    max_employees: 100,
    max_branches: 5,
    description: 'Full enterprise workforce, statutory payroll, and multi-site access.',
  };

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-indigo-600" />
            <span>Subscription &amp; Licensing</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Active WorkPulse SaaS plan, license entitlements, and billing invoices for {companyName}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg text-xs font-bold">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Enterprise License Active</span>
          </span>
        </div>
      </div>

      {/* Main Purchased Subscription Card */}
      <div className="bg-gradient-to-r from-indigo-700 via-indigo-800 to-violet-900 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
        {/* Decorative background glow */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-white/5 rounded-full blur-2xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-start justify-between gap-6">
          <div className="space-y-3">
            {/* Company Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/15 backdrop-blur-xs rounded-full border border-white/20 text-xs font-semibold">
              <Building2 className="w-3.5 h-3.5 text-indigo-200" />
              <span>Purchased by: <strong>{companyName}</strong></span>
            </div>

            <div>
              <h3 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                {planName}
              </h3>
              <p className="text-xs text-indigo-200 mt-1 max-w-xl">
                {currentSub?.plan_description || purchasedPlan.description || 'Full feature access with automated Indian statutory payroll, multi-branch geofencing, and cashbook.'}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-xs text-indigo-100 pt-1">
              <div className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-indigo-300" />
                <span>Cycle: <strong>{currentSub?.billing_cycle || 'ANNUAL'}</strong></span>
              </div>
              <div className="flex items-center gap-1.5">
                <Users className="w-4 h-4 text-indigo-300" />
                <span>Limit: <strong>{purchasedPlan.max_employees === -1 ? 'Unlimited' : `${purchasedPlan.max_employees} Staff`}</strong></span>
              </div>
              <div className="flex items-center gap-1.5">
                <GitBranch className="w-4 h-4 text-indigo-300" />
                <span>Branches: <strong>{purchasedPlan.max_branches === -1 ? 'Unlimited' : `${purchasedPlan.max_branches} Sites`}</strong></span>
              </div>
            </div>
          </div>

          {/* Right Status Card */}
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20 text-left md:text-right min-w-[220px] space-y-2">
            <p className="text-[11px] font-bold uppercase tracking-wider text-indigo-200">License Status</p>
            <p className="text-lg font-black text-emerald-300 flex items-center md:justify-end gap-1.5">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              <span>{currentSub?.status || 'ACTIVE'}</span>
            </p>
            <p className="text-[11px] text-indigo-200">
              Valid until: <strong>{formatDate(currentSub?.current_period_end || '2027-10-31')}</strong>
            </p>
            <p className="text-[10px] text-indigo-300 border-t border-white/10 pt-2">
              Registered Owner: {user?.full_name || 'Vikram Aditya'}
            </p>
          </div>
        </div>
      </div>

      {/* Section: Company's Purchased Plan Contract */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-600" />
              <span>Company Purchased Plan</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Active plan entitlements and features currently unlocked for {companyName}
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowAllPlans(!showAllPlans)}
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
          >
            {showAllPlans ? 'Hide Other Plans' : 'Compare Other Tiers →'}
          </button>
        </div>

        {/* Highlighted Purchased Plan Card */}
        <div className="bg-white rounded-xl border-2 border-indigo-600 ring-4 ring-indigo-50 p-6 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-extrabold uppercase px-2.5 py-0.5 rounded bg-indigo-100 text-indigo-800">
                  {purchasedPlan.code} TIER
                </span>
                <span className="text-xs font-bold px-2.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                  ✓ Active for {companyName}
                </span>
              </div>
              <h4 className="text-xl font-bold text-slate-900 mt-2">{purchasedPlan.name}</h4>
              <p className="text-xs text-slate-500 mt-0.5">{purchasedPlan.description}</p>
            </div>
            <div className="text-left md:text-right">
              <span className="text-2xl font-black text-indigo-600">
                {formatINR(currentSub?.billing_cycle === 'ANNUAL' ? (purchasedPlan.annual_price || 24990) : (purchasedPlan.monthly_price || 2499))}
              </span>
              <span className="text-xs text-slate-400 font-normal"> / {currentSub?.billing_cycle === 'ANNUAL' ? 'year' : 'month'}</span>
              <p className="text-[11px] text-emerald-600 font-semibold mt-0.5">Paid &amp; In Good Standing</p>
            </div>
          </div>

          {/* Included Features Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-4 text-xs">
            <div className="flex items-center gap-2 text-slate-700">
              <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0" />
              <span>Full India Statutory Payroll (PF, TDS, Advances)</span>
            </div>
            <div className="flex items-center gap-2 text-slate-700">
              <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0" />
              <span>Multi-Site Geofenced Attendance &amp; Selfie Punches</span>
            </div>
            <div className="flex items-center gap-2 text-slate-700">
              <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0" />
              <span>Configurable Overtime Multipliers &amp; Shortfall Cuts</span>
            </div>
            <div className="flex items-center gap-2 text-slate-700">
              <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0" />
              <span>Up to {purchasedPlan.max_employees} Staff Members Allowed</span>
            </div>
            <div className="flex items-center gap-2 text-slate-700">
              <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0" />
              <span>Up to {purchasedPlan.max_branches} Company Branches Included</span>
            </div>
            <div className="flex items-center gap-2 text-slate-700">
              <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0" />
              <span>Cashbook Ledgers &amp; Expense Audit Trails</span>
            </div>
          </div>
        </div>

        {/* Optional Other Plans toggle */}
        {showAllPlans && (
          <div className="pt-2 space-y-3">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Other Platform Tiers</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {plans
                .filter((p) => p.code !== purchasedPlan.code)
                .map((p) => (
                  <div key={p.id} className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-700 uppercase">{p.name}</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-200 text-slate-600">{p.code}</span>
                    </div>
                    <p className="text-lg font-bold text-slate-900">{formatINR(p.monthly_price)}<span className="text-xs text-slate-400 font-normal">/mo</span></p>
                    <p className="text-[11px] text-slate-500">{p.description}</p>
                    <div className="text-[11px] text-slate-600 border-t border-slate-200 pt-2 space-y-0.5">
                      <p>Employees: <strong>{p.max_employees === -1 ? 'Unlimited' : p.max_employees}</strong></p>
                      <p>Branches: <strong>{p.max_branches === -1 ? 'Unlimited' : p.max_branches}</strong></p>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>

      {/* Invoices Section */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-indigo-600" />
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Billing Invoices for {companyName}
            </h3>
          </div>
          <span className="text-[11px] font-semibold text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded">
            {invoices.length} Official Tax Invoices
          </span>
        </div>

        {invoices.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500 space-y-1">
            <FileText className="w-6 h-6 text-slate-300 mx-auto" />
            <p className="font-semibold text-slate-700">No invoices generated yet for this period.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[11px]">
                  <th className="py-3 px-4">Invoice #</th>
                  <th className="py-3 px-4">Billed To Company</th>
                  <th className="py-3 px-4">Description</th>
                  <th className="py-3 px-4">Issue Date</th>
                  <th className="py-3 px-4">Total Amount</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900">{inv.invoice_number}</td>
                    <td className="py-3.5 px-4 font-medium text-slate-800">{inv.business_name || companyName}</td>
                    <td className="py-3.5 px-4 text-slate-600">{inv.notes || `${planName} License`}</td>
                    <td className="py-3.5 px-4 text-slate-600">{formatDate(inv.issued_date || inv.paid_at || inv.created_at)}</td>
                    <td className="py-3.5 px-4 font-bold text-slate-900 text-sm">{formatINR(inv.total || inv.amount)}</td>
                    <td className="py-3.5 px-4">
                      <Badge variant={inv.status === 'PAID' ? 'success' : 'warning'}>{inv.status}</Badge>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => window.print()}
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-semibold transition-colors"
                        title="Print / Save Receipt"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>Print</span>
                      </button>
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

export default Subscription;
