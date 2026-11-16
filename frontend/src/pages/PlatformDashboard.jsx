import React, { useEffect, useState, useMemo } from 'react';
import api from '../api/client';
import { usePermissions } from '../hooks/usePermissions';
import {
  Building2,
  CreditCard,
  ShieldCheck,
  Users,
  TrendingUp,
  Search,
  Filter,
  Power,
  Eye,
  X,
  RefreshCw,
  CheckCircle2,
  Clock,
  Sparkles,
  ArrowUpRight,
} from 'lucide-react';
import { Loader } from '../components/ui/Loader';
import { Badge } from '../components/ui/Badge';
import { formatDate, formatINR } from '../utils/formatters';

export const PlatformDashboard = ({ view = 'overview' }) => {
  const { activeRole, isSuperAdmin, isBillingAdmin, isSupportAdmin } = usePermissions();

  const [tenants, setTenants] = useState([]);
  const [plans, setPlans] = useState([]);
  const [overviewData, setOverviewData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPlanFilter, setSelectedPlanFilter] = useState('ALL');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('ALL');

  // Detail Modal
  const [selectedTenant, setSelectedTenant] = useState(null);

  const loadPlatformData = async (isManualRefresh = false) => {
    try {
      if (isManualRefresh) setRefreshing(true);
      else setLoading(true);

      const [bizRes, planRes, overviewRes] = await Promise.allSettled([
        api.get('/businesses/'),
        api.get('/subscriptions/plans/'),
        api.get('/subscriptions/platform-overview/'),
      ]);

      if (bizRes.status === 'fulfilled') {
        const list = bizRes.value.data?.data || bizRes.value.data?.results || bizRes.value.data || [];
        setTenants(Array.isArray(list) ? list : []);
      }
      if (planRes.status === 'fulfilled') {
        const pList = planRes.value.data?.data || planRes.value.data?.results || planRes.value.data || [];
        setPlans(Array.isArray(pList) ? pList : []);
      }
      if (overviewRes.status === 'fulfilled' && overviewRes.value.data?.data) {
        setOverviewData(overviewRes.value.data.data);
      }
    } catch (err) {
      console.error('Failed to load platform data', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadPlatformData();
  }, []);

  const handleToggleTenant = async (tenantId) => {
    if (!window.confirm('Are you sure you want to change this tenant status?')) return;
    try {
      await api.post(`/businesses/${tenantId}/toggle-status/`);
      await loadPlatformData(true);
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Action restricted to Super Admin');
    }
  };

  // Telemetry Calculations
  const metrics = useMemo(() => {
    const totalCompanies = tenants.length;
    const activeCompanies = tenants.filter((t) => t.is_active !== false).length;
    const suspendedCompanies = totalCompanies - activeCompanies;
    const totalEmployees = tenants.reduce((acc, t) => acc + (t.total_employees || 0), 0);
    const totalMRR = tenants
      .filter((t) => t.is_active !== false && t.subscription_status === 'ACTIVE')
      .reduce((acc, t) => acc + (Number(t.plan_price) || 0), 0);

    // Group companies by plan code
    const planAdoption = {};
    tenants.forEach((t) => {
      const code = t.plan_code || 'FREE';
      if (!planAdoption[code]) {
        planAdoption[code] = {
          count: 0,
          companies: [],
        };
      }
      planAdoption[code].count += 1;
      planAdoption[code].companies.push(t.name);
    });

    return {
      totalCompanies,
      activeCompanies,
      suspendedCompanies,
      totalEmployees,
      totalMRR,
      planAdoption,
    };
  }, [tenants]);

  // Filtered tenants list
  const filteredTenants = useMemo(() => {
    return tenants.filter((t) => {
      const matchesSearch =
        searchQuery.trim() === '' ||
        t.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.slug?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.owner_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.owner_email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.city?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesPlan =
        selectedPlanFilter === 'ALL' ||
        (t.plan_code && t.plan_code.toUpperCase() === selectedPlanFilter.toUpperCase()) ||
        (selectedPlanFilter === 'FREE' && (!t.plan_code || t.plan_code === 'FREE'));

      const matchesStatus =
        selectedStatusFilter === 'ALL' ||
        (selectedStatusFilter === 'ACTIVE' && t.is_active !== false) ||
        (selectedStatusFilter === 'SUSPENDED' && t.is_active === false);

      return matchesSearch && matchesPlan && matchesStatus;
    });
  }, [tenants, searchQuery, selectedPlanFilter, selectedStatusFilter]);

  if (loading) {
    return <Loader message="Loading SaaS Platform Telemetry & Subscriptions..." />;
  }

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-zinc-950 rounded-2xl p-6 text-white shadow-xs border border-zinc-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold px-2.5 py-0.5 bg-rose-500/30 border border-rose-400/40 rounded-full uppercase tracking-wider text-rose-200">
              {activeRole.replace('_', ' ')}
            </span>
            <span className="text-xs text-slate-400">|</span>
            <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              Live Production Telemetry
            </span>
          </div>
          <h2 className="text-2xl font-bold mt-2">
            {view === 'tenants'
              ? 'Registered Business Tenants & Plans'
              : view === 'billing'
              ? 'SaaS Subscription Plans & Billing'
              : 'SaaS Platform Control Center'}
          </h2>
          <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
            {isBillingAdmin
              ? 'Manage subscription plans, pricing tiers, renewals, and tenant billing operations.'
              : isSupportAdmin
              ? 'Inspect tenant accounts, user activity, and assist customers across all registered companies.'
              : 'Multi-tenant governance: monitor all registered companies, live subscription plan adoption, and platform workforce.'}
          </p>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto">
          <button
            onClick={() => loadPlatformData(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-semibold backdrop-blur transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span>{refreshing ? 'Refreshing...' : 'Refresh Telemetry'}</span>
          </button>
        </div>
      </div>

      {/* Platform KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Registered Companies</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-bold text-slate-900 mt-2">{metrics.totalCompanies}</p>
          <div className="flex items-center gap-2 mt-2 text-xs">
            <span className="text-emerald-600 font-semibold">{metrics.activeCompanies} active</span>
            <span className="text-slate-300">•</span>
            <span className="text-rose-600 font-medium">{metrics.suspendedCompanies} suspended</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Plan Subscriptions</span>
            <div className="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center text-violet-600">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-bold text-slate-900 mt-2">
            {tenants.filter((t) => t.plan_code && t.plan_code !== 'FREE').length}
            <span className="text-sm font-normal text-slate-400 ml-1">/ {metrics.totalCompanies} paid</span>
          </p>
          <p className="text-xs text-slate-500 mt-2">
            {plans.length} tiers active in catalog
          </p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Platform Workforce</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-bold text-slate-900 mt-2">{metrics.totalEmployees}</p>
          <p className="text-xs text-slate-500 mt-2">Total registered staff across all tenants</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Estimated MRR</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-bold text-slate-900 mt-2">{formatINR(metrics.totalMRR)}</p>
          <p className="text-xs text-emerald-600 font-medium mt-2">Monthly subscription run rate</p>
        </div>
      </div>

      {/* Plan Adoption Breakdown ("How many companies are using our plan") */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-600" />
              <span>Subscription Plan Adoption &amp; Company Count</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Live breakdown of how many registered companies are subscribed to each SaaS plan tier.
            </p>
          </div>
          {selectedPlanFilter !== 'ALL' && (
            <button
              onClick={() => setSelectedPlanFilter('ALL')}
              className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold self-start sm:self-auto"
            >
              Reset Plan Filter
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {plans.map((p) => {
            const count = metrics.planAdoption[p.code]?.count || 0;
            const enrolledNames = metrics.planAdoption[p.code]?.companies || [];
            const isSelected = selectedPlanFilter === p.code;

            return (
              <div
                key={p.id}
                onClick={() => setSelectedPlanFilter(isSelected ? 'ALL' : p.code)}
                className={`p-4 rounded-xl border transition-all cursor-pointer relative overflow-hidden ${
                  isSelected
                    ? 'border-indigo-600 bg-indigo-50/40 shadow-sm ring-2 ring-indigo-600/20'
                    : 'border-slate-200 bg-slate-50/50 hover:bg-slate-50 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                      p.code === 'PRO'
                        ? 'bg-indigo-100 text-indigo-700'
                        : p.code === 'ENTERPRISE'
                        ? 'bg-purple-100 text-purple-700'
                        : p.code === 'BASIC'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {p.code}
                  </span>
                  <span className="text-xs font-bold text-slate-700">
                    {formatINR(p.monthly_price)}
                    <span className="text-[10px] font-normal text-slate-400">/mo</span>
                  </span>
                </div>

                <h4 className="text-sm font-bold text-slate-900 mt-2.5">{p.name}</h4>

                {/* Company Count Indicator */}
                <div className="mt-3 flex items-baseline gap-1.5">
                  <span className="text-2xl font-black text-slate-900">{count}</span>
                  <span className="text-xs font-semibold text-slate-500">
                    {count === 1 ? 'Company using plan' : 'Companies using plan'}
                  </span>
                </div>

                {/* Enrolled Companies preview */}
                <div className="mt-3 pt-3 border-t border-slate-200/60 text-xs">
                  {enrolledNames.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {enrolledNames.slice(0, 2).map((cName, idx) => (
                        <span
                          key={idx}
                          className="inline-block px-1.5 py-0.5 rounded text-[10px] font-medium bg-white text-slate-700 border border-slate-200 truncate max-w-[150px]"
                          title={cName}
                        >
                          {cName}
                        </span>
                      ))}
                      {enrolledNames.length > 2 && (
                        <span className="inline-block px-1 py-0.5 rounded text-[10px] font-medium text-slate-400">
                          +{enrolledNames.length - 2} more
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="text-[11px] text-slate-400 italic">No companies currently enrolled</span>
                  )}
                </div>

                {/* Limit badges */}
                <div className="mt-2 text-[10px] text-slate-400 flex items-center justify-between">
                  <span>Max Staff: {p.max_employees === -1 ? 'Unlimited' : p.max_employees}</span>
                  <span>Branches: {p.max_branches === -1 ? 'Unlimited' : p.max_branches}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Registered Companies Table */}
      {(view === 'overview' || view === 'tenants') && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Table Header and Filters */}
          <div className="p-4 border-b border-slate-200 bg-slate-50/60 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <span>All Registered Companies ({filteredTenants.length})</span>
                {filteredTenants.length !== tenants.length && (
                  <span className="text-xs font-normal text-slate-500">
                    (filtered from {tenants.length} total)
                  </span>
                )}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Complete list of business tenants registered on the platform with their subscribed plan and workforce.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {/* Search */}
              <div className="relative min-w-[200px]">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search company, owner, city..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              {/* Plan Filter */}
              <select
                value={selectedPlanFilter}
                onChange={(e) => setSelectedPlanFilter(e.target.value)}
                className="px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-700 font-medium"
              >
                <option value="ALL">All Plans</option>
                {plans.map((p) => (
                  <option key={p.id} value={p.code}>
                    {p.name} ({p.code})
                  </option>
                ))}
              </select>

              {/* Status Filter */}
              <select
                value={selectedStatusFilter}
                onChange={(e) => setSelectedStatusFilter(e.target.value)}
                className="px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-700 font-medium"
              >
                <option value="ALL">All Status</option>
                <option value="ACTIVE">Active</option>
                <option value="SUSPENDED">Suspended</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100/70 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[11px] tracking-wider">
                  <th className="py-3 px-4">Company Name</th>
                  <th className="py-3 px-4">Business Owner</th>
                  <th className="py-3 px-4">Subscribed Plan</th>
                  <th className="py-3 px-4">Plan Status</th>
                  <th className="py-3 px-4 text-center">Workforce</th>
                  <th className="py-3 px-4">Registered Date</th>
                  <th className="py-3 px-4">Tenant Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredTenants.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="py-8 text-center text-slate-400">
                      No registered companies match the selected search or filter criteria.
                    </td>
                  </tr>
                ) : (
                  filteredTenants.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                      {/* Company Name */}
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900 text-sm">{t.name}</div>
                        <div className="text-[11px] text-slate-500 font-mono flex items-center gap-1.5 mt-0.5">
                          <span>slug: {t.slug}</span>
                          <span>•</span>
                          <span>{t.city || 'India'}</span>
                        </div>
                      </td>

                      {/* Business Owner */}
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-800">{t.owner_name || 'Primary Admin'}</div>
                        <div className="text-[11px] text-slate-500 truncate max-w-[180px]">{t.owner_email || '-'}</div>
                      </td>

                      {/* Subscribed Plan */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                              t.plan_code === 'PRO'
                                ? 'bg-indigo-100 text-indigo-700'
                                : t.plan_code === 'ENTERPRISE'
                                ? 'bg-purple-100 text-purple-700'
                                : t.plan_code === 'BASIC'
                                ? 'bg-blue-100 text-blue-700'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {t.plan_code || 'FREE'}
                          </span>
                          <span className="font-semibold text-slate-900">{t.plan_name || 'Starter Free'}</span>
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          {formatINR(t.plan_price || 0)} / {t.billing_cycle?.toLowerCase() || 'month'}
                        </div>
                      </td>

                      {/* Plan Status */}
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            t.subscription_status === 'ACTIVE'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : t.subscription_status === 'TRIAL'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                          <span>{t.subscription_status || 'ACTIVE'}</span>
                        </span>
                        {t.current_period_end && (
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            Renews: {formatDate(t.current_period_end)}
                          </div>
                        )}
                      </td>

                      {/* Workforce */}
                      <td className="py-3 px-4 text-center">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-800 font-bold text-xs">
                          <Users className="w-3 h-3 text-slate-500" />
                          <span>{t.total_employees || 0}</span>
                        </span>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          {t.active_employees || t.total_employees || 0} active
                        </div>
                      </td>

                      {/* Registered Date */}
                      <td className="py-3 px-4 text-slate-600">
                        {formatDate(t.created_at)}
                      </td>

                      {/* Tenant Status */}
                      <td className="py-3 px-4">
                        <Badge variant={t.is_active !== false ? 'success' : 'danger'}>
                          {t.is_active !== false ? 'ACTIVE' : 'SUSPENDED'}
                        </Badge>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            onClick={() => setSelectedTenant(t)}
                            title="Inspect Tenant Details"
                            className="p-1.5 rounded text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 border border-slate-200 transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {isSuperAdmin && (
                            <button
                              onClick={() => handleToggleTenant(t.id)}
                              title={t.is_active !== false ? 'Suspend Tenant' : 'Activate Tenant'}
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-bold border transition-colors ${
                                t.is_active !== false
                                  ? 'border-rose-200 text-rose-700 bg-rose-50 hover:bg-rose-100'
                                  : 'border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
                              }`}
                            >
                              <Power className="w-3 h-3" />
                              <span>{t.is_active !== false ? 'Suspend' : 'Activate'}</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Plans & Pricing Catalog (Billing Tab) */}
      {(view === 'overview' || view === 'billing') && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">SaaS Plan Catalog &amp; Limits</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Pricing configuration, quotas, and subscriber distribution per tier.
              </p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded bg-slate-100 text-slate-700">
              {plans.length} Configured Plans
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {plans.map((p) => {
              const enrolledCount = metrics.planAdoption[p.code]?.count || 0;
              return (
                <div key={p.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded uppercase">
                      {p.code}
                    </span>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                      {enrolledCount} {enrolledCount === 1 ? 'company' : 'companies'}
                    </span>
                  </div>

                  <div>
                    <h4 className="text-sm font-bold text-slate-900">{p.name}</h4>
                    <p className="text-xl font-bold text-indigo-600 mt-1">
                      {formatINR(p.monthly_price)}
                      <span className="text-xs font-normal text-slate-400">/mo</span>
                    </p>
                  </div>

                  <div className="text-[11px] text-slate-600 space-y-1 pt-2 border-t border-slate-200">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Max Employees:</span>
                      <span className="font-semibold text-slate-900">{p.max_employees === -1 ? 'Unlimited' : p.max_employees}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Max Branches:</span>
                      <span className="font-semibold text-slate-900">{p.max_branches === -1 ? 'Unlimited' : p.max_branches}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Trial Period:</span>
                      <span className="font-semibold text-slate-900">{p.trial_days || 14} days</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tenant Detail Modal */}
      {selectedTenant && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-lg">
                  {selectedTenant.name?.charAt(0) || 'B'}
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">{selectedTenant.name}</h3>
                  <p className="text-xs text-slate-500 font-mono">slug: {selectedTenant.slug}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedTenant(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Subscription Details Box */}
              <div className="bg-indigo-50/60 rounded-xl p-4 border border-indigo-100 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-indigo-700">
                    Subscribed SaaS Plan
                  </span>
                  <Badge variant={selectedTenant.is_active !== false ? 'success' : 'danger'}>
                    {selectedTenant.is_active !== false ? 'ACTIVE' : 'SUSPENDED'}
                  </Badge>
                </div>
                <div className="flex items-baseline justify-between mt-1">
                  <div>
                    <h4 className="text-base font-bold text-slate-900">
                      {selectedTenant.plan_name || 'Starter Free'} ({selectedTenant.plan_code || 'FREE'})
                    </h4>
                    <p className="text-xs text-slate-600">
                      Billing Cycle: <span className="font-semibold">{selectedTenant.billing_cycle || 'Monthly'}</span>
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-indigo-700">
                      {formatINR(selectedTenant.plan_price || 0)}
                      <span className="text-xs font-normal text-slate-500">/mo</span>
                    </p>
                    <span className="text-[11px] text-emerald-700 font-semibold">
                      Status: {selectedTenant.subscription_status || 'ACTIVE'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Tenant Metadata Grid */}
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <span className="text-slate-400 block font-medium">Primary Owner</span>
                  <span className="font-semibold text-slate-800 text-sm mt-0.5 block">
                    {selectedTenant.owner_name || 'Owner'}
                  </span>
                  <span className="text-slate-500 truncate block mt-0.5">{selectedTenant.owner_email || '-'}</span>
                </div>

                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <span className="text-slate-400 block font-medium">Total Staff Enrolled</span>
                  <span className="font-bold text-slate-900 text-lg mt-0.5 block">
                    {selectedTenant.total_employees || 0}
                  </span>
                  <span className="text-slate-500 block mt-0.5">
                    {selectedTenant.active_employees || selectedTenant.total_employees || 0} active in organization
                  </span>
                </div>

                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <span className="text-slate-400 block font-medium">Location &amp; Currency</span>
                  <span className="font-semibold text-slate-800 mt-0.5 block">
                    {selectedTenant.city || '-'}, {selectedTenant.country || 'India'}
                  </span>
                  <span className="text-slate-500 block mt-0.5">Currency: {selectedTenant.currency || 'INR'}</span>
                </div>

                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <span className="text-slate-400 block font-medium">Registered On</span>
                  <span className="font-semibold text-slate-800 mt-0.5 block">
                    {formatDate(selectedTenant.created_at)}
                  </span>
                  <span className="text-slate-500 block mt-0.5">Tenant ID: {selectedTenant.id?.substring(0, 8)}...</span>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
              {isSuperAdmin && (
                <button
                  onClick={() => {
                    handleToggleTenant(selectedTenant.id);
                    setSelectedTenant(null);
                  }}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                    selectedTenant.is_active !== false
                      ? 'border-rose-200 text-rose-700 bg-rose-50 hover:bg-rose-100'
                      : 'border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
                  }`}
                >
                  <Power className="w-3.5 h-3.5" />
                  <span>{selectedTenant.is_active !== false ? 'Suspend Organization' : 'Activate Organization'}</span>
                </button>
              )}
              <button
                onClick={() => setSelectedTenant(null)}
                className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg text-xs font-semibold ml-auto transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
