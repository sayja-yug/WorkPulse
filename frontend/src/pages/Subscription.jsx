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
          <h2 className="text-xl font-bold text-zinc-950 tracking-tight flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-zinc-900" />
            <span>Subscription &amp; Licensing</span>
          </h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            Active WorkPulse SaaS plan, license entitlements, and billing invoices for {companyName}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-zinc-100 border border-zinc-300 text-zinc-800 rounded-lg text-xs font-bold">
            <ShieldCheck className="w-4 h-4 text-zinc-900" />
            <span>Enterprise License Active</span>
          </span>
        </div>
      </div>

      {/* Main Purchased Subscription Card */}
      <div className="bg-zinc-950 rounded-2xl p-6 text-white shadow-xs border border-zinc-800 relative overflow-hidden">
        {/* Decorative background glow */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-white/5 rounded-full blur-2xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-start justify-between gap-6">
          <div className="space-y-3">
            {/* Company Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-zinc-900 backdrop-blur-xs rounded-full border border-zinc-800 text-xs font-semibold text-zinc-200">
              <Building2 className="w-3.5 h-3.5 text-zinc-400" />
              <span>Purchased by: <strong>{companyName}</strong></span>
            </div>

            <div>
              <h3 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                {planName}
              </h3>
              <p className="text-xs text-zinc-400 mt-1 max-w-xl">
                {currentSub?.plan_description || purchasedPlan.description || 'Full feature access with automated Indian statutory payroll, multi-branch geofencing, and cashbook.'}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-xs text-zinc-300 pt-1">
              <div className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-zinc-400" />
                <span>Cycle: <strong>{currentSub?.billing_cycle || 'ANNUAL'}</strong></span>
              </div>
              <div className="flex items-center gap-1.5">
                <Users className="w-4 h-4 text-zinc-400" />
                <span>Limit: <strong>{purchasedPlan.max_employees === -1 ? 'Unlimited' : `${purchasedPlan.max_employees} Staff`}</strong></span>
              </div>
              <div className="flex items-center gap-1.5">
                <GitBranch className="w-4 h-4 text-zinc-400" />
                <span>Branches: <strong>{purchasedPlan.max_branches === -1 ? 'Unlimited' : `${purchasedPlan.max_branches} Sites`}</strong></span>
              </div>
            </div>
          </div>

          {/* Right Status Card */}
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20 text-left md:text-right min-w-[220px] space-y-2">
            <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-300">License Status</p>
            <p className="text-lg font-black text-white flex items-center md:justify-end gap-1.5">
              <CheckCircle2 className="w-5 h-5 text-white" />
              <span>{currentSub?.status || 'ACTIVE'}</span>
            </p>
            <p className="text-[11px] text-zinc-300">
              Valid until: <strong>{formatDate(currentSub?.current_period_end || '2027-10-31')}</strong>
            </p>
            <p className="text-[10px] text-zinc-400 border-t border-white/10 pt-2">
              Registered Owner: {user?.full_name || 'Vikram Aditya'}
            </p>
          </div>
        </div>
      </div>

      {/* Section: Company's Purchased Plan Contract */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xs font-bold text-zinc-950  uppercase tracking-wider flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-zinc-900 " />
              <span>Company Purchased Plan</span>
            </h3>
            <p className="text-xs text-zinc-500  mt-0.5">
              Active plan entitlements and features currently unlocked for {companyName}
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowAllPlans(!showAllPlans)}
            className="text-xs font-semibold text-zinc-900  hover:underline transition-colors cursor-pointer"
          >
            {showAllPlans ? 'Hide Other Plans' : 'Compare Other Tiers →'}
          </button>
        </div>

        {/* Highlighted Purchased Plan Card */}
        <div className="bg-white  rounded-xl border-2 border-zinc-950  p-6 shadow-xs">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-zinc-200 ">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-extrabold uppercase px-2.5 py-0.5 rounded bg-zinc-950 text-white  ">
                  {purchasedPlan.code} TIER
                </span>
                <span className="text-xs font-bold px-2.5 py-0.5 rounded bg-zinc-100  text-zinc-900  border border-zinc-300 ">
                  ✓ Active for {companyName}
                </span>
              </div>
              <h4 className="text-xl font-bold text-zinc-950  mt-2">{purchasedPlan.name}</h4>
              <p className="text-xs text-zinc-500  mt-0.5">{purchasedPlan.description}</p>
            </div>
            <div className="text-left md:text-right">
              <span className="text-2xl font-black text-zinc-950 ">
                {formatINR(currentSub?.billing_cycle === 'ANNUAL' ? (purchasedPlan.annual_price || 24990) : (purchasedPlan.monthly_price || 2499))}
              </span>
              <span className="text-xs text-zinc-400 font-normal"> / {currentSub?.billing_cycle === 'ANNUAL' ? 'year' : 'month'}</span>
              <p className="text-[11px] text-zinc-600  font-semibold mt-0.5">Paid &amp; In Good Standing</p>
            </div>
          </div>

          {/* Included Features Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-4 text-xs">
            <div className="flex items-center gap-2 text-zinc-700 ">
              <CheckCircle2 className="w-4 h-4 text-zinc-900  shrink-0" />
              <span>Full India Statutory Payroll (PF, TDS, Advances)</span>
            </div>
            <div className="flex items-center gap-2 text-zinc-700 ">
              <CheckCircle2 className="w-4 h-4 text-zinc-900  shrink-0" />
              <span>Multi-Site Geofenced Attendance &amp; Selfie Punches</span>
            </div>
            <div className="flex items-center gap-2 text-zinc-700 ">
              <CheckCircle2 className="w-4 h-4 text-zinc-900  shrink-0" />
              <span>Configurable Overtime Multipliers &amp; Shortfall Cuts</span>
            </div>
            <div className="flex items-center gap-2 text-zinc-700 ">
              <CheckCircle2 className="w-4 h-4 text-zinc-900  shrink-0" />
              <span>Up to {purchasedPlan.max_employees} Staff Members Allowed</span>
            </div>
            <div className="flex items-center gap-2 text-zinc-700 ">
              <CheckCircle2 className="w-4 h-4 text-zinc-900  shrink-0" />
              <span>Up to {purchasedPlan.max_branches} Company Branches Included</span>
            </div>
            <div className="flex items-center gap-2 text-zinc-700 ">
              <CheckCircle2 className="w-4 h-4 text-zinc-900  shrink-0" />
              <span>Cashbook Ledgers &amp; Expense Audit Trails</span>
            </div>
          </div>
        </div>

        {/* Optional Other Plans toggle */}
        {showAllPlans && (
          <div className="pt-2 space-y-3">
            <p className="text-xs font-semibold text-zinc-500  uppercase tracking-wider">Other Platform Tiers</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {plans
                .filter((p) => p.code !== purchasedPlan.code)
                .map((p) => (
                  <div key={p.id} className="bg-zinc-50  p-4 rounded-xl border border-zinc-200  text-xs space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-zinc-900  uppercase">{p.name}</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-zinc-200  text-zinc-800 ">{p.code}</span>
                    </div>
                    <p className="text-lg font-bold text-zinc-950 ">{formatINR(p.monthly_price)}<span className="text-xs text-zinc-400 font-normal">/mo</span></p>
                    <p className="text-[11px] text-zinc-500 ">{p.description}</p>
                    <div className="text-[11px] text-zinc-600  border-t border-zinc-200  pt-2 space-y-0.5">
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
      <div className="bg-white  rounded-xl border border-zinc-200  shadow-xs overflow-hidden">
        <div className="p-4 border-b border-zinc-200  bg-zinc-50/50  flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-zinc-900 " />
            <h3 className="text-xs font-bold text-zinc-950  uppercase tracking-wider">
              Billing Invoices for {companyName}
            </h3>
          </div>
          <span className="text-[11px] font-semibold text-zinc-800  bg-zinc-100  border border-zinc-300  px-2.5 py-0.5 rounded">
            {invoices.length} Official Tax Invoices
          </span>
        </div>

        {invoices.length === 0 ? (
          <div className="p-8 text-center text-xs text-zinc-500  space-y-1">
            <FileText className="w-6 h-6 text-zinc-300  mx-auto" />
            <p className="font-semibold text-zinc-700 ">No invoices generated yet for this period.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-zinc-50  border-b border-zinc-200  text-zinc-500  font-semibold uppercase text-[11px]">
                  <th className="py-3 px-4">Invoice #</th>
                  <th className="py-3 px-4">Billed To Company</th>
                  <th className="py-3 px-4">Description</th>
                  <th className="py-3 px-4">Issue Date</th>
                  <th className="py-3 px-4">Total Amount</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 ">
                {invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-zinc-50  transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-zinc-900 ">{inv.invoice_number}</td>
                    <td className="py-3.5 px-4 font-medium text-zinc-800 ">{inv.business_name || companyName}</td>
                    <td className="py-3.5 px-4 text-zinc-600 ">{inv.notes || `${planName} License`}</td>
                    <td className="py-3.5 px-4 text-zinc-600 ">{formatDate(inv.issued_date || inv.paid_at || inv.created_at)}</td>
                    <td className="py-3.5 px-4 font-bold text-zinc-950  text-sm">{formatINR(inv.total || inv.amount)}</td>
                    <td className="py-3.5 px-4">
                      <Badge variant={inv.status === 'PAID' ? 'default' : 'neutral'}>{inv.status}</Badge>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => window.print()}
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-zinc-100   text-zinc-800  border border-zinc-300  rounded text-xs font-semibold transition-colors cursor-pointer"
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
