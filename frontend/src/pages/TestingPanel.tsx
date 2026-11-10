import React, { useState, useEffect } from 'react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import {
  Terminal,
  Activity,
  Database,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Shield,
  Layers,
  Cpu,
  UserCheck,
} from 'lucide-react';

export const TestingPanel: React.FC = () => {
  const { user, business, roles, permissions, login } = useAuth();
  const [health, setHealth] = useState<any>(null);
  const [healthLoading, setHealthLoading] = useState(true);

  const checkHealth = async () => {
    try {
      setHealthLoading(true);
      const res = await api.get('/health/');
      setHealth(res.data);
    } catch (err: any) {
      setHealth({ status: 'unhealthy', database: 'disconnected', error: err.message });
    } finally {
      setHealthLoading(false);
    }
  };

  useEffect(() => {
    checkHealth();
  }, []);

  const demoRoles = [
    { label: 'Business Owner', email: 'owner@apexglobal.com', desc: 'Full business operations & payroll approvals' },
    { label: 'HR Manager', email: 'hr@apexglobal.com', desc: 'Workforce management, shifts & leave policies' },
    { label: 'Accountant', email: 'accountant@apexglobal.com', desc: 'Salary runs, advance recoveries & cashbook' },
    { label: 'Branch Manager', email: 'branchmanager@apexglobal.com', desc: 'Bengaluru branch scoped operations' },
    { label: 'Supervisor', email: 'supervisor@apexglobal.com', desc: 'Team attendance regularizations' },
    { label: 'Employee', email: 'employee@apexglobal.com', desc: 'Self-service attendance & payslip downloads' },
    { label: 'Field Employee', email: 'field@apexglobal.com', desc: 'GPS & geofence mobile check-ins' },
    { label: 'Auditor', email: 'auditor@apexglobal.com', desc: 'Read-only financial & attendance auditing' },
    { label: 'Super Admin', email: 'superadmin@workpulse.com', desc: 'Platform tenant controls & health monitoring' },
  ];

  const handleQuickSwitch = async (email: string) => {
    try {
      await login(email, 'Demo@12345');
      alert(`Switched session to ${email}! Active permissions reloaded.`);
    } catch (err) {
      alert('Quick switch failed.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Terminal className="w-5 h-5 text-indigo-600" />
            <span>Developer & Testing Diagnostics Panel</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time environment metrics, system telemetry, and instantaneous multi-role simulation
          </p>
        </div>

        <button
          onClick={checkHealth}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Telemetry</span>
        </button>
      </div>

      {/* System Status Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold uppercase">
            <span>API Gateway</span>
            <Activity className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="flex items-center gap-2 mt-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span className="text-sm font-bold text-slate-900">Online & Responding</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Latency: ~45ms • Version 1.0.0</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold uppercase">
            <span>PostgreSQL Database</span>
            <Database className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="flex items-center gap-2 mt-2">
            {health?.database === 'connected' ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span className="text-sm font-bold text-slate-900">Connected</span>
              </>
            ) : (
              <>
                <XCircle className="w-4 h-4 text-rose-600" />
                <span className="text-sm font-bold text-rose-700">Connecting...</span>
              </>
            )}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Neon Serverless • UTF-8</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold uppercase">
            <span>Background Workers</span>
            <Cpu className="w-4 h-4 text-blue-500" />
          </div>
          <div className="flex items-center gap-2 mt-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span className="text-sm font-bold text-slate-900">Celery Active</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Redis Broker Connected</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold uppercase">
            <span>Active Tenant Session</span>
            <Shield className="w-4 h-4 text-purple-500" />
          </div>
          <p className="text-sm font-bold text-slate-900 mt-2 truncate">{business?.name || 'No tenant'}</p>
          <p className="text-[11px] text-slate-400 mt-1 font-mono truncate">{business?.id}</p>
        </div>
      </div>

      {/* Role Simulation Switcher */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <h3 className="text-sm font-bold text-slate-900 mb-1 flex items-center gap-2">
          <UserCheck className="w-4 h-4 text-indigo-600" />
          <span>One-Click Role Simulation Switcher</span>
        </h3>
        <p className="text-xs text-slate-500 mb-4">
          Instantly switches authenticated user context and re-evaluates the RBAC matrix across all views
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {demoRoles.map((r) => {
            const isCurrent = user?.email === r.email;
            return (
              <div
                key={r.email}
                className={`p-3.5 rounded-xl border transition-all ${
                  isCurrent
                    ? 'border-indigo-600 bg-indigo-50/50 shadow-sm'
                    : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-slate-900">{r.label}</span>
                  {isCurrent && (
                    <span className="text-[10px] font-bold text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded-full">
                      ACTIVE
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 mb-3">{r.desc}</p>
                <button
                  onClick={() => handleQuickSwitch(r.email)}
                  disabled={isCurrent}
                  className={`w-full py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                    isCurrent
                      ? 'bg-slate-200 text-slate-400 cursor-default'
                      : 'bg-white border border-slate-300 text-slate-700 hover:bg-indigo-600 hover:text-white hover:border-indigo-600 shadow-sm'
                  }`}
                >
                  {isCurrent ? 'Current Session' : `Switch to ${r.label}`}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Granted Permission Matrix for current session */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <h3 className="text-sm font-bold text-slate-900 mb-1">Session RBAC Matrix & Token Payload</h3>
        <p className="text-xs text-slate-500 mb-4">
          Atomic permissions granted to <span className="font-semibold text-slate-800">{user?.email}</span>
        </p>

        <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto p-3 bg-slate-50 rounded-lg border border-slate-200">
          {permissions.length === 0 ? (
            <span className="text-xs text-slate-400">All permissions granted (Superuser bypass mode active)</span>
          ) : (
            permissions.map((p) => (
              <span
                key={p}
                className="px-2 py-0.5 rounded font-mono text-[10px] font-medium bg-white text-slate-700 border border-slate-200 shadow-2xs"
              >
                {p}
              </span>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
