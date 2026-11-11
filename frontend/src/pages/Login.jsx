import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Shield, Sparkles, Building, Lock, Mail, ArrowRight, CheckCircle2 } from 'lucide-react';

export const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Invalid credentials or login failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const setDemoAccount = (demoEmail) => {
    setEmail(demoEmail);
    setPassword('Demo@12345');
  };

  const demoRoles = [
    { label: 'Business Owner', email: 'owner@apexglobal.com', color: 'bg-indigo-50 border-indigo-200 text-indigo-700' },
    { label: 'HR Manager', email: 'hr@apexglobal.com', color: 'bg-emerald-50 border-emerald-200 text-emerald-700' },
    { label: 'Accountant', email: 'accountant@apexglobal.com', color: 'bg-blue-50 border-blue-200 text-blue-700' },
    { label: 'Branch Manager', email: 'branchmanager@apexglobal.com', color: 'bg-amber-50 border-amber-200 text-amber-700' },
    { label: 'Supervisor', email: 'supervisor@apexglobal.com', color: 'bg-orange-50 border-orange-200 text-orange-700' },
    { label: 'Employee', email: 'employee@apexglobal.com', color: 'bg-slate-50 border-slate-200 text-slate-700' },
    { label: 'Field Employee', email: 'field@apexglobal.com', color: 'bg-purple-50 border-purple-200 text-purple-700' },
    { label: 'Auditor', email: 'auditor@apexglobal.com', color: 'bg-rose-50 border-rose-200 text-rose-700' },
    { label: 'Super Admin', email: 'superadmin@workpulse.com', color: 'bg-zinc-800 border-zinc-700 text-zinc-100' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full grid md:grid-cols-2 bg-white rounded-2xl shadow-2xl overflow-hidden">
        {/* Left: Branding & Demo Quick-Login */}
        <div className="bg-slate-900 p-8 text-white flex flex-col justify-between border-r border-slate-800">
          <div>
            <div className="flex items-center gap-2 mb-6">
              <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center font-bold text-xl text-white shadow-lg shadow-indigo-500/40">
                W
              </div>
              <h2 className="text-xl font-bold tracking-tight">WorkPulse</h2>
            </div>

            <h3 className="text-xl font-semibold mb-2">Enterprise SaaS Demonstration</h3>
            <p className="text-slate-400 text-sm mb-6 leading-relaxed">
              Click any role below to prefill demo credentials and test role-based feature permissions:
            </p>

            <div className="grid grid-cols-2 gap-2 mb-6">
              {demoRoles.map((r) => (
                <button
                  key={r.email}
                  type="button"
                  onClick={() => setDemoAccount(r.email)}
                  className={`text-left p-2.5 rounded-lg border text-xs font-semibold transition-all hover:scale-[1.02] flex items-center justify-between ${r.color}`}
                >
                  <span className="truncate">{r.label}</span>
                  <ArrowRight className="w-3.5 h-3.5 opacity-60 flex-shrink-0" />
                </button>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-emerald-400" /> Multi-Tenant PostgreSQL Active
            </span>
            <span className="font-mono text-[10px] bg-slate-800 px-2 py-0.5 rounded text-slate-400">v1.0.0</span>
          </div>
        </div>

        {/* Right: Login Form */}
        <div className="p-8 flex flex-col justify-center">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Sign in to your account</h2>
            <p className="text-sm text-slate-500 mt-1">Enter credentials to authenticate into tenant environment</p>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Work Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold shadow-md shadow-indigo-600/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isLoading ? (
                <span>Authenticating...</span>
              ) : (
                <>
                  <span>Sign In to Dashboard</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <p className="text-center text-xs text-slate-400 mt-6">
            Protected by WorkPulse Multi-Tenant Identity Engine
          </p>
        </div>
      </div>
    </div>
  );
};
