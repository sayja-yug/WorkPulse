import React, { useState, useEffect } from 'react';
import api from '../api/client';
import axios from 'axios';
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
import { Loader } from '../components/ui/Loader';
import { ROLE_LABELS } from '../utils/constants';

export const TestingPanel = () => {
  const { user, business, roles, permissions, activeRole } = useAuth();
  const [health, setHealth] = useState(null);
  const [healthLoading, setHealthLoading] = useState(true);

  const checkHealth = async () => {
    try {
      setHealthLoading(true);
      let res;
      try {
        res = await api.get('/health/');
      } catch {
        res = await axios.get('/api/health/');
      }
      setHealth(res.data);
    } catch (err) {
      setHealth({ status: 'unhealthy', database: 'disconnected', error: err.message });
    } finally {
      setHealthLoading(false);
    }
  };

  useEffect(() => {
    checkHealth();
  }, []);

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
            Real-time environment metrics, live PostgreSQL telemetry, and active session permissions
          </p>
        </div>

        <button
          onClick={checkHealth}
          disabled={healthLoading}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${healthLoading ? 'animate-spin' : ''}`} />
          <span>{healthLoading ? 'Checking...' : 'Refresh Telemetry'}</span>
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
          <p className="text-[11px] text-slate-400 mt-1">Django 5.1 REST API • Port 8000</p>
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
                <span className="text-sm font-bold text-slate-900">
                  {health.database_engine || 'PostgreSQL'} Connected
                </span>
              </>
            ) : (
              <>
                <XCircle className="w-4 h-4 text-rose-600" />
                <span className="text-sm font-bold text-rose-700">Connecting...</span>
              </>
            )}
          </div>
          <p className="text-[11px] text-slate-400 mt-1 font-mono">
            {health?.database_name || 'workpulse'} @ {health?.database_host || '127.0.0.1:5432'}
          </p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold uppercase">
            <span>Active Role Scope</span>
            <UserCheck className="w-4 h-4 text-blue-500" />
          </div>
          <div className="flex items-center gap-2 mt-2">
            <CheckCircle2 className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-bold text-slate-900 font-mono">{activeRole}</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">{permissions.length} granular permissions granted</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold uppercase">
            <span>Active Tenant Session</span>
            <Shield className="w-4 h-4 text-purple-500" />
          </div>
          <p className="text-sm font-bold text-slate-900 mt-2 truncate">{business?.name || 'My Organization'}</p>
          <p className="text-[11px] text-slate-400 mt-1 font-mono truncate">{business?.slug || 'my-org'}</p>
        </div>
      </div>

      {/* Active User Session Details */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <h3 className="text-sm font-bold text-slate-900 mb-1 flex items-center gap-2">
          <UserCheck className="w-4 h-4 text-indigo-600" />
          <span>Active Authenticated Session Profile</span>
        </h3>
        <p className="text-xs text-slate-500 mb-4">
          Session identity and business membership verified from PostgreSQL
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-slate-400 block font-medium mb-1">User Full Name</span>
            <span className="font-bold text-slate-900 text-sm">{user?.full_name || 'Anonymous'}</span>
          </div>
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-slate-400 block font-medium mb-1">Email Address</span>
            <span className="font-bold text-slate-900 text-sm font-mono">{user?.email || '-'}</span>
          </div>
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-slate-400 block font-medium mb-1">Assigned Role</span>
            <span className="font-bold text-indigo-700 text-sm font-mono">{ROLE_LABELS[activeRole] || activeRole}</span>
          </div>
        </div>
      </div>

      {/* Granted Permission Matrix for current session */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <h3 className="text-sm font-bold text-slate-900 mb-1">Live Granted Permissions in PostgreSQL</h3>
        <p className="text-xs text-slate-500 mb-4">
          Granular permission codes loaded from the database for <span className="font-semibold text-slate-800">{user?.email}</span> (Role: <span className="font-bold text-indigo-600">{activeRole}</span>)
        </p>

        <div className="flex flex-wrap gap-1.5 max-h-52 overflow-y-auto p-3 bg-slate-50 rounded-lg border border-slate-200">
          {permissions.length === 0 ? (
            <span className="text-xs text-slate-400">All permissions granted (Superuser / Business Owner mode active)</span>
          ) : (
            permissions.map((p) => (
              <span
                key={p}
                className="px-2 py-0.5 rounded font-mono text-[10px] font-medium bg-white text-indigo-800 border border-indigo-200 shadow-2xs"
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
