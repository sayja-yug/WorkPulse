import React, { useEffect, useState } from 'react';
import api from '../api/client';
import { usePermissions } from '../hooks/usePermissions';
import { Building2, CreditCard, ShieldCheck, Activity, Power } from 'lucide-react';
import { Loader } from '../components/ui/Loader';
import { Badge } from '../components/ui/Badge';
import { formatDate, formatINR } from '../utils/formatters';

export const PlatformDashboard = ({ view = 'overview' }) => {
  const { activeRole, isSuperAdmin, isBillingAdmin, isSupportAdmin } = usePermissions();

  const [tenants, setTenants] = useState([]);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadPlatformData = async () => {
    try {
      setLoading(true);
      const [bizRes, planRes] = await Promise.allSettled([
        api.get('/businesses/'),
        api.get('/subscriptions/plans/'),
      ]);

      if (bizRes.status === 'fulfilled') {
        const list = bizRes.value.data?.data || bizRes.value.data?.results || bizRes.value.data || [];
        setTenants(Array.isArray(list) ? list : []);
      }
      if (planRes.status === 'fulfilled') {
        const pList = planRes.value.data?.data || planRes.value.data?.results || planRes.value.data || [];
        setPlans(Array.isArray(pList) ? pList : []);
      }
    } catch (err) {
      console.error('Failed to load platform data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPlatformData();
  }, []);

  const handleToggleTenant = async (tenantId) => {
    try {
      await api.post(`/businesses/${tenantId}/toggle-status/`);
      loadPlatformData();
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Action restricted to Super Admin');
    }
  };

  if (loading) {
    return <Loader message="Loading SaaS Platform Telemetry..." />;
  }

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-rose-950 rounded-2xl p-6 text-white shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[11px] font-bold px-2.5 py-0.5 bg-rose-500/30 border border-rose-400/30 rounded-full uppercase">
            {activeRole.replace('_', ' ')}
          </span>
          <h2 className="text-2xl font-bold mt-2">
            {view === 'tenants'
              ? 'Registered Business Tenants'
              : view === 'billing'
              ? 'Subscription Plans & Billing'
              : 'SaaS Platform Control Center'}
          </h2>
          <p className="text-xs text-slate-300 mt-1">
            {isBillingAdmin
              ? 'Manage subscription tiers, renewals, and tenant billing operations.'
              : isSupportAdmin
              ? 'Inspect tenant accounts and assist customers (restricted payroll access).'
              : 'Global platform governance, tenant lifecycle, and system health.'}
          </p>
        </div>
      </div>

      {/* Platform KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase">Registered Tenants</span>
            <Building2 className="w-5 h-5 text-indigo-600" />
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">{tenants.length}</p>
          <p className="text-xs text-emerald-600 mt-1">
            {tenants.filter((t) => t.is_active !== false).length} active organizations
          </p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase">Subscription Plans</span>
            <CreditCard className="w-5 h-5 text-violet-600" />
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">{plans.length}</p>
          <p className="text-xs text-slate-500 mt-1">Configured SaaS tiers</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase">Platform Security</span>
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
          </div>
          <p className="text-xl font-bold text-emerald-600 mt-2">HEALTHY</p>
          <p className="text-xs text-slate-500 mt-1">PostgreSQL multi-tenant isolation</p>
        </div>
      </div>

      {/* Tenants Table */}
      {(view === 'overview' || view === 'tenants') && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Registered Businesses ({tenants.length})
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[11px]">
                  <th className="py-3 px-4">Business Name</th>
                  <th className="py-3 px-4">Slug</th>
                  <th className="py-3 px-4">City / Currency</th>
                  <th className="py-3 px-4">Status</th>
                  {isSuperAdmin && <th className="py-3 px-4 text-right">Governance</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tenants.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-semibold text-slate-900">{t.name}</td>
                    <td className="py-3 px-4 font-mono text-slate-600">{t.slug}</td>
                    <td className="py-3 px-4 text-slate-600">
                      {t.city || '-'} ({t.currency || 'INR'})
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant={t.is_active !== false ? 'success' : 'danger'}>
                        {t.is_active !== false ? 'ACTIVE' : 'SUSPENDED'}
                      </Badge>
                    </td>
                    {isSuperAdmin && (
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => handleToggleTenant(t.id)}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-bold border ${
                            t.is_active !== false
                              ? 'border-rose-200 text-rose-700 bg-rose-50 hover:bg-rose-100'
                              : 'border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
                          }`}
                        >
                          <Power className="w-3 h-3" />
                          <span>{t.is_active !== false ? 'Suspend' : 'Activate'}</span>
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Plans Grid */}
      {(view === 'overview' || view === 'billing') && plans.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {plans.map((p) => (
            <div key={p.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <span className="text-[10px] font-bold px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded uppercase">
                {p.code}
              </span>
              <h4 className="text-sm font-bold text-slate-900 mt-2">{p.name}</h4>
              <p className="text-xl font-bold text-indigo-600 mt-1">
                {formatINR(p.monthly_price)}
                <span className="text-xs font-normal text-slate-400">/mo</span>
              </p>
              <p className="text-[11px] text-slate-500 mt-2">
                Max Employees: {p.max_employees === -1 ? 'Unlimited' : p.max_employees}
              </p>
              <p className="text-[11px] text-slate-500">
                Max Branches: {p.max_branches === -1 ? 'Unlimited' : p.max_branches}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
