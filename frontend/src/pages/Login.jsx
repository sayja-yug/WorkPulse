import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';
import {
  Shield,
  Lock,
  Mail,
  ArrowRight,
  Building,
  CheckCircle2,
  ShieldCheck,
  Building2,
  AlertCircle,
  Briefcase,
  Users,
  Eye,
  EyeOff,
  Sparkles,
} from 'lucide-react';

export const Login = () => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [regStep, setRegStep] = useState('account'); // 'account' | 'verify' | 'business' | 'done'

  // Companies list for dropdown
  const [companies, setCompanies] = useState([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState('');
  const [autoDetectedCompany, setAutoDetectedCompany] = useState(null);

  // Login / Account state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');

  // Verification state
  const [otpCode, setOtpCode] = useState('123456');

  // Business Setup state (Owner registration only)
  const [companyName, setCompanyName] = useState('');
  const [companyCity, setCompanyCity] = useState('');
  const [companyCurrency, setCompanyCurrency] = useState('INR');
  const [createdBusinessName, setCreatedBusinessName] = useState('');

  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  // Load registered companies for the login dropdown
  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        const res = await api.get('/businesses/public-list/');
        const list = res.data?.data || [];
        setCompanies(list);
        // Default to first company if available
        if (list.length > 0) {
          setSelectedCompanyId(list[0].id);
        }
      } catch (err) {
        console.error('Failed to load companies for login selector', err);
      }
    };
    fetchCompanies();
  }, []);

  // Auto-detect company when user enters email
  const handleEmailBlur = async () => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) return;

    // If super admin email
    if (cleanEmail === 'superadmin@workpulse.com' || cleanEmail.includes('workpulse.com')) {
      setSelectedCompanyId('PLATFORM_ADMIN');
      setAutoDetectedCompany({ name: 'WorkPulse Platform Governance (Super Admin)' });
      return;
    }

    try {
      const res = await api.post('/businesses/lookup-by-email/', { email: cleanEmail });
      const detected = res.data?.data;
      if (detected && detected.id) {
        setSelectedCompanyId(detected.id);
        setAutoDetectedCompany(detected);
      }
    } catch {
      // Ignore background lookup errors
    }
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!selectedCompanyId) {
      setError('Please select your registered company from the dropdown before signing in.');
      return;
    }

    setIsLoading(true);
    try {
      await login(email, password, selectedCompanyId);
      navigate('/');
    } catch (err) {
      const detail =
        err.response?.data?.detail ||
        err.response?.data?.error?.message ||
        (typeof err.response?.data === 'string' ? err.response?.data : null) ||
        'Authentication failed. Please verify your company selection, email, and password.';
      setError(detail);
    } finally {
      setIsLoading(false);
    }
  };

  // Step 4: Create Account (Owner only)
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
        'Owner account creation failed. Please check inputs.';
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
      setError('Please enter your business organization name.');
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

  const handleGoToDashboard = () => {
    window.location.href = '/';
  };

  // Quick fill helper for testing
  const handleQuickFill = (roleType) => {
    setError('');
    if (roleType === 'OWNER') {
      const trinetra = companies.find((c) => c.slug === 'trinetra') || companies[0];
      if (trinetra) setSelectedCompanyId(trinetra.id);
      setEmail('owner@trinetra.com');
      setPassword('WorkPulse@2026');
    } else if (roleType === 'EMPLOYEE') {
      const trinetra = companies.find((c) => c.slug === 'trinetra') || companies[0];
      if (trinetra) setSelectedCompanyId(trinetra.id);
      setEmail('employee@trinetra.com');
      setPassword('WorkPulse@2026');
    } else if (roleType === 'SUPER_ADMIN') {
      setSelectedCompanyId('PLATFORM_ADMIN');
      setEmail('superadmin@workpulse.com');
      setPassword('WorkPulse@2026');
    }
  };

  const selectedCompanyName =
    selectedCompanyId === 'PLATFORM_ADMIN'
      ? 'Platform Admin'
      : companies.find((c) => c.id === selectedCompanyId)?.name || 'Your Company';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full grid md:grid-cols-2 bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-800">
        {/* Left: Enterprise Workforce Branding */}
        <div className="bg-slate-900 p-8 text-white flex flex-col justify-between border-r border-slate-800">
          <div>
            <div className="flex items-center gap-2 mb-6">
              <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center font-bold text-xl text-white shadow-lg shadow-indigo-500/40">
                W
              </div>
              <div>
                <h2 className="text-xl font-bold tracking-tight">WorkPulse</h2>
                <p className="text-[10px] text-indigo-400 font-semibold uppercase tracking-wider">
                  Enterprise Workforce SaaS
                </p>
              </div>
            </div>

            <h3 className="text-2xl font-bold mb-3 tracking-tight">
              Modern Workforce, Attendance &amp; Payroll Management
            </h3>
            <p className="text-slate-400 text-xs mb-6 leading-relaxed">
              Enterprise multi-tenant platform with multi-site geofencing, Indian statutory payroll (PF/ESI/TDS), shift scheduling, and company isolation.
            </p>

            <div className="space-y-3 text-xs text-slate-300">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>Employees sign in strictly into their registered company</span>
              </div>
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>Sign up is reserved exclusively for Business Owners</span>
              </div>
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>Multi-branch geofenced clock-in &amp; selfie attendance</span>
              </div>
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>Strict tenant isolation with PostgreSQL database security</span>
              </div>
            </div>

            {/* Registered Companies badge */}
            <div className="mt-6 p-3 rounded-xl bg-slate-800/80 border border-slate-700/80">
              <div className="flex items-center justify-between text-[11px] text-slate-300">
                <span className="flex items-center gap-1.5 font-semibold">
                  <Building2 className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Registered Platform Tenants:</span>
                </span>
                <span className="font-bold text-emerald-400 font-mono">{companies.length} Companies</span>
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-emerald-400" /> PostgreSQL Multi-Tenant Protected
            </span>
            <span className="font-mono text-[10px] bg-slate-800 px-2 py-0.5 rounded text-slate-400">v1.0.0</span>
          </div>
        </div>

        {/* Right: Auth Forms */}
        <div className="p-8 flex flex-col justify-center">
          {/* Form Selector Tabs */}
          <div className="flex items-center border-b border-slate-200 mb-6">
            <button
              type="button"
              onClick={() => {
                setIsRegistering(false);
                setError('');
              }}
              className={`flex-1 pb-3 text-xs font-bold uppercase tracking-wider transition-colors border-b-2 flex items-center justify-center gap-1.5 ${
                !isRegistering
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Sign In</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setIsRegistering(true);
                setRegStep('account');
                setError('');
              }}
              className={`flex-1 pb-3 text-xs font-bold uppercase tracking-wider transition-colors border-b-2 flex items-center justify-center gap-1.5 ${
                isRegistering
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              <Briefcase className="w-3.5 h-3.5" />
              <span>Register as Owner</span>
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">{error}</div>
            </div>
          )}

          {!isRegistering ? (
            /* Sign In: Employee & Owner Multi-Tenant Flow */
            <>
              <div className="mb-4">
                <div className="flex items-center gap-1.5">
                  <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded text-[10px] font-bold uppercase tracking-wider">
                    Portal Authentication
                  </span>
                </div>
                <h2 className="text-xl font-bold text-slate-900 tracking-tight mt-1">Sign In to Your Workspace</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Select your company and enter your credentials to access your dashboard.
                </p>
              </div>

              <form onSubmit={handleLoginSubmit} className="space-y-3.5">
                {/* Company Dropdown Selection */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Company / Organization *
                  </label>
                  <div className="relative">
                    <Building className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                    <select
                      value={selectedCompanyId}
                      onChange={(e) => {
                        setSelectedCompanyId(e.target.value);
                        setAutoDetectedCompany(null);
                        setError('');
                      }}
                      required
                      className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-xs bg-white text-slate-900 font-medium focus:ring-2 focus:ring-indigo-600 outline-none"
                    >
                      <option value="" disabled>
                        -- Select Your Registered Company --
                      </option>
                      <optgroup label="Registered Businesses">
                        {companies.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name} {c.city ? `(${c.city})` : ''}
                          </option>
                        ))}
                      </optgroup>
                      <optgroup label="Platform Administration">
                        <option value="PLATFORM_ADMIN">
                          WorkPulse Global (Platform / Super Admin)
                        </option>
                      </optgroup>
                    </select>
                  </div>
                  {autoDetectedCompany && (
                    <p className="text-[11px] text-emerald-600 font-medium mt-1 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Auto-detected: {autoDetectedCompany.name}</span>
                    </p>
                  )}
                  <p className="text-[10px] text-slate-400 mt-1">
                    * Employees can only log into their registered organization.
                  </p>
                </div>

                {/* Email Address */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Registered Work Email *
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      onBlur={handleEmailBlur}
                      placeholder="e.g. employee@trinetra.com"
                      className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-600 outline-none"
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Password *
                    </label>
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full pl-9 pr-9 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-600 outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full mt-2 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-md shadow-indigo-600/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isLoading ? (
                    <span>Verifying Company &amp; Credentials...</span>
                  ) : (
                    <>
                      <span>Sign In to {selectedCompanyName}</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

              {/* Demo quick credential helper */}
              <div className="mt-4 pt-4 border-t border-slate-100">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1.5">
                  Demo Quick-Fill Accounts:
                </span>
                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleQuickFill('EMPLOYEE')}
                    className="px-2 py-1 bg-slate-50 hover:bg-indigo-50 hover:text-indigo-700 border border-slate-200 rounded text-[11px] font-semibold text-slate-600 transition-colors"
                  >
                    Employee
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickFill('OWNER')}
                    className="px-2 py-1 bg-slate-50 hover:bg-indigo-50 hover:text-indigo-700 border border-slate-200 rounded text-[11px] font-semibold text-slate-600 transition-colors"
                  >
                    Business Owner
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickFill('SUPER_ADMIN')}
                    className="px-2 py-1 bg-slate-50 hover:bg-rose-50 hover:text-rose-700 border border-slate-200 rounded text-[11px] font-semibold text-slate-600 transition-colors"
                  >
                    Super Admin
                  </button>
                </div>
              </div>
            </>
          ) : regStep === 'account' ? (
            /* Owner Registration Step 1 */
            <>
              <div className="mb-4">
                <div className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 text-amber-800 border border-amber-200 rounded text-[10px] font-bold uppercase tracking-wider mb-2">
                  <Briefcase className="w-3 h-3" />
                  <span>Business Owners &amp; Employers Only</span>
                </div>
                <h2 className="text-xl font-bold text-slate-900 tracking-tight">Register Your Business</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Create your administrator account and setup your company workspace.
                </p>
              </div>

              {/* Notice for Employees */}
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-[11px] text-blue-800 mb-3 leading-relaxed">
                <strong>Notice for Employees:</strong> Employees do not need to register here. Your account is provisioned by your company HR/Owner. Switch to the{' '}
                <button
                  type="button"
                  onClick={() => setIsRegistering(false)}
                  className="font-bold underline text-blue-900 hover:text-indigo-700"
                >
                  Sign In
                </button>{' '}
                tab to access your company portal.
              </div>

              <form onSubmit={handleCreateAccount} className="space-y-2.5">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Owner First Name *</label>
                    <input
                      type="text"
                      required
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="e.g. Vikram"
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
                      placeholder="e.g. Aditya"
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-600 outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Work Email *</label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="owner@mycompany.com"
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-600 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Phone Number *</label>
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
                  <span>{isLoading ? 'Creating Owner Account...' : 'Continue to Verification'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            </>
          ) : regStep === 'verify' ? (
            /* Owner Registration Step 2 - Verification */
            <>
              <div className="mb-4">
                <span className="text-[10px] font-bold text-indigo-600 uppercase">Step 2 of 3 — Verification</span>
                <h2 className="text-xl font-bold text-slate-900 tracking-tight">Verify Owner Credentials</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Confirm verification for <strong>{email}</strong> ({phone})
                </p>
              </div>
              <form onSubmit={handleVerifyContinue} className="space-y-4">
                <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-lg text-xs text-indigo-800 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-indigo-600 flex-shrink-0" />
                  <span>Sandbox verification OTP: <strong className="font-mono">123456</strong></span>
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
                  <span>{isLoading ? 'Verifying...' : 'Set Up Business Organization'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            </>
          ) : regStep === 'business' ? (
            /* Owner Registration Step 3 - Business Details */
            <>
              <div className="mb-4">
                <span className="text-[10px] font-bold text-indigo-600 uppercase">Step 3 of 3 — Company Setup</span>
                <h2 className="text-xl font-bold text-slate-900 tracking-tight">Set Up Your Company</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Enter your company organization details to launch your workspace.
                </p>
              </div>
              <form onSubmit={handleCreateBusiness} className="space-y-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Registered Business Name *</label>
                  <div className="relative">
                    <Building className="w-4 h-4 text-slate-400 absolute left-3 top-2 pointer-events-none" />
                    <input
                      type="text"
                      required
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="e.g. Acme Corp Technologies Ltd"
                      className="w-full pl-9 pr-3 py-1.5 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-600 outline-none"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Headquarters City</label>
                    <input
                      type="text"
                      value={companyCity}
                      onChange={(e) => setCompanyCity(e.target.value)}
                      placeholder="e.g. Mumbai"
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-600 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Operating Currency</label>
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
                  <span>{isLoading ? 'Creating Business...' : 'Launch Business Workspace'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            </>
          ) : (
            /* Registration Done */
            <div className="text-center space-y-4 py-4">
              <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900">Organization Created!</h2>
                <p className="text-xs text-slate-500 mt-1">
                  <strong>{createdBusinessName}</strong> is ready. You are provisioned as Business Owner with full platform access.
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
