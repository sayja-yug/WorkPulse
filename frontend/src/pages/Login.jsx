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
  MapPin,
} from 'lucide-react';

const DEMO_ACCOUNTS = [
  {
    id: 'owner',
    category: 'management',
    roleName: 'Business Owner',
    icon: '👑',
    name: 'Vikram Aditya',
    email: 'owner@trinetra.com',
    companyKey: 'trinetra',
    branchName: 'All Branches (Company-Wide)',
    branchCode: 'HQ / BLR / MUM',
    desc: 'Full org control, all 3 branches, settings & financials',
  },
  {
    id: 'hr',
    category: 'management',
    roleName: 'HR Manager',
    icon: '💼',
    name: 'Pooja Sharma',
    email: 'hr@trinetra.com',
    companyKey: 'trinetra',
    branchName: 'Corporate Campus (HQ Noida)',
    branchCode: 'HQ Noida',
    desc: 'Org-wide HR, employee directory, leaves & policies',
  },
  {
    id: 'bm_blr',
    category: 'branch',
    roleName: 'Branch Manager (BLR)',
    icon: '🏢',
    name: 'Rahul Verma',
    email: 'branchmanager@trinetra.com',
    companyKey: 'trinetra',
    branchName: 'Innovation Center (Bengaluru)',
    branchCode: 'Bengaluru Hub',
    desc: 'Scoped to Bengaluru branch employees, shifts & local ops',
  },
  {
    id: 'bm_mum',
    category: 'branch',
    roleName: 'Branch Manager (MUM)',
    icon: '🏢',
    name: 'Kunal Shah',
    email: 'bm.mumbai@trinetra.com',
    companyKey: 'trinetra',
    branchName: 'Western Hub (Mumbai BKC)',
    branchCode: 'Mumbai Hub',
    desc: 'Scoped to Mumbai branch team, attendance & roster ops',
  },
  {
    id: 'accountant',
    category: 'management',
    roleName: 'Accountant',
    icon: '💰',
    name: 'Amit Singhal',
    email: 'accountant@trinetra.com',
    companyKey: 'trinetra',
    branchName: 'Corporate Campus (Finance Dept)',
    branchCode: 'Finance HQ',
    desc: 'Payroll runs, salary structures, cashbook & advances',
  },
  {
    id: 'supervisor',
    category: 'staff',
    roleName: 'Shift Supervisor',
    icon: '📋',
    name: 'Suresh Nair',
    email: 'supervisor@trinetra.com',
    companyKey: 'trinetra',
    branchName: 'Western Hub (Operations)',
    branchCode: 'Mumbai Hub',
    desc: 'Daily shift roster, team approvals & check-ins',
  },
  {
    id: 'employee',
    category: 'staff',
    roleName: 'Employee (HQ)',
    icon: '👤',
    name: 'Ananya Patel',
    email: 'employee@trinetra.com',
    companyKey: 'trinetra',
    branchName: 'Corporate Campus (Noida HQ)',
    branchCode: 'HQ Noida',
    desc: 'Self-service portal, check-in punch, leaves & payslips',
  },
  {
    id: 'field',
    category: 'staff',
    roleName: 'Field Staff (Sales)',
    icon: '📍',
    name: 'Rajesh Kumar',
    email: 'field@trinetra.com',
    companyKey: 'trinetra',
    branchName: 'Western Hub (Enterprise Sales)',
    branchCode: 'Mumbai Hub',
    desc: 'Field punch, client visits, GPS tracking & expense claims',
  },
  {
    id: 'superadmin',
    category: 'platform',
    roleName: 'Super Admin',
    icon: '🛡️',
    name: 'Alexander Pierce',
    email: 'superadmin@workpulse.com',
    companyId: 'PLATFORM_ADMIN',
    branchName: 'WorkPulse Platform Governance',
    branchCode: 'SaaS Platform',
    desc: 'Platform master admin, tenant accounts & subscriptions',
  },
  {
    id: 'apex_emp',
    category: 'platform',
    roleName: 'Apex Global Employee',
    icon: '🌐',
    name: 'Ananya Patel (Apex)',
    email: 'employee@apexglobal.com',
    companyKey: 'apex',
    branchName: 'Apex Global R&D Hub',
    branchCode: 'Separate Tenant',
    desc: 'Test multi-tenant isolation in a completely separate business',
  },
];

