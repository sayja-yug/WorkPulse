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
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
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
      {/* Top Enterprise Banner */}
      <div className="bg-zinc-950 text-white rounded-2xl p-6 shadow-xs border border-zinc-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold px-2.5 py-0.5 bg-zinc-800 border border-zinc-700 rounded-full uppercase tracking-wider text-zinc-300">
              {activeRole.replace('_', ' ')}
            </span>
            <span className="text-xs text-zinc-500">|</span>
            <span className="text-xs text-zinc-300 font-semibold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              Live Multi-Tenant Telemetry
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold mt-2 text-white tracking-tight">
            {view === 'tenants'
              ? 'Registered Business Tenants & Plans'
              : view === 'billing'
              ? 'SaaS Subscription Plans & Billing'
              : 'SaaS Platform Control Center'}
          </h2>
          <p className="text-xs text-zinc-400 mt-1 max-w-2xl leading-relaxed">
            {isBillingAdmin
              ? 'Manage subscription plans, pricing tiers, renewals, and tenant billing operations.'
              : isSupportAdmin
              ? 'Inspect tenant accounts, user activity, and assist customers across all registered companies.'
              : 'Multi-tenant governance: monitor all registered companies, live subscription plan adoption, and platform workforce.'}
          </p>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => loadPlatformData(true)}
            disabled={refreshing}
            className="border-zinc-700 bg-zinc-900 text-zinc-200 hover:bg-zinc-800 hover:text-white"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            <span>{refreshing ? 'Refreshing...' : 'Refresh Telemetry'}</span>
          </Button>
        </div>
      </div>

      {/* Platform KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-500  uppercase tracking-wider">Registered Companies</span>
            <div className="w-8 h-8 rounded-lg bg-zinc-100  flex items-center justify-center text-zinc-900 ">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-zinc-900  mt-2">{metrics.totalCompanies}</p>
          <div className="flex items-center gap-2 mt-2 text-xs">
            <span className="text-zinc-900  font-semibold">{metrics.activeCompanies} active</span>
            <span className="text-zinc-300 ">•</span>
            <span className="text-zinc-500  font-medium">{metrics.suspendedCompanies} suspended</span>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-500  uppercase tracking-wider">Plan Subscriptions</span>
            <div className="w-8 h-8 rounded-lg bg-zinc-100  flex items-center justify-center text-zinc-900 ">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-zinc-900  mt-2">
            {tenants.filter((t) => t.plan_code && t.plan_code !== 'FREE').length}
            <span className="text-sm font-normal text-zinc-400 ml-1">/ {metrics.totalCompanies} paid</span>
          </p>
          <p className="text-xs text-zinc-500  mt-2">
            {plans.length} tiers active in catalog
          </p>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-500  uppercase tracking-wider">Platform Workforce</span>
            <div className="w-8 h-8 rounded-lg bg-zinc-100  flex items-center justify-center text-zinc-900 ">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-zinc-900  mt-2">{metrics.totalEmployees}</p>
          <p className="text-xs text-zinc-500  mt-2">Total registered staff across all tenants</p>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-500  uppercase tracking-wider">Estimated MRR</span>
            <div className="w-8 h-8 rounded-lg bg-zinc-100  flex items-center justify-center text-zinc-900 ">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-zinc-900  mt-2">{formatINR(metrics.totalMRR)}</p>
          <p className="text-xs text-zinc-500  font-medium mt-2">Monthly subscription run rate</p>
        </Card>
      </div>

      {/* Plan Adoption Breakdown */}
      <Card className="p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-100  pb-3">
          <div>
            <h3 className="text-sm font-bold text-zinc-900  flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-zinc-700 " />
              <span>Subscription Plan Adoption &amp; Company Count</span>
            </h3>
            <p className="text-xs text-zinc-500  mt-0.5">
              Live breakdown of how many registered companies are subscribed to each SaaS plan tier.
            </p>
          </div>
          {selectedPlanFilter !== 'ALL' && (
            <button
              onClick={() => setSelectedPlanFilter('ALL')}
              className="text-xs text-zinc-900  underline hover:no-underline font-semibold self-start sm:self-auto"
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
                    ? 'border-zinc-900 bg-zinc-100   shadow-sm ring-1 ring-zinc-900 '
                    : 'border-zinc-200  bg-zinc-50/50  hover:bg-zinc-100  hover:border-zinc-300 '
                }`}
              >
                <div className="flex items-center justify-between">
                  <Badge variant={isSelected ? 'default' : 'neutral'}>
                    {p.code}
                  </Badge>
                  <span className="text-xs font-bold text-zinc-900 ">
                    {formatINR(p.monthly_price)}
                    <span className="text-[10px] font-normal text-zinc-400">/mo</span>
                  </span>
                </div>

                <h4 className="text-sm font-bold text-zinc-900  mt-2.5">{p.name}</h4>

                {/* Company Count Indicator */}
                <div className="mt-3 flex items-baseline gap-1.5">
                  <span className="text-2xl font-black text-zinc-900 ">{count}</span>
                  <span className="text-xs font-semibold text-zinc-500 ">
                    {count === 1 ? 'Company using plan' : 'Companies using plan'}
                  </span>
                </div>

                {/* Enrolled Companies preview */}
                <div className="mt-3 pt-3 border-t border-zinc-200/60  text-xs">
                  {enrolledNames.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {enrolledNames.slice(0, 2).map((cName, idx) => (
                        <span
                          key={idx}
                          className="inline-block px-1.5 py-0.5 rounded text-[10px] font-medium bg-white  text-zinc-700  border border-zinc-200  truncate max-w-[150px]"
                          title={cName}
                        >
                          {cName}
                        </span>
                      ))}
                      {enrolledNames.length > 2 && (
                        <span className="inline-block px-1 py-0.5 rounded text-[10px] font-medium text-zinc-400">
                          +{enrolledNames.length - 2} more
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="text-[11px] text-zinc-400 italic">No companies currently enrolled</span>
                  )}
                </div>

                {/* Limit badges */}
                <div className="mt-2 text-[10px] text-zinc-500  flex items-center justify-between">
                  <span>Max Staff: {p.max_employees === -1 ? 'Unlimited' : p.max_employees}</span>
                  <span>Branches: {p.max_branches === -1 ? 'Unlimited' : p.max_branches}</span>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Registered Companies Table */}
      {(view === 'overview' || view === 'tenants') && (
        <Card className="overflow-hidden">
          {/* Table Header and Filters */}
          <div className="p-4 border-b border-zinc-200  bg-zinc-50/70  flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-zinc-900  flex items-center gap-2">
                <span>All Registered Companies ({filteredTenants.length})</span>
                {filteredTenants.length !== tenants.length && (
                  <span className="text-xs font-normal text-zinc-500">
                    (filtered from {tenants.length} total)
                  </span>
                )}
              </h3>
              <p className="text-xs text-zinc-500  mt-0.5">
                Complete list of business tenants registered on the platform with their subscribed plan and workforce.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {/* Search */}
              <div className="relative min-w-[200px]">
                <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search company, owner, city..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-white  border border-zinc-200  rounded-lg text-zinc-900  placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-900 "
                />
              </div>

              {/* Plan Filter */}
              <select
                value={selectedPlanFilter}
                onChange={(e) => setSelectedPlanFilter(e.target.value)}
                className="px-2.5 py-1.5 text-xs bg-white  border border-zinc-200  rounded-lg text-zinc-900  focus:outline-none focus:ring-1 focus:ring-zinc-900  font-medium"
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
                className="px-2.5 py-1.5 text-xs bg-white  border border-zinc-200  rounded-lg text-zinc-900  focus:outline-none focus:ring-1 focus:ring-zinc-900  font-medium"
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
                <tr className="bg-zinc-100/70  border-b border-zinc-200  text-zinc-600  font-semibold uppercase text-[11px] tracking-wider">
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
              <tbody className="divide-y divide-zinc-100 ">
                {filteredTenants.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="py-8 text-center text-zinc-400">
                      No registered companies match the selected search or filter criteria.
                    </td>
                  </tr>
                ) : (
                  filteredTenants.map((t) => (
                    <tr key={t.id} className="hover:bg-zinc-50  transition-colors">
                      {/* Company Name */}
                      <td className="py-3 px-4">
                        <div className="font-bold text-zinc-900  text-sm">{t.name}</div>
                        <div className="text-[11px] text-zinc-500 font-mono flex items-center gap-1.5 mt-0.5">
                          <span>slug: {t.slug}</span>
                          <span>•</span>
                          <span>{t.city || 'India'}</span>
                        </div>
                      </td>

                      {/* Business Owner */}
                      <td className="py-3 px-4">
                        <div className="font-semibold text-zinc-800 ">{t.owner_name || 'Primary Admin'}</div>
                        <div className="text-[11px] text-zinc-500 truncate max-w-[180px]">{t.owner_email || '-'}</div>
                      </td>

                      {/* Subscribed Plan */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          <Badge variant="neutral">
                            {t.plan_code || 'FREE'}
                          </Badge>
                          <span className="font-semibold text-zinc-900 ">{t.plan_name || 'Starter Free'}</span>
                        </div>
                        <div className="text-[11px] text-zinc-500 mt-0.5">
                          {formatINR(t.plan_price || 0)} / {t.billing_cycle?.toLowerCase() || 'month'}
                        </div>
                      </td>

                      {/* Plan Status */}
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-zinc-100  text-zinc-800  border border-zinc-200 ">
                          <span className={`w-1.5 h-1.5 rounded-full ${t.subscription_status === 'ACTIVE' ? 'bg-zinc-900 ' : 'bg-zinc-400'}`}></span>
                          <span>{t.subscription_status || 'ACTIVE'}</span>
                        </span>
                        {t.current_period_end && (
                          <div className="text-[10px] text-zinc-400 mt-0.5">
                            Renews: {formatDate(t.current_period_end)}
                          </div>
                        )}
                      </td>

                      {/* Workforce */}
                      <td className="py-3 px-4 text-center">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-100  text-zinc-800  font-bold text-xs">
                          <Users className="w-3 h-3 text-zinc-500" />
                          <span>{t.total_employees || 0}</span>
                        </span>
                        <div className="text-[10px] text-zinc-400 mt-0.5">
                          {t.active_employees || t.total_employees || 0} active
                        </div>
                      </td>

                      {/* Registered Date */}
                      <td className="py-3 px-4 text-zinc-600 ">
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
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setSelectedTenant(t)}
                            title="Inspect Tenant Details"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </Button>

                          {isSuperAdmin && (
                            <Button
                              variant={t.is_active !== false ? 'outline' : 'primary'}
                              size="sm"
                              onClick={() => handleToggleTenant(t.id)}
                              title={t.is_active !== false ? 'Suspend Tenant' : 'Activate Tenant'}
                              className="text-xs h-7 px-2"
                            >
                              <Power className="w-3 h-3 mr-1" />
                              <span>{t.is_active !== false ? 'Suspend' : 'Activate'}</span>
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Plans & Pricing Catalog (Billing Tab) */}
      {(view === 'overview' || view === 'billing') && (
        <Card className="p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-100  pb-3">
            <div>
              <h3 className="text-sm font-bold text-zinc-900 ">SaaS Plan Catalog &amp; Limits</h3>
              <p className="text-xs text-zinc-500  mt-0.5">
                Pricing configuration, quotas, and subscriber distribution per tier.
              </p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded bg-zinc-100  text-zinc-800  border border-zinc-200 ">
              {plans.length} Configured Plans
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {plans.map((p) => {
              const enrolledCount = metrics.planAdoption[p.code]?.count || 0;
              return (
                <div key={p.id} className="p-4 rounded-xl border border-zinc-200  bg-zinc-50/50  space-y-3">
                  <div className="flex items-center justify-between">
                    <Badge variant="default">
                      {p.code}
                    </Badge>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-zinc-200  text-zinc-800 ">
                      {enrolledCount} {enrolledCount === 1 ? 'company' : 'companies'}
                    </span>
                  </div>

                  <div>
                    <h4 className="text-sm font-bold text-zinc-900 ">{p.name}</h4>
                    <p className="text-xl font-bold text-zinc-900  mt-1">
                      {formatINR(p.monthly_price)}
                      <span className="text-xs font-normal text-zinc-400">/mo</span>
                    </p>
                  </div>

                  <div className="text-[11px] text-zinc-600  space-y-1 pt-2 border-t border-zinc-200 ">
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Max Employees:</span>
                      <span className="font-semibold text-zinc-900 ">{p.max_employees === -1 ? 'Unlimited' : p.max_employees}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Max Branches:</span>
                      <span className="font-semibold text-zinc-900 ">{p.max_branches === -1 ? 'Unlimited' : p.max_branches}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Trial Period:</span>
                      <span className="font-semibold text-zinc-900 ">{p.trial_days || 14} days</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Tenant Detail Modal */}
      {selectedTenant && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white  rounded-2xl max-w-xl w-full border border-zinc-200  shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-zinc-200  flex items-center justify-between bg-zinc-50 ">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-zinc-900 text-white   flex items-center justify-center font-bold text-lg">
                  {selectedTenant.name?.charAt(0) || 'B'}
                </div>
                <div>
                  <h3 className="font-bold text-zinc-900  text-base">{selectedTenant.name}</h3>
                  <p className="text-xs text-zinc-500 font-mono">slug: {selectedTenant.slug}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedTenant(null)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600  hover:bg-zinc-200/50  transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Subscription Details Box */}
              <div className="bg-zinc-50  rounded-xl p-4 border border-zinc-200  space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-zinc-500 ">
                    Subscribed SaaS Plan
                  </span>
                  <Badge variant={selectedTenant.is_active !== false ? 'success' : 'danger'}>
                    {selectedTenant.is_active !== false ? 'ACTIVE' : 'SUSPENDED'}
                  </Badge>
                </div>
                <div className="flex items-baseline justify-between mt-1">
                  <div>
                    <h4 className="text-base font-bold text-zinc-900 ">
                      {selectedTenant.plan_name || 'Starter Free'} ({selectedTenant.plan_code || 'FREE'})
                    </h4>
                    <p className="text-xs text-zinc-600 ">
                      Billing Cycle: <span className="font-semibold text-zinc-900 ">{selectedTenant.billing_cycle || 'Monthly'}</span>
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-zinc-900 ">
                      {formatINR(selectedTenant.plan_price || 0)}
                      <span className="text-xs font-normal text-zinc-500">/mo</span>
                    </p>
                    <span className="text-[11px] text-zinc-600  font-semibold">
                      Status: {selectedTenant.subscription_status || 'ACTIVE'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Tenant Metadata Grid */}
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="p-3 bg-zinc-50  rounded-lg border border-zinc-200 ">
                  <span className="text-zinc-400 block font-medium">Primary Owner</span>
                  <span className="font-semibold text-zinc-800  text-sm mt-0.5 block">
                    {selectedTenant.owner_name || 'Owner'}
                  </span>
                  <span className="text-zinc-500 truncate block mt-0.5">{selectedTenant.owner_email || '-'}</span>
                </div>

                <div className="p-3 bg-zinc-50  rounded-lg border border-zinc-200 ">
                  <span className="text-zinc-400 block font-medium">Total Staff Enrolled</span>
                  <span className="font-bold text-zinc-900  text-lg mt-0.5 block">
                    {selectedTenant.total_employees || 0}
                  </span>
                  <span className="text-zinc-500 block mt-0.5">
                    {selectedTenant.active_employees || selectedTenant.total_employees || 0} active in organization
                  </span>
                </div>

                <div className="p-3 bg-zinc-50  rounded-lg border border-zinc-200 ">
                  <span className="text-zinc-400 block font-medium">Location &amp; Currency</span>
                  <span className="font-semibold text-zinc-800  mt-0.5 block">
                    {selectedTenant.city || '-'}, {selectedTenant.country || 'India'}
                  </span>
                  <span className="text-zinc-500 block mt-0.5">Currency: {selectedTenant.currency || 'INR'}</span>
                </div>

                <div className="p-3 bg-zinc-50  rounded-lg border border-zinc-200 ">
                  <span className="text-zinc-400 block font-medium">Registered On</span>
                  <span className="font-semibold text-zinc-800  mt-0.5 block">
                    {formatDate(selectedTenant.created_at)}
                  </span>
                  <span className="text-zinc-500 block mt-0.5">Tenant ID: {selectedTenant.id?.substring(0, 8)}...</span>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-zinc-200  bg-zinc-50  flex items-center justify-between">
              {isSuperAdmin && (
                <Button
                  variant={selectedTenant.is_active !== false ? 'outline' : 'primary'}
                  size="sm"
                  onClick={() => {
                    handleToggleTenant(selectedTenant.id);
                    setSelectedTenant(null);
                  }}
                >
                  <Power className="w-3.5 h-3.5 mr-1.5" />
                  <span>{selectedTenant.is_active !== false ? 'Suspend Organization' : 'Activate Organization'}</span>
                </Button>
              )}
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setSelectedTenant(null)}
                className="ml-auto"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
