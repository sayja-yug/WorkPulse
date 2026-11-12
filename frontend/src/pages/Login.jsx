import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';
import { Shield, Lock, Mail, ArrowRight, Building, CheckCircle2, ShieldCheck } from 'lucide-react';

export const Login = () => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [regStep, setRegStep] = useState('account'); // 'account' | 'verify' | 'business' | 'done'

  // Login / Account state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');

  // Verification state
  const [otpCode, setOtpCode] = useState('123456');

  // Business Setup state
  const [companyName, setCompanyName] = useState('');
  const [companyCity, setCompanyCity] = useState('');
  const [companyCurrency, setCompanyCurrency] = useState('INR');
  const [createdBusinessName, setCreatedBusinessName] = useState('');

  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Invalid email or password.');
    } finally {
      setIsLoading(false);
    }
  };

  // Step 4: Create Account
  const handleCreateAccount = async (e) => {
    e.preventDefault();
    setError('');
    if (password !== passwordConfirm) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }
    setIsLoading(true);
    try {
      const res = await api.post('/auth/register/', {
        first_name: firstName,
        last_name: lastName,
        email,
        phone,
        password,
        password_confirm: passwordConfirm,
        defer_business: true,
      });
      const payload = res.data?.data || res.data;
      const tokens = payload?.tokens || payload;
      if (tokens?.access) {
        localStorage.setItem('access_token', tokens.access);
        localStorage.setItem('refresh_token', tokens.refresh);
      }
      setRegStep('verify');
    } catch (err) {
      const errData = err.response?.data;
      const msg =
        errData?.error?.message ||
        (errData?.email ? errData.email[0] : null) ||
        'Account creation failed. Please check inputs.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  // Step 5-6: Verify Email/Phone -> Continue
  const handleVerifyContinue = async (e) => {
    e.preventDefault();
    setError('');
    if (!otpCode.trim()) {
      setError('Please enter the verification code.');
      return;
    }
    setIsLoading(true);
    try {
      await api.post('/auth/me/verify/', { code: otpCode });
      setRegStep('business');
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Verification failed.');
    } finally {
      setIsLoading(false);
    }
  };

  // Step 7-8: Business Setup -> Create Business
  const handleCreateBusiness = async (e) => {
    e.preventDefault();
    setError('');
    if (!companyName.trim()) {
      setError('Please enter your business name.');
      return;
    }
    setIsLoading(true);
    try {
      const res = await api.post('/businesses/', {
        name: companyName,
        city: companyCity,
        email,
        phone,
        currency: companyCurrency,
      });
      const biz = res.data?.data || res.data;
      if (biz?.id) {
        localStorage.setItem('active_business_id', biz.id);
        sessionStorage.setItem('business_confirmed', 'true');
        setCreatedBusinessName(biz.name || companyName);
      }
      setRegStep('done');
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to create business.');
    } finally {
      setIsLoading(false);
    }
  };

  // Step 9: Go to Dashboard
  const handleGoToDashboard = () => {
    window.location.href = '/';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full grid md:grid-cols-2 bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-800">
        {/* Left: Branding & Enterprise Features */}
        <div className="bg-slate-900 p-8 text-white flex flex-col justify-between border-r border-slate-800">
          <div>
            <div className="flex items-center gap-2 mb-6">
              <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center font-bold text-xl text-white shadow-lg shadow-indigo-500/40">
                W
              </div>
              <div>
                <h2 className="text-xl font-bold tracking-tight">WorkPulse</h2>
                <p className="text-[10px] text-indigo-400 font-semibold uppercase tracking-wider">Enterprise Workforce SaaS</p>
              </div>
            </div>

            <h3 className="text-2xl font-bold mb-3 tracking-tight">
              Modern Workforce, Attendance &amp; Payroll Management
            </h3>
            <p className="text-slate-400 text-xs mb-8 leading-relaxed">
              Real-time multi-tenant platform for businesses with multi-site geofencing, Indian statutory payroll (PF/ESI/TDS), shift scheduling, and cashbook ledgers.
            </p>

            <div className="space-y-3 text-xs text-slate-300">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>Multi-branch geofenced clock-in &amp; selfie attendance</span>
              </div>
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>India statutory payroll calculations with 1-click payslips</span>
              </div>
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>Strict multi-tenant security with PostgreSQL isolation</span>
              </div>
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>Granular Role-Based Access Control (RBAC)</span>
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-emerald-400" /> PostgreSQL Multi-Tenant Connected
            </span>
            <span className="font-mono text-[10px] bg-slate-800 px-2 py-0.5 rounded text-slate-400">v1.0.0</span>
          </div>
        </div>

        {/* Right: Auth Forms (Sign In / Sign Up Wizard) */}
        <div className="p-8 flex flex-col justify-center">
          {/* Form Selector Tabs */}
          <div className="flex items-center border-b border-slate-200 mb-6">
            <button
              type="button"
              onClick={() => { setIsRegistering(false); setError(''); }}
              className={`flex-1 pb-3 text-xs font-bold uppercase tracking-wider transition-colors border-b-2 ${
                !isRegistering
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => { setIsRegistering(true); setRegStep('account'); setError(''); }}
              className={`flex-1 pb-3 text-xs font-bold uppercase tracking-wider transition-colors border-b-2 ${
                isRegistering
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              Sign Up
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
              {error}
            </div>
          )}

          {!isRegistering ? (
            /* Existing User Login */
            <>
              <div className="mb-4">
                <h2 className="text-xl font-bold text-slate-900 tracking-tight">Welcome back</h2>
                <p className="text-xs text-slate-500 mt-0.5">Enter your credentials to access your organization</p>
              </div>
              <form onSubmit={handleLoginSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Work Email Address
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@company.com"
                      className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-600 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-600 outline-none"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-md shadow-indigo-600/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isLoading ? (
                    <span>Authenticating...</span>
                  ) : (
                    <>
                      <span>Login</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            </>
          ) : regStep === 'account' ? (
            /* Step 3-4: New User Registration - Account Creation */
            <>
              <div className="mb-4">
                <span className="text-[10px] font-bold text-indigo-600 uppercase">Step 1 of 3 — Create Account</span>
                <h2 className="text-xl font-bold text-slate-900 tracking-tight">Create Your Account</h2>
                <p className="text-xs text-slate-500 mt-0.5">Enter your personal details to get started</p>
              </div>
              <form onSubmit={handleCreateAccount} className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">First Name *</label>
                    <input
                      type="text"
                      required
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="e.g. Rahul"
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-600 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Last Name *</label>
                    <input
                      type="text"
                      required
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="e.g. Verma"
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-600 outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Email *</label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@company.com"
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-600 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Phone *</label>
                    <input
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+91 98765 43210"
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-600 outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Password *</label>
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Min. 8 characters"
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-600 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Confirm Password *</label>
                    <input
                      type="password"
                      required
                      value={passwordConfirm}
                      onChange={(e) => setPasswordConfirm(e.target.value)}
                      placeholder="Re-type password"
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-600 outline-none"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full mt-2 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <span>{isLoading ? 'Creating Account...' : 'Create Account'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            </>
          ) : regStep === 'verify' ? (
            /* Step 5-6: Verification Screen */
            <>
              <div className="mb-4">
                <span className="text-[10px] font-bold text-indigo-600 uppercase">Step 2 of 3 — Verification</span>
                <h2 className="text-xl font-bold text-slate-900 tracking-tight">Verify Email &amp; Phone</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Confirm verification for <strong>{email}</strong> ({phone})
                </p>
              </div>
              <form onSubmit={handleVerifyContinue} className="space-y-4">
                <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-lg text-xs text-indigo-800 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-indigo-600 flex-shrink-0" />
                  <span>Verification code sent (Default sandbox OTP: <strong className="font-mono">123456</strong>)</span>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Verification Code (OTP)</label>
                  <input
                    type="text"
                    required
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                    placeholder="Enter 6-digit code"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono tracking-widest focus:ring-2 focus:ring-indigo-600 outline-none"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <span>{isLoading ? 'Verifying...' : 'Continue'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            </>
          ) : regStep === 'business' ? (
            /* Step 7-8: Business Setup Form */
            <>
              <div className="mb-4">
                <span className="text-[10px] font-bold text-indigo-600 uppercase">Step 3 of 3 — Business Setup</span>
                <h2 className="text-xl font-bold text-slate-900 tracking-tight">Set Up Your Business</h2>
                <p className="text-xs text-slate-500 mt-0.5">Enter your company details to create your workspace</p>
              </div>
              <form onSubmit={handleCreateBusiness} className="space-y-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Business Name *</label>
                  <div className="relative">
                    <Building className="w-4 h-4 text-slate-400 absolute left-3 top-2 pointer-events-none" />
                    <input
                      type="text"
                      required
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="e.g. Trinetra Technologies Pvt Ltd"
                      className="w-full pl-9 pr-3 py-1.5 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-600 outline-none"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">City</label>
                    <input
                      type="text"
                      value={companyCity}
                      onChange={(e) => setCompanyCity(e.target.value)}
                      placeholder="e.g. Noida"
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-600 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Currency</label>
                    <select
                      value={companyCurrency}
                      onChange={(e) => setCompanyCurrency(e.target.value)}
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white focus:ring-2 focus:ring-indigo-600 outline-none"
                    >
                      <option value="INR">INR (₹)</option>
                      <option value="USD">USD ($)</option>
                    </select>
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full mt-2 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <span>{isLoading ? 'Creating Business...' : 'Create Business'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            </>
          ) : (
            /* Step 9: Business Saved -> Go to Dashboard */
            <div className="text-center space-y-4 py-4">
              <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900">Business Saved!</h2>
                <p className="text-xs text-slate-500 mt-1">
                  <strong>{createdBusinessName}</strong> is ready. You have been provisioned as Business Owner.
                </p>
              </div>
              <button
                type="button"
                onClick={handleGoToDashboard}
                className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-md transition-all flex items-center justify-center gap-2"
              >
                <span>Go to Dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          <p className="text-center text-[11px] text-slate-400 mt-4">
            Protected by WorkPulse Multi-Tenant Identity Engine
          </p>
        </div>
      </div>
    </div>
  );
};