export const Login = () => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [regStep, setRegStep] = useState('account'); // 'account' | 'verify' | 'business' | 'done'

  // Companies list for dropdown
  const [companies, setCompanies] = useState([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState('');
  const [autoDetectedCompany, setAutoDetectedCompany] = useState(null);

  // Demo account quick selector
  const [selectedDemoAcc, setSelectedDemoAcc] = useState(null);
  const [demoCategory, setDemoCategory] = useState('all');

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
      setError('Please select your registered company.');
      return;
    }

    setIsLoading(true);
    try {
      const payload = {
        email: email.trim().toLowerCase(),
        password,
      };

      if (selectedCompanyId !== 'PLATFORM_ADMIN') {
        payload.business_id = selectedCompanyId;
      }

      await login(payload);
      navigate('/');
    } catch (err) {
      console.error('Login Error:', err);
      const serverErr =
        err.response?.data?.error?.message ||
        err.response?.data?.detail ||
        err.response?.data?.message ||
        'Authentication failed. Verify credentials and selected organization.';
      setError(serverErr);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateAccount = async (e) => {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }
    if (password !== passwordConfirm) {
      setError('Passwords do not match.');
      return;
    }

    setIsLoading(true);
    try {
      await api.post('/auth/register/', {
        email: email.trim().toLowerCase(),
        password,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        phone: phone.trim(),
      });
      setRegStep('verify');
    } catch (err) {
      const serverErr =
        err.response?.data?.error?.message ||
        err.response?.data?.email?.[0] ||
        err.response?.data?.detail ||
        'Registration failed. Please check your details.';
      setError(serverErr);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyContinue = (e) => {
    e.preventDefault();
    if (otpCode !== '123456') {
      setError('Invalid OTP code. For demo/sandbox use: 123456');
      return;
    }
    setError('');
    setRegStep('business');
  };

  const handleCreateBusiness = async (e) => {
    e.preventDefault();
    setError('');

    if (!companyName.trim()) {
      setError('Company name is required.');
      return;
    }

    setIsLoading(true);
    try {
      const registerRes = await api.post('/auth/register/owner/', {
        email: email.trim().toLowerCase(),
        password,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        phone: phone.trim(),
        company_name: companyName.trim(),
        city: companyCity.trim(),
        currency: companyCurrency,
      });

      const registeredBiz = registerRes.data?.data?.business || { name: companyName };
      setCreatedBusinessName(registeredBiz.name);

      await login({
        email: email.trim().toLowerCase(),
        password,
        business_id: registeredBiz.id,
      });

      setRegStep('done');
    } catch (err) {
      const serverErr =
        err.response?.data?.error?.message ||
        err.response?.data?.detail ||
        'Failed to set up company organization. Please try again.';
      setError(serverErr);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoToDashboard = () => {
    navigate('/');
  };

  const handleQuickFill = (acc) => {
    setError('');
    setSelectedDemoAcc(acc);

    if (acc.companyId === 'PLATFORM_ADMIN') {
      setSelectedCompanyId('PLATFORM_ADMIN');
      setAutoDetectedCompany({ name: 'WorkPulse Platform Governance (Super Admin)' });
    } else {
      const targetCompany = companies.find((c) =>
        c.name.toLowerCase().includes(acc.companyKey === 'apex' ? 'apex' : 'trinetra')
      );
      if (targetCompany) {
        setSelectedCompanyId(targetCompany.id);
        setAutoDetectedCompany(targetCompany);
      }
    }

    setEmail(acc.email);
    setPassword('WorkPulse@2026');
  };

  const selectedCompanyName =
    selectedCompanyId === 'PLATFORM_ADMIN'
      ? 'Platform Admin'
      : companies.find((c) => c.id === selectedCompanyId)?.name || 'Your Company';

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-3 sm:p-6 relative select-none">
      <div className="max-w-4xl w-full grid md:grid-cols-2 bg-white rounded-2xl shadow-modal overflow-hidden border border-zinc-800 transition-colors">
        {/* Left: Enterprise Workforce Branding */}
        <div className="bg-black p-6 sm:p-8 text-white flex flex-col justify-between border-b md:border-b-0 md:border-r border-zinc-800">
          <div>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-white text-zinc-950 flex items-center justify-center font-black text-xl shadow-xs">
                W
              </div>
              <div>
                <h2 className="text-xl font-bold tracking-tight text-white">WorkPulse</h2>
                <p className="text-[10px] text-zinc-400 font-semibold uppercase tracking-wider">
                  Enterprise Workforce SaaS
                </p>
              </div>
            </div>

            <h3 className="text-xl sm:text-2xl font-bold mb-3 tracking-tight text-white leading-tight">
              Modern Workforce, Attendance &amp; Payroll Management
            </h3>
            <p className="text-zinc-400 text-xs mb-6 leading-relaxed">
              Enterprise multi-tenant platform with multi-site geofencing, Indian statutory payroll (PF/ESI/TDS), shift scheduling, and company isolation.
            </p>

            <div className="space-y-3 text-xs text-zinc-300">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-white shrink-0" />
                <span>Employees sign in strictly into their registered company</span>
              </div>
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-white shrink-0" />
                <span>Sign up is reserved exclusively for Business Owners</span>
              </div>
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-white shrink-0" />
                <span>Multi-branch geofenced clock-in &amp; selfie attendance</span>
              </div>
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-white shrink-0" />
                <span>Strict tenant isolation with PostgreSQL database security</span>
              </div>
            </div>

            {/* Registered Companies badge */}
            <div className="mt-6 p-3 rounded-xl bg-zinc-900/90 border border-zinc-800">
              <div className="flex items-center justify-between text-[11px] text-zinc-300">
                <span className="flex items-center gap-1.5 font-semibold">
                  <Building2 className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Registered Platform Tenants:</span>
                </span>
                <span className="font-bold text-white font-mono">{companies.length} Companies</span>
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-zinc-800 flex items-center justify-between text-xs text-zinc-400 mt-6 md:mt-0">
            <span className="flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-white" /> PostgreSQL Multi-Tenant Protected
            </span>
            <span className="font-mono text-[10px] bg-zinc-900 px-2 py-0.5 rounded text-zinc-400">v1.0.0</span>
          </div>
        </div>

        {/* Right: Auth Forms */}
        <div className="p-6 sm:p-8 flex flex-col justify-center bg-white text-zinc-900 transition-colors max-h-[92vh] overflow-y-auto">
          {/* Form Selector Tabs */}
          <div className="flex items-center border-b border-zinc-200 mb-6">
            <button
              type="button"
              onClick={() => {
                setIsRegistering(false);
                setError('');
              }}
              className={`flex-1 pb-3 text-xs font-bold uppercase tracking-wider transition-colors border-b-2 flex items-center justify-center gap-1.5 cursor-pointer ${
                !isRegistering
                  ? 'border-zinc-950 text-zinc-950'
                  : 'border-transparent text-zinc-400 hover:text-zinc-600'
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
              className={`flex-1 pb-3 text-xs font-bold uppercase tracking-wider transition-colors border-b-2 flex items-center justify-center gap-1.5 cursor-pointer ${
                isRegistering
                  ? 'border-zinc-950 text-zinc-950'
                  : 'border-transparent text-zinc-400 hover:text-zinc-600'
              }`}
            >
              <Briefcase className="w-3.5 h-3.5" />
              <span>Register as Owner</span>
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-zinc-100 border border-zinc-300 text-zinc-900 text-xs font-semibold flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-zinc-900 shrink-0 mt-0.5" />
              <div className="flex-1">{error}</div>
            </div>
          )}

          {!isRegistering ? (
            /* Sign In: Employee & Owner Multi-Tenant Flow */
            <>
              <div className="mb-4">
                <div className="flex items-center gap-1.5">
                  <span className="px-2 py-0.5 bg-zinc-100 text-zinc-800 border border-zinc-200 rounded text-[10px] font-bold uppercase tracking-wider">
                    Portal Authentication
                  </span>
                </div>
                <h2 className="text-xl font-bold text-zinc-950 tracking-tight mt-1">Sign In to Your Workspace</h2>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Select your company and enter your credentials to access your dashboard.
                </p>
              </div>

              <form onSubmit={handleLoginSubmit} className="space-y-3.5">
                {/* Company Dropdown Selection */}
                <div>
                  <label className="block text-xs font-bold text-zinc-800 uppercase tracking-wider mb-1.5">
                    Company / Organization *
                  </label>
                  <div className="relative">
                    <Building className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5 pointer-events-none" />
                    <select
                      value={selectedCompanyId}
                      onChange={(e) => {
                        setSelectedCompanyId(e.target.value);
                        setAutoDetectedCompany(null);
                        setError('');
                      }}
                      required
                      className="w-full pl-9 pr-3 py-2 border border-zinc-300 rounded-lg text-base sm:text-xs bg-white text-zinc-900 font-medium focus:ring-1 focus:ring-zinc-950 outline-none"
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
                    <p className="text-[11px] text-zinc-700 font-medium mt-1 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Auto-detected: {autoDetectedCompany.name}</span>
                    </p>
                  )}
                  <p className="text-[10px] text-zinc-500 mt-1">
                    * Employees can only log into their registered organization.
                  </p>
                </div>

                {/* Email Address */}
                <div>
                  <label className="block text-xs font-bold text-zinc-800 uppercase tracking-wider mb-1.5">
                    Registered Work Email *
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5 pointer-events-none" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      onBlur={handleEmailBlur}
                      placeholder="e.g. employee@trinetra.com"
                      className="w-full pl-9 pr-3 py-2 border border-zinc-300 bg-white text-zinc-900 rounded-lg text-base sm:text-xs focus:ring-1 focus:ring-zinc-950 outline-none"
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-zinc-800 uppercase tracking-wider">
                      Password *
                    </label>
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5 pointer-events-none" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full pl-9 pr-9 py-2 border border-zinc-300 bg-white text-zinc-900 rounded-lg text-base sm:text-xs focus:ring-1 focus:ring-zinc-950 outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-2.5 text-zinc-400 hover:text-zinc-600 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Selected demo account preview pill */}
                {selectedDemoAcc && (
                  <div className="mt-2 p-2 rounded-lg bg-zinc-50 border border-zinc-200 text-[11px] text-zinc-800 flex items-center justify-between">
                    <div className="flex items-center gap-1.5 truncate">
                      <span className="text-sm shrink-0">{selectedDemoAcc.icon}</span>
                      <span className="truncate">
                        <strong>{selectedDemoAcc.roleName}:</strong> {selectedDemoAcc.name} &bull;{' '}
                        <span className="text-zinc-500">{selectedDemoAcc.branchName}</span>
                      </span>
                    </div>
                    <span className="text-[9px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded shrink-0">
                      Auto-Filled
                    </span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full mt-2.5 py-2.5 px-4 bg-zinc-950 hover:bg-zinc-800 text-white rounded-lg text-xs font-bold shadow-xs transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
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
              <div className="mt-4 pt-3 border-t border-zinc-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] uppercase font-bold text-zinc-900 tracking-wider flex items-center gap-1">
                    <span>⚡ Demo Accounts by Role &amp; Branch</span>
                  </span>
                  <span className="text-[10px] text-zinc-500 font-medium">Click any to test role &amp; branch view</span>
                </div>

                {/* Filter category pills */}
                <div className="flex items-center gap-1 mb-2 overflow-x-auto pb-1 text-[10px]">
                  {[
                    { id: 'all', label: `All Roles (${DEMO_ACCOUNTS.length})` },
                    { id: 'management', label: 'HQ & Leaders' },
                    { id: 'branch', label: 'Branch Managers' },
                    { id: 'staff', label: 'Staff & Field' },
                    { id: 'platform', label: 'Other Tenants' },
                  ].map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setDemoCategory(cat.id)}
                      className={`px-2 py-0.5 rounded-md font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                        demoCategory === cat.id
                          ? 'bg-zinc-950 text-white'
                          : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>

                {/* Grid of demo quick accounts */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-[220px] overflow-y-auto pr-1">
                  {DEMO_ACCOUNTS.filter(
                    (acc) => demoCategory === 'all' || acc.category === demoCategory
                  ).map((acc) => {
                    const isSelected = email === acc.email;
                    return (
                      <button
                        key={acc.id}
                        type="button"
                        onClick={() => handleQuickFill(acc)}
                        className={`p-2 rounded-lg border text-left transition-all cursor-pointer flex flex-col justify-between ${
                          isSelected
                            ? 'bg-zinc-950 text-white border-zinc-950 shadow-xs ring-1 ring-zinc-950'
                            : 'bg-zinc-50 hover:bg-zinc-100 text-zinc-900 border-zinc-200'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1 w-full">
                          <span className="font-bold text-[11px] truncate flex items-center gap-1">
                            <span>{acc.icon}</span>
                            <span>{acc.roleName}</span>
                          </span>
                          <span
                            className={`text-[9px] px-1.5 py-0.2 rounded font-mono font-medium shrink-0 ${
                              isSelected
                                ? 'bg-zinc-800 text-zinc-200'
                                : 'bg-zinc-200 text-zinc-700'
                            }`}
                          >
                            {acc.branchCode}
                          </span>
                        </div>
                        <div className="mt-1">
                          <p className={`text-[10px] font-semibold truncate ${isSelected ? 'text-zinc-200' : 'text-zinc-800'}`}>
                            {acc.name}
                          </p>
                          <p className={`text-[9px] font-mono truncate ${isSelected ? 'text-zinc-400' : 'text-zinc-500'}`}>
                            {acc.email}
                          </p>
                        </div>
                        <p
                          className={`text-[9px] mt-1 pt-1 border-t truncate ${
                            isSelected ? 'border-zinc-800 text-zinc-300' : 'border-zinc-200 text-zinc-500'
                          }`}
                        >
                          📍 {acc.branchName}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          ) : regStep === 'account' ? (
            /* Owner Registration Step 1 */
            <>
              <div className="mb-4">
                <div className="inline-flex items-center gap-1 px-2 py-0.5 bg-zinc-100 text-zinc-800 border border-zinc-200 rounded text-[10px] font-bold uppercase tracking-wider mb-2">
                  <Briefcase className="w-3 h-3" />
                  <span>Business Owners &amp; Employers Only</span>
                </div>
                <h2 className="text-xl font-bold text-zinc-950 tracking-tight">Register Your Business</h2>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Create your administrator account and setup your company workspace.
                </p>
              </div>

              {/* Notice for Employees */}
              <div className="p-3 bg-zinc-100 border border-zinc-200 rounded-lg text-[11px] text-zinc-700 mb-3 leading-relaxed">
                <strong>Notice for Employees:</strong> Employees do not need to register here. Your account is provisioned by your company HR/Owner. Switch to the{' '}
                <button
                  type="button"
                  onClick={() => setIsRegistering(false)}
                  className="font-bold underline text-zinc-950 cursor-pointer"
                >
                  Sign In
                </button>{' '}
                tab to access your company portal.
              </div>

              <form onSubmit={handleCreateAccount} className="space-y-2.5">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-bold text-zinc-700 mb-1">Owner First Name *</label>
                    <input
                      type="text"
                      required
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="e.g. Vikram"
                      className="w-full px-3 py-1.5 border border-zinc-300 bg-white text-zinc-900 rounded-lg text-base sm:text-xs focus:ring-1 focus:ring-zinc-950 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-zinc-700 mb-1">Last Name *</label>
                    <input
                      type="text"
                      required
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="e.g. Aditya"
                      className="w-full px-3 py-1.5 border border-zinc-300 bg-white text-zinc-900 rounded-lg text-base sm:text-xs focus:ring-1 focus:ring-zinc-950 outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-bold text-zinc-700 mb-1">Work Email *</label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="owner@mycompany.com"
                      className="w-full px-3 py-1.5 border border-zinc-300 bg-white text-zinc-900 rounded-lg text-base sm:text-xs focus:ring-1 focus:ring-zinc-950 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-zinc-700 mb-1">Phone Number *</label>
                    <input
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+91 98765 43210"
                      className="w-full px-3 py-1.5 border border-zinc-300 bg-white text-zinc-900 rounded-lg text-base sm:text-xs focus:ring-1 focus:ring-zinc-950 outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-bold text-zinc-700 mb-1">Password *</label>
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Min. 8 characters"
                      className="w-full px-3 py-1.5 border border-zinc-300 bg-white text-zinc-900 rounded-lg text-base sm:text-xs focus:ring-1 focus:ring-zinc-950 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-zinc-700 mb-1">Confirm Password *</label>
                    <input
                      type="password"
                      required
                      value={passwordConfirm}
                      onChange={(e) => setPasswordConfirm(e.target.value)}
                      placeholder="Re-type password"
                      className="w-full px-3 py-1.5 border border-zinc-300 bg-white text-zinc-900 rounded-lg text-base sm:text-xs focus:ring-1 focus:ring-zinc-950 outline-none"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full mt-2 py-2.5 px-4 bg-zinc-950 hover:bg-zinc-800 text-white rounded-lg text-xs font-bold shadow-xs transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
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
                <span className="text-[10px] font-bold text-zinc-500 uppercase">Step 2 of 3 — Verification</span>
                <h2 className="text-xl font-bold text-zinc-950 tracking-tight">Verify Owner Credentials</h2>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Confirm verification for <strong>{email}</strong> ({phone})
                </p>
              </div>
              <form onSubmit={handleVerifyContinue} className="space-y-4">
                <div className="p-3 bg-zinc-100 border border-zinc-200 rounded-lg text-xs text-zinc-800 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-zinc-900 shrink-0" />
                  <span>Sandbox verification OTP: <strong className="font-mono">123456</strong></span>
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-800 mb-1">Verification Code (OTP)</label>
                  <input
                    type="text"
                    required
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                    placeholder="Enter 6-digit code"
                    className="w-full px-3 py-2 border border-zinc-300 bg-white text-zinc-900 rounded-lg text-sm font-mono tracking-widest focus:ring-1 focus:ring-zinc-950 outline-none"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-2.5 px-4 bg-zinc-950 hover:bg-zinc-800 text-white rounded-lg text-xs font-bold shadow-xs transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
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
                <span className="text-[10px] font-bold text-zinc-500 uppercase">Step 3 of 3 — Company Setup</span>
                <h2 className="text-xl font-bold text-zinc-950 tracking-tight">Set Up Your Company</h2>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Enter your company organization details to launch your workspace.
                </p>
              </div>
              <form onSubmit={handleCreateBusiness} className="space-y-3">
                <div>
                  <label className="block text-[11px] font-bold text-zinc-800 mb-1">Registered Business Name *</label>
                  <div className="relative">
                    <Building className="w-4 h-4 text-zinc-400 absolute left-3 top-2 pointer-events-none" />
                    <input
                      type="text"
                      required
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="e.g. Acme Corp Technologies Ltd"
                      className="w-full pl-9 pr-3 py-1.5 border border-zinc-300 bg-white text-zinc-900 rounded-lg text-base sm:text-xs focus:ring-1 focus:ring-zinc-950 outline-none"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-bold text-zinc-800 mb-1">Headquarters City</label>
                    <input
                      type="text"
                      value={companyCity}
                      onChange={(e) => setCompanyCity(e.target.value)}
                      placeholder="e.g. Mumbai"
                      className="w-full px-3 py-1.5 border border-zinc-300 bg-white text-zinc-900 rounded-lg text-base sm:text-xs focus:ring-1 focus:ring-zinc-950 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-zinc-800 mb-1">Operating Currency</label>
                    <select
                      value={companyCurrency}
                      onChange={(e) => setCompanyCurrency(e.target.value)}
                      className="w-full px-3 py-1.5 border border-zinc-300 rounded-lg text-base sm:text-xs bg-white text-zinc-900 focus:ring-1 focus:ring-zinc-950 outline-none"
                    >
                      <option value="INR">INR (₹)</option>
                      <option value="USD">USD ($)</option>
                    </select>
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full mt-2 py-2.5 px-4 bg-zinc-950 hover:bg-zinc-800 text-white rounded-lg text-xs font-bold shadow-xs transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  <span>{isLoading ? 'Creating Business...' : 'Launch Business Workspace'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            </>
          ) : (
            /* Registration Done */
            <div className="text-center space-y-4 py-4">
              <div className="w-14 h-14 bg-zinc-100 text-zinc-950 rounded-full flex items-center justify-center mx-auto border border-zinc-300">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-zinc-950">Organization Created!</h2>
                <p className="text-xs text-zinc-500 mt-1">
                  <strong>{createdBusinessName}</strong> is ready. You are provisioned as Business Owner with full platform access.
                </p>
              </div>
              <button
                type="button"
                onClick={handleGoToDashboard}
                className="w-full py-2.5 px-4 bg-zinc-950 hover:bg-zinc-800 text-white rounded-lg text-xs font-bold shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Go to Dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          <p className="text-center text-[11px] text-zinc-400 mt-4">
            Protected by WorkPulse Multi-Tenant Identity Engine
          </p>
        </div>
      </div>
    </div>
  );
};
export default Login;
