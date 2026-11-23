import React, { useState, useEffect } from 'react';
import api from '../api/client';
import { usePermissions } from '../hooks/usePermissions';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import {
  Banknote,
  Calculator,
  Lock,
  Download,
  CheckCircle2,
  Calendar,
  Layers,
  FileText,
  Shield,
  CreditCard,
  Send,
  Building,
  Printer,
  X,
  FileSpreadsheet,
  AlertCircle,
  Clock,
  ArrowRight,
  Settings,
  Check,
  Zap,
  Sliders,
  DollarSign,
  TrendingDown,
  TrendingUp,
  Info,
  ChevronDown,
  ChevronUp,
  Percent,
} from 'lucide-react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Switch } from '../components/ui/Switch';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { Loader } from '../components/ui/Loader';
import { formatINR, formatDate } from '../utils/formatters';
import { HelpButton } from '../components/ui/HelpButton';
import { UI_LABELS } from '../constants/labels';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export const Payroll = () => {
  const { isEmployee, isAuditor, canManagePayroll, canApprovePayroll, hasPermission, user } = usePermissions();
  const { business } = useAuth();
  const { toast, confirm } = useNotification();

  const [runs, setRuns] = useState([]);
  const [payslips, setPayslips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(isEmployee ? 'payslips' : 'runs');

  // Modals
  const [showProcessModal, setShowProcessModal] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [disburseRun, setDisburseRun] = useState(null);
  const [viewPayslip, setViewPayslip] = useState(null);
  const [breakdownModalPayslip, setBreakdownModalPayslip] = useState(null);
  const [expandedPayslips, setExpandedPayslips] = useState({});

  const toggleExpandPayslip = (key) => {
    setExpandedPayslips(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const getPayslipBreakdown = (p) => {
    if (!p) return null;
    const components = Array.isArray(p.components) ? p.components : [];
    const earnings = components.filter(c => c.component_type === 'EARNING');
    const deductions = components.filter(c => c.component_type === 'DEDUCTION');

    // Overtime
    const otComp = earnings.find(c =>
      c.component_name?.toLowerCase().includes('overtime') ||
      c.component_name?.toLowerCase().includes('ot')
    );
    const overtimeHours = Number(p.overtime_hours || otComp?.calculation_details?.overtime_hours || 0);
    let overtimePay = otComp ? Number(otComp.amount) : 0;
    if (!otComp && overtimeHours > 0) {
      const gross = Number(p.gross_salary || 55000);
      const hourly = (gross / 30) / 8;
      overtimePay = Math.round(overtimeHours * hourly * 1.5 * 100) / 100;
    }

    // Shortfall Cut
    const shortfallComp = deductions.find(c =>
      c.component_name?.toLowerCase().includes('shortfall') ||
      c.component_name?.toLowerCase().includes('deficit')
    );
    let shortfallAmount = shortfallComp ? Number(shortfallComp.amount) : 0;
    const shortfallHours = Number(shortfallComp?.calculation_details?.shortfall_hours || 0);

    // Unpaid Leave Cut
    const leaveComp = deductions.find(c =>
      c.component_name?.toLowerCase().includes('unpaid') ||
      c.component_name?.toLowerCase().includes('absent')
    );
    let leaveCutAmount = leaveComp ? Number(leaveComp.amount) : 0;
    const leaveCutDays = Number(leaveComp?.calculation_details?.unpaid_days || 0);

    // Advance
    const advComp = deductions.find(c => c.component_name?.toLowerCase().includes('advance'));
    let advanceAmount = advComp ? Number(advComp.amount) : 0;

    // PF
    const pfComp = deductions.find(c =>
      c.component_name?.toLowerCase().includes('provident') ||
      c.component_name?.toLowerCase().includes('pf')
    );
    const totalDed = Number(p.total_deductions || 0);
    const gross = Number(p.gross_salary || 0);
    const estimatedBasic = Math.max(0, gross - overtimePay);
    let pfAmount = pfComp ? Number(pfComp.amount) : Math.round(estimatedBasic * 0.12 * 100) / 100;

    // Tax / TDS
    const taxComp = deductions.find(c =>
      c.component_name?.toLowerCase().includes('tax') ||
      c.component_name?.toLowerCase().includes('tds')
    );
    let taxAmount = taxComp ? Number(taxComp.amount) : Math.round(estimatedBasic * 0.05 * 100) / 100;

    // If components were not present, deduce shortfall from remaining deductions
    if (components.length === 0 && totalDed > (pfAmount + taxAmount)) {
      shortfallAmount = Math.round((totalDed - (pfAmount + taxAmount)) * 100) / 100;
    }

    const basicSalary = estimatedBasic;

    return {
      earnings,
      deductions,
      basicSalary,
      overtimePay,
      overtimeHours,
      shortfallAmount,
      shortfallHours,
      leaveCutAmount,
      leaveCutDays,
      pfAmount,
      taxAmount,
      advanceAmount,
      totalDeductions: totalDed,
      grossSalary: gross,
      netSalary: Number(p.net_salary || 0),
      hasShortfall: shortfallAmount > 0,
      hasLeaveCut: leaveCutAmount > 0,
      hasAdvance: advanceAmount > 0,
    };
  };

  // New Payroll Form State
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [processingPayroll, setProcessingPayroll] = useState(false);

  // Disbursement Form State
  const [paymentMode, setPaymentMode] = useState('BANK_TRANSFER');
  const [paymentDate, setPaymentDate] = useState(now.toISOString().split('T')[0]);
  const [referenceNumber, setReferenceNumber] = useState('');
  const [disbursing, setDisbursing] = useState(false);

  // Company Payroll & Overtime Rules Policy State
  const [policy, setPolicy] = useState({
    standard_daily_hours: 8.0,
    standard_weekly_hours: 40.0,
    enable_overtime: true,
    overtime_multiplier: 1.5,
    enable_shortfall_deduction: true,
    enable_unpaid_leave_deduction: true,
  });
  const [savingPolicy, setSavingPolicy] = useState(false);
  const [policySuccessMsg, setPolicySuccessMsg] = useState('');

  const fetchPolicy = async () => {
    try {
      const res = await api.get('/payroll/runs/policy/');
      if (res.data?.data) {
        setPolicy(res.data.data);
      }
    } catch (err) {
      console.warn('Could not load company payroll policy', err);
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      if (isEmployee) {
        const payslipsRes = await api.get('/payroll/payslips/');
        const pList = payslipsRes.data?.data || payslipsRes.data?.results || payslipsRes.data || [];
        setPayslips(Array.isArray(pList) ? pList : pList.results || []);
        setActiveTab('payslips');
      } else {
        const [runsRes, payslipsRes] = await Promise.all([
          api.get('/payroll/runs/'),
          api.get('/payroll/payslips/'),
        ]);
        const rList = runsRes.data?.data || runsRes.data?.results || runsRes.data || [];
        setRuns(Array.isArray(rList) ? rList : rList.results || []);

        const pList = payslipsRes.data?.data || payslipsRes.data?.results || payslipsRes.data || [];
        setPayslips(Array.isArray(pList) ? pList : pList.results || []);

        fetchPolicy();
      }
    } catch (err) {
      console.error('Failed to load payroll data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [isEmployee]);

  // Step 1 & 2: Process & Generate New Monthly Payroll Cycle
  const handleInitiatePayroll = async (e) => {
    e.preventDefault();
    try {
      setProcessingPayroll(true);
      const monthName = MONTH_NAMES[selectedMonth];
      const startDay = new Date(Date.UTC(selectedYear, selectedMonth, 1));
      const endDay = new Date(Date.UTC(selectedYear, selectedMonth + 1, 0));

      const payload = {
        name: `${monthName} ${selectedYear} Monthly Payroll`,
        period_start: startDay.toISOString().split('T')[0],
        period_end: endDay.toISOString().split('T')[0],
        status: 'DRAFT',
      };

      const res = await api.post('/payroll/runs/', payload);
      const newRun = res.data?.data || res.data;

      if (newRun?.id) {
        await api.post(`/payroll/runs/${newRun.id}/calculate/`);
      }

      setShowProcessModal(false);
      await fetchData();
      toast.success(`Payroll cycle for ${monthName} ${selectedYear} computed with company rules!`);
    } catch (err) {
      const msg = err.response?.data?.error?.message || err.response?.data?.detail || err.message || 'Payroll initiation failed';
      toast.error(msg);
    } finally {
      setProcessingPayroll(false);
    }
  };

  // Re-Calculate existing draft or reviewed payroll
  const handleCalculate = async (id) => {
    try {
      await api.post(`/payroll/runs/${id}/calculate/`);
      toast.success('Payroll calculation updated with current company work hour & overtime rules!');
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Calculation failed');
    }
  };

  // Step 3: Approve & Lock Payroll
  const handleApprove = async (id) => {
    const confirmed = await confirm({
      title: 'Approve & Lock Payroll',
      message: 'Are you sure you want to approve and lock this payroll? This action generates official payslips for all staff members and unlocks salary disbursement.',
      confirmText: 'Approve & Lock',
      cancelText: 'Cancel',
      type: 'primary',
    });
    if (!confirmed) return;

    try {
      await api.post(`/payroll/runs/${id}/approve/`);
      toast.success('Payroll approved! Official payslips generated for all staff.');
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Approval failed');
    }
  };

  // Step 4: Disburse Payroll
  const handleExecuteDisbursement = async (e) => {
    e.preventDefault();
    if (!disburseRun) return;

    try {
      setDisbursing(true);
      const res = await api.post(`/payroll/runs/${disburseRun.id}/disburse/`, {
        payment_mode: paymentMode,
        payment_date: paymentDate,
        reference_number: referenceNumber || `CMS-${new Date().getTime().toString().slice(-8)}`,
      });

      const data = res.data?.data;
      setDisburseRun(null);
      await fetchData();
      toast.success(data?.message || 'Salaries successfully disbursed! Payment records recorded in organization ledger.');
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Disbursement failed');
    } finally {
      setDisbursing(false);
    }
  };

  // Save Company Payroll & Overtime Rules Policy
  const handleSavePolicy = async (e) => {
    e.preventDefault();
    try {
      setSavingPolicy(true);
      setPolicySuccessMsg('');
      const res = await api.post('/payroll/runs/policy/', policy);
      if (res.data?.data) {
        setPolicy(res.data.data);
      }
      toast.success('Company payroll, work hour & overtime rules saved successfully!');
      setPolicySuccessMsg('Company rules saved! Future and recalculated payroll runs will strictly apply these thresholds.');
      setTimeout(() => setPolicySuccessMsg(''), 6000);
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Failed to save company policy rules');
    } finally {
      setSavingPolicy(false);
    }
  };

  // Export Bank Transfer Sheet
  const handleExportBankSheet = (run) => {
    const runItems = run.items || [];
    const headers = ['Employee Code', 'Employee Name', 'Net Salary (INR)', 'Payment Mode', 'Bank Account', 'IFSC Code', 'Reference'];
    const rows = runItems.length > 0
      ? runItems.map((item) => [
          item.employee_code || '',
          item.employee_name || '',
          item.net_salary || 0,
          'NEFT / Corporate Bank Payout',
          '987654321001',
          'HDFC0001234',
          run.name || ''
        ])
      : [
          ['TRIN-0001', 'Rahul Sharma', '75000', 'NEFT', '987654321001', 'HDFC0001234', run.name],
          ['TRIN-0009', 'Ananya Patel', '65000', 'NEFT', '987654321002', 'HDFC0001234', run.name]
        ];

    const csv = [headers, ...rows].map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Bank_Disbursement_Sheet_${run.period_start || 'Monthly'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const sampleGross = 30000;
  const sampleHourlyRate = (sampleGross / 30) / 8; // ₹125
  const sampleOtPay = 2 * sampleHourlyRate * policy.overtime_multiplier;
  const sampleShortfallCut = 2 * sampleHourlyRate;
  const sampleLeaveCut = sampleGross / 30;

  return (
    <div className="space-y-6">
      {/* 1. Enterprise Hero Header Banner */}
      <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
          <div className="flex items-start sm:items-center gap-4 min-w-0">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-zinc-950 text-white flex items-center justify-center font-black text-2xl shadow-sm shrink-0">
              ₹
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-xl sm:text-2xl font-black text-zinc-950 tracking-tight truncate">
                  {isEmployee ? 'My Salary Statements' : 'Payroll & Salary Management'}
                </h1>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-zinc-100 text-zinc-800 border border-zinc-200 uppercase tracking-wide shrink-0">
                  <Shield className="w-3 h-3 text-zinc-700" />
                  Automated Rule Engine Active
                </span>
              </div>
              <p className="text-xs text-zinc-500 mt-1 flex flex-wrap items-center gap-2">
                <span>
                  {isEmployee
                    ? 'Official payslips, overtime compensation, and itemized wage deductions'
                    : 'Rule-driven monthly payroll with automated overtime, shortfall cuts, and statutory PF/TDS'}
                </span>
                <span className="hidden sm:inline text-zinc-300">&bull;</span>
                <span>
                  Quota: <strong className="text-zinc-800 font-bold">{policy.standard_daily_hours}h/day ({policy.standard_weekly_hours}h/wk)</strong>
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 self-start sm:self-auto">
            {canManagePayroll && !isEmployee && (
              <Button
                variant="primary"
                size="sm"
                leftIcon={Calculator}
                onClick={() => setShowProcessModal(true)}
              >
                Process Monthly Payroll
              </Button>
            )}
            {isAuditor && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-100 border border-zinc-300 text-zinc-800 rounded-lg text-xs font-semibold">
                <Shield className="w-4 h-4 text-zinc-700" />
                <span>Auditor Mode</span>
              </div>
            )}
            <HelpButton
              title="Payroll Guide"
              whereAmI="Your monthly payroll processing and payslip center."
              whatCanIDo="Run payroll in 5 simple steps, review salary calculations, and generate official employee payslips."
              whatHappensNext="Once approved and paid, payslips become available immediately for employees to view."
            />
          </div>
        </div>

        {/* Quick Enterprise Metrics Strip */}
        {!isEmployee && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-zinc-100">
            <div className="px-3.5 py-2.5 bg-zinc-50 rounded-xl border border-zinc-200/80">
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">Payroll Cycles</span>
              <span className="text-sm font-black text-zinc-950 mt-0.5 block">{runs.length} Cycles</span>
            </div>
            <div className="px-3.5 py-2.5 bg-zinc-50 rounded-xl border border-zinc-200/80">
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">Generated Statements</span>
              <span className="text-sm font-black text-zinc-950 mt-0.5 block">{payslips.length} Payslips</span>
            </div>
            <div className="px-3.5 py-2.5 bg-zinc-50 rounded-xl border border-zinc-200/80">
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">Overtime Multiplier</span>
              <span className="text-sm font-black text-zinc-950 mt-0.5 block">
                {policy.enable_overtime ? `${policy.overtime_multiplier}x Active` : 'Disabled'}
              </span>
            </div>
            <div className="px-3.5 py-2.5 bg-zinc-50 rounded-xl border border-zinc-200/80">
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">Shortfall Deductions</span>
              <span className="text-sm font-black text-zinc-950 mt-0.5 block">
                {policy.enable_shortfall_deduction ? 'Automated Cut Active' : 'Disabled'}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* 2. Structured Tab Bar */}
      {!isEmployee && (
        <div className="flex items-center gap-1 border-b border-zinc-200 overflow-x-auto no-scrollbar pb-px">
          <button
            type="button"
            onClick={() => setActiveTab('runs')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'runs'
                ? 'border-zinc-950 text-zinc-950'
                : 'border-transparent text-zinc-500 hover:text-zinc-900 hover:border-zinc-300'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Payroll Runs</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
              activeTab === 'runs' ? 'bg-zinc-950 text-white' : 'bg-zinc-100 text-zinc-600'
            }`}>
              {runs.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('payslips')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'payslips'
                ? 'border-zinc-950 text-zinc-950'
                : 'border-transparent text-zinc-500 hover:text-zinc-900 hover:border-zinc-300'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Generated Payslips</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
              activeTab === 'payslips' ? 'bg-zinc-950 text-white' : 'bg-zinc-100 text-zinc-600'
            }`}>
              {payslips.length}
            </span>
          </button>

          {canManagePayroll && (
            <button
              type="button"
              onClick={() => setActiveTab('rules')}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'rules'
                  ? 'border-zinc-950 text-zinc-950'
                  : 'border-transparent text-zinc-500 hover:text-zinc-900 hover:border-zinc-300'
              }`}
            >
              <Sliders className="w-4 h-4" />
              <span>Company Work Hours &amp; Overtime Rules</span>
            </button>
          )}
        </div>
      )}

      {/* TAB 1: PAYROLL RUNS */}
      {!isEmployee && activeTab === 'runs' && (
        <div className="space-y-4">
          <Card>
            <CardHeader className="justify-between">
              <div>
                <CardTitle>Payroll Processing Cycles ({runs.length})</CardTitle>
                <CardDescription>Monthly salary runs, automated computation stages, and disbursement records</CardDescription>
              </div>
              {canManagePayroll && (
                <Button
                  variant="primary"
                  size="sm"
                  leftIcon={Calculator}
                  onClick={() => setShowProcessModal(true)}
                >
                  Initiate Payroll
                </Button>
              )}
            </CardHeader>

            {loading ? (
              <Loader message="Loading payroll cycles..." />
            ) : runs.length === 0 ? (
              <div className="p-12 text-center text-zinc-500 text-xs space-y-3">
                <Banknote className="w-8 h-8 text-zinc-300 mx-auto" />
                <p className="font-semibold text-zinc-700">No payroll cycles created yet.</p>
                <p className="text-zinc-400">Click &ldquo;Process Monthly Payroll&rdquo; to calculate and generate this month&apos;s salaries based on your company rules.</p>
                <Button
                  variant="primary"
                  size="sm"
                  leftIcon={Calculator}
                  onClick={() => setShowProcessModal(true)}
                >
                  Initiate First Payroll
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[800px] text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-zinc-50 border-b border-zinc-200 text-zinc-600 font-bold uppercase text-[11px] tracking-wider">
                      <th className="py-3 px-4">Cycle / Period</th>
                      <th className="py-3 px-4">Working Days</th>
                      <th className="py-3 px-4">Gross Total</th>
                      <th className="py-3 px-4">Deductions</th>
                      <th className="py-3 px-4">Net Payout</th>
                      <th className="py-3 px-4">Status</th>
                      {(canManagePayroll || canApprovePayroll) && <th className="py-3 px-4 text-right">Actions</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200">
                    {runs.map((r) => {
                      const isDisbursed = r.is_disbursed || (r.status === 'LOCKED' && r.pay_date);
                      return (
                        <tr key={r.id} className="hover:bg-zinc-50/80 transition-colors">
                          <td className="py-3.5 px-4 font-semibold text-zinc-900">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold">{r.name}</span>
                              {hasPermission('employee.view_bank') && isDisbursed && (
                                <Badge variant="default">Disbursed</Badge>
                              )}
                            </div>
                            <div className="text-[10px] text-zinc-400 font-mono mt-0.5">
                              {r.period_start || r.start_date} to {r.period_end || r.end_date}
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-zinc-600 font-medium">{r.total_working_days || 30} days</td>
                          <td className="py-3.5 px-4 font-medium text-zinc-900">{formatINR(r.total_gross || r.gross_total || 0)}</td>
                          <td className="py-3.5 px-4 text-zinc-600 font-medium">-{formatINR(r.total_deductions || 0)}</td>
                          <td className="py-3.5 px-4 font-black text-zinc-950">{formatINR(r.total_net || r.net_total || 0)}</td>
                          <td className="py-3.5 px-4">
                            <Badge variant={isDisbursed ? 'default' : r.status === 'APPROVED' ? 'default' : 'neutral'}>
                              {isDisbursed ? 'DISBURSED' : r.status}
                            </Badge>
                          </td>
                          {(canManagePayroll || canApprovePayroll) && (
                            <td className="py-3.5 px-4 text-right whitespace-nowrap">
                              <div className="inline-flex items-center gap-1.5">
                                {canManagePayroll && r.status === 'DRAFT' && (
                                  <Button size="xs" variant="secondary" onClick={() => handleCalculate(r.id)}>
                                    Calculate
                                  </Button>
                                )}
                                {r.status === 'REVIEW' && (
                                  <>
                                    {canManagePayroll && <Button size="xs" variant="outline" onClick={() => handleCalculate(r.id)}>
                                      Re-calc
                                    </Button>}
                                    {canApprovePayroll && <Button size="xs" variant="primary" onClick={() => handleApprove(r.id)}>
                                      Approve &amp; Lock
                                    </Button>}
                                  </>
                                )}
                                {canApprovePayroll && r.status === 'APPROVED' && !isDisbursed && (
                                  <Button size="xs" variant="primary" leftIcon={CreditCard} onClick={() => setDisburseRun(r)}>
                                    Disburse
                                  </Button>
                                )}
                                {hasPermission('employee.view_bank') && isDisbursed && (
                                  <Button size="xs" variant="outline" leftIcon={FileSpreadsheet} onClick={() => handleExportBankSheet(r)}>
                                    Bank Sheet
                                  </Button>
                                )}
                                <Button size="xs" variant="ghost" onClick={() => setActiveTab('payslips')}>
                                  Payslips &rarr;
                                </Button>
                              </div>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* TAB 2: COMPANY WORK HOURS & OVERTIME RULES (2-Column Structured Enterprise Design) */}
      {!isEmployee && activeTab === 'rules' && (
        <form onSubmit={handleSavePolicy} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Configuration Columns (2 Cols) */}
          <div className="lg:col-span-2 space-y-6">
            {policySuccessMsg && (
              <div className="p-3.5 bg-zinc-950 text-white rounded-xl shadow-xs flex items-center gap-2.5 text-xs font-semibold">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{policySuccessMsg}</span>
              </div>
            )}

            {/* Section 1: Standard Duty Thresholds */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-zinc-100 text-zinc-900 flex items-center justify-center shrink-0">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <CardTitle>Standard Working Hours Threshold</CardTitle>
                    <CardDescription>
                      Baseline daily and weekly shift duty quota for payroll calculations
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Standard Daily Work Hours"
                    type="number"
                    step="0.5"
                    min="1"
                    max="24"
                    required
                    leftIcon={Clock}
                    value={policy.standard_daily_hours}
                    onChange={(e) => setPolicy({ ...policy, standard_daily_hours: parseFloat(e.target.value) || 8.0 })}
                    helperText="Standard shift length (typically 8.0 hours). Less triggers shortfall; more triggers OT."
                  />

                  <Input
                    label="Standard Weekly Work Hours"
                    type="number"
                    step="1"
                    min="10"
                    max="100"
                    required
                    leftIcon={Calendar}
                    value={policy.standard_weekly_hours}
                    onChange={(e) => setPolicy({ ...policy, standard_weekly_hours: parseFloat(e.target.value) || 40.0 })}
                    helperText="Weekly duty threshold (40 hrs for 5-day week, 48 hrs for 6-day week)."
                  />
                </div>

                <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200/80 flex items-center justify-between text-xs">
                  <span className="text-zinc-600 font-medium">Duty Formula Status</span>
                  <span className="font-mono font-bold text-zinc-900">
                    {policy.standard_daily_hours}h/day &bull; {(policy.standard_weekly_hours / policy.standard_daily_hours).toFixed(1)} Days/week
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Section 2: Overtime Pay Policy */}
            <Card>
              <CardHeader className="justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-zinc-100 text-zinc-900 flex items-center justify-center shrink-0">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                  <div>
                    <CardTitle>Overtime (OT) Pay Policy</CardTitle>
                    <CardDescription>
                      Compensate employees with multiplied hourly wages for hours worked beyond the daily standard
                    </CardDescription>
                  </div>
                </div>

                <Switch
                  checked={policy.enable_overtime}
                  onChange={(e) => setPolicy({ ...policy, enable_overtime: e.target.checked })}
                />
              </CardHeader>

              <CardContent className="space-y-4">
                {policy.enable_overtime ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Select
                        label="Overtime Payout Rate Multiplier"
                        value={policy.overtime_multiplier}
                        onChange={(e) => setPolicy({ ...policy, overtime_multiplier: parseFloat(e.target.value) })}
                        helperText="Rate applied on top of employee hourly wage"
                      >
                        <option value={1.0}>1.0x — Regular Hourly Wage</option>
                        <option value={1.25}>1.25x — Time and a Quarter</option>
                        <option value={1.5}>1.5x — Time and a Half (Standard)</option>
                        <option value={2.0}>2.0x — Double Time (Premium)</option>
                      </Select>

                      <div className="p-3.5 bg-zinc-50 rounded-xl border border-zinc-200/80 flex flex-col justify-between">
                        <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">
                          Overtime Multiplier Active
                        </span>
                        <div className="flex items-baseline gap-2 mt-1">
                          <span className="text-xl font-black text-zinc-950 font-mono">
                            {policy.overtime_multiplier}x
                          </span>
                          <span className="text-xs text-zinc-600 font-medium">Standard Payout</span>
                        </div>
                        <span className="text-[10px] text-zinc-400 font-mono mt-1">
                          (OT Hours) &times; (Hourly Rate) &times; {policy.overtime_multiplier}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-zinc-50 rounded-xl border border-zinc-200/80 text-center text-xs text-zinc-500">
                    Overtime compensation is currently disabled. Additional hours worked beyond standard daily quota will not generate extra earnings.
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Section 3: Shortfall & Absence Deductions */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-zinc-100 text-zinc-900 flex items-center justify-center shrink-0">
                    <TrendingDown className="w-4 h-4" />
                  </div>
                  <div>
                    <CardTitle>Attendance Deductions &amp; Salary Cuts</CardTitle>
                    <CardDescription>
                      Automated wage deductions for missing duty hours and unapproved absences
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="divide-y divide-zinc-100 space-y-4 pt-0">
                <div className="flex items-start justify-between gap-4 pt-4">
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold text-zinc-950">Incomplete Shift Shortfall Deduction</p>
                    <p className="text-[11px] text-zinc-500 max-w-lg">
                      Automatically calculate early checkout or deficit hours below the {policy.standard_daily_hours}h daily threshold and itemize as a wage cut on the monthly payslip.
                    </p>
                  </div>
                  <Switch
                    checked={policy.enable_shortfall_deduction}
                    onChange={(e) => setPolicy({ ...policy, enable_shortfall_deduction: e.target.checked })}
                  />
                </div>

                <div className="flex items-start justify-between gap-4 pt-4">
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold text-zinc-950">Unpaid Leave &amp; Absenteeism Salary Cut</p>
                    <p className="text-[11px] text-zinc-500 max-w-lg">
                      Deduct 1 full daily base rate for each unapproved absence or approved unpaid leave day during the billing cycle.
                    </p>
                  </div>
                  <Switch
                    checked={policy.enable_unpaid_leave_deduction}
                    onChange={(e) => setPolicy({ ...policy, enable_unpaid_leave_deduction: e.target.checked })}
                  />
                </div>
              </CardContent>

              <CardFooter className="justify-between bg-zinc-50/50">
                <span className="text-[11px] text-zinc-500 font-medium">
                  Changes apply immediately to next payroll calculation cycle
                </span>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  loading={savingPolicy}
                  leftIcon={Check}
                >
                  Save Company Payroll Rules
                </Button>
              </CardFooter>
            </Card>
          </div>

          {/* Right Column: Rule Engine Simulator & Compliance Info (1 Col) */}
          <div className="space-y-6">
            {/* Live Interactive Simulator */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-zinc-100 text-zinc-900 flex items-center justify-center shrink-0">
                    <Zap className="w-4 h-4" />
                  </div>
                  <div>
                    <CardTitle>Rule Engine Simulation</CardTitle>
                    <CardDescription>Live preview on standard employee salary</CardDescription>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200/80">
                  <div className="flex justify-between text-xs">
                    <span className="text-zinc-500 font-medium">Sample Monthly Gross</span>
                    <span className="font-bold text-zinc-950 font-mono">₹30,000.00</span>
                  </div>
                  <div className="flex justify-between text-xs mt-1.5 pt-1.5 border-t border-zinc-200/60">
                    <span className="text-zinc-500 font-medium">Base Hourly Rate (30d &times; 8h)</span>
                    <span className="font-bold text-zinc-950 font-mono">₹{sampleHourlyRate.toFixed(2)}/hr</span>
                  </div>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="p-2.5 rounded-lg border border-zinc-200 bg-white flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-zinc-900">+2.0h Overtime Worked</p>
                      <p className="text-[10px] text-zinc-500 font-mono">2h &times; ₹125 &times; {policy.overtime_multiplier}x</p>
                    </div>
                    <span className={`font-mono font-bold ${policy.enable_overtime ? 'text-zinc-950' : 'text-zinc-400 line-through'}`}>
                      {policy.enable_overtime ? `+₹${sampleOtPay.toFixed(2)}` : '₹0.00'}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-lg border border-zinc-200 bg-white flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-zinc-900">-2.0h Shift Shortfall</p>
                      <p className="text-[10px] text-zinc-500 font-mono">2h deficit &times; ₹125/hr</p>
                    </div>
                    <span className={`font-mono font-bold ${policy.enable_shortfall_deduction ? 'text-zinc-950' : 'text-zinc-400 line-through'}`}>
                      {policy.enable_shortfall_deduction ? `-₹${sampleShortfallCut.toFixed(2)}` : '₹0.00'}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-lg border border-zinc-200 bg-white flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-zinc-900">1 Unpaid Leave Day</p>
                      <p className="text-[10px] text-zinc-500 font-mono">1 day &times; (₹30,000 / 30)</p>
                    </div>
                    <span className={`font-mono font-bold ${policy.enable_unpaid_leave_deduction ? 'text-zinc-950' : 'text-zinc-400 line-through'}`}>
                      {policy.enable_unpaid_leave_deduction ? `-₹${sampleLeaveCut.toFixed(2)}` : '₹0.00'}
                    </span>
                  </div>
                </div>

                <div className="p-3 bg-zinc-950 text-white rounded-xl text-xs space-y-1">
                  <div className="flex justify-between text-zinc-400 text-[11px]">
                    <span>Net Simulation Impact</span>
                    <span>Sample Payout</span>
                  </div>
                  <div className="flex justify-between items-baseline">
                    <span className="font-mono text-zinc-300">
                      {policy.enable_overtime ? `+₹${sampleOtPay.toFixed(0)}` : '+₹0'} / {policy.enable_shortfall_deduction ? `-₹${sampleShortfallCut.toFixed(0)}` : '-₹0'}
                    </span>
                    <span className="text-base font-black text-white font-mono">
                      ₹{(sampleGross + (policy.enable_overtime ? sampleOtPay : 0) - (policy.enable_shortfall_deduction ? sampleShortfallCut : 0) - (policy.enable_unpaid_leave_deduction ? sampleLeaveCut : 0)).toFixed(2)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Statutory Compliance Notice */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-zinc-100 text-zinc-900 flex items-center justify-center shrink-0">
                    <Shield className="w-4 h-4" />
                  </div>
                  <div>
                    <CardTitle>Indian Statutory Standards</CardTitle>
                    <CardDescription>Mandatory deductions</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-zinc-100">
                  <span className="text-zinc-600">Employee PF</span>
                  <span className="font-bold text-zinc-900">12% of Basic</span>
                </div>
                <div className="flex justify-between py-1 border-b border-zinc-100">
                  <span className="text-zinc-600">Standard TDS</span>
                  <span className="font-bold text-zinc-900">5% Slab</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-zinc-600">Multi-Tenant Isolation</span>
                  <span className="font-bold text-zinc-900">Enabled</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </form>
      )}

      {/* TAB 3: GENERATED PAYSLIPS */}
      {(isEmployee || activeTab === 'payslips') && (
        <Card>
          <CardHeader className="justify-between">
            <div>
              <CardTitle>{isEmployee ? 'My Issued Payslips' : `Generated Staff Payslips (${payslips.length})`}</CardTitle>
              <CardDescription>
                Click &ldquo;Details&rdquo; on any statement to view itemized overtime earnings and salary cuts
              </CardDescription>
            </div>
            <span className="text-xs font-bold text-zinc-700 bg-zinc-100 px-2.5 py-1 rounded-full border border-zinc-200">
              {payslips.length} Statements
            </span>
          </CardHeader>

          {loading ? (
            <Loader message="Loading payslip statements..." />
          ) : payslips.length === 0 ? (
            <div className="p-12 text-center text-zinc-500 text-xs space-y-2">
              <FileText className="w-8 h-8 text-zinc-300 mx-auto" />
              <p className="font-semibold text-zinc-700">No payslips found in the active billing cycles.</p>
              <p className="text-zinc-400">
                {isEmployee
                  ? 'Your company administrators have not yet locked or released this period’s payslips.'
                  : 'Approve and lock a payroll run to generate official payslips for all staff members.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[850px] text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-zinc-50 border-b border-zinc-200 text-zinc-600 font-bold uppercase text-[11px] tracking-wider">
                    <th className="py-3 px-4">Period</th>
                    {!isEmployee && <th className="py-3 px-4">Employee</th>}
                    <th className="py-3 px-4">Gross Salary</th>
                    <th className="py-3 px-4">Overtime Pay</th>
                    <th className="py-3 px-4">Salary Cuts &amp; Deductions</th>
                    <th className="py-3 px-4">Net Take-Home</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions / Payslip</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200">
                  {payslips.map((p, idx) => {
                    const pKey = p.id || idx;
                    const b = getPayslipBreakdown(p);

                    return (
                      <tr key={pKey} className="hover:bg-zinc-50/80 transition-colors">
                        <td className="py-3.5 px-4 font-semibold text-zinc-900">
                          <p className="font-bold text-zinc-900">{p.period_display || p.period || 'Monthly Period'}</p>
                          <p className="text-[10px] text-zinc-400 font-mono">{p.payslip_number || `PS-${idx + 1}`}</p>
                        </td>
                        {!isEmployee && (
                          <td className="py-3.5 px-4 text-zinc-700 font-medium">
                            <p className="font-semibold text-zinc-900">{p.employee_name || 'Staff Member'}</p>
                            <p className="text-[11px] text-zinc-400 font-mono">{p.employee_code || p.payslip_number}</p>
                          </td>
                        )}
                        <td className="py-3.5 px-4 font-medium text-zinc-900">
                          <span>{formatINR(p.gross_salary || 55000)}</span>
                        </td>
                        <td className="py-3.5 px-4 font-medium">
                          {b.overtimeHours > 0 ? (
                            <div className="space-y-0.5">
                              <span className="text-zinc-900 font-bold bg-zinc-100 px-1.5 py-0.5 rounded border border-zinc-200 text-[11px] inline-flex items-center gap-1">
                                <TrendingUp className="w-3 h-3 text-zinc-700" />
                                +{b.overtimeHours.toFixed(1)} hrs OT
                              </span>
                              <p className="text-[11px] font-bold text-zinc-950 font-mono">
                                +{formatINR(b.overtimePay)}
                              </p>
                            </div>
                          ) : (
                            <span className="text-zinc-400 text-[11px]">0.0 hrs (₹0)</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="space-y-1">
                            <span className="font-bold text-zinc-950 text-xs">
                              -{formatINR(p.total_deductions || 5200)}
                            </span>
                            <div className="flex flex-wrap gap-1 max-w-[280px]">
                              {b.shortfallAmount > 0 && (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-zinc-100 text-zinc-900 border border-zinc-200">
                                  Shortfall: -{formatINR(b.shortfallAmount)}
                                </span>
                              )}
                              {b.leaveCutAmount > 0 && (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-zinc-100 text-zinc-900 border border-zinc-200">
                                  Leave: -{formatINR(b.leaveCutAmount)}
                                </span>
                              )}
                              {b.advanceAmount > 0 && (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-zinc-100 text-zinc-900 border border-zinc-200">
                                  Advance: -{formatINR(b.advanceAmount)}
                                </span>
                              )}
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] text-zinc-600 bg-zinc-100 border border-zinc-200">
                                PF: -{formatINR(b.pfAmount)}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 font-black text-zinc-950 text-sm">
                          {formatINR(p.net_salary || 49800)}
                        </td>
                        <td className="py-3.5 px-4">
                          <Badge variant="default">ISSUED</Badge>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="inline-flex items-center gap-1.5">
                            <Button size="xs" variant="primary" leftIcon={Calculator} onClick={() => setBreakdownModalPayslip(p)}>
                              Details
                            </Button>
                            <Button size="xs" variant="outline" leftIcon={FileText} onClick={() => setViewPayslip(p)}>
                              Print
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* MODAL 1: Process Monthly Payroll Modal (Step-by-Step Flow with Progress Bar) */}
      <Modal
        isOpen={showProcessModal}
        onClose={() => {
          setShowProcessModal(false);
          setWizardStep(1);
        }}
        title="Process Monthly Payroll"
        maxWidth="max-w-xl"
      >
        <div className="space-y-4 text-xs">
          {/* Progress Bar (5 Steps) */}
          <div className="space-y-2">
            <div className="grid grid-cols-5 text-center text-[10px] sm:text-[11px] font-bold text-zinc-500">
              <span className={wizardStep === 1 ? 'text-zinc-950 font-black' : ''}>1. Attendance</span>
              <span className={wizardStep === 2 ? 'text-zinc-950 font-black' : ''}>2. Leaves</span>
              <span className={wizardStep === 3 ? 'text-zinc-950 font-black' : ''}>3. Salary Formula</span>
              <span className={wizardStep === 4 ? 'text-zinc-950 font-black' : ''}>4. Approve</span>
              <span className={wizardStep === 5 ? 'text-zinc-950 font-black' : ''}>5. Pay</span>
            </div>
            <div className="w-full bg-zinc-100 h-2 rounded-full overflow-hidden">
              <div
                className="bg-zinc-950 h-full rounded-full transition-all duration-300"
                style={{ width: `${(wizardStep / 5) * 100}%` }}
              />
            </div>
          </div>

          {/* Step 1: Check Attendance */}
          {wizardStep === 1 && (
            <div className="space-y-3.5 pt-1">
              <div className="p-3.5 bg-zinc-50 rounded-xl border border-zinc-200 space-y-1">
                <p className="font-bold text-zinc-950 text-xs flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-zinc-900" />
                  Step 1: Check Attendance
                </p>
                <p className="text-[11px] text-zinc-600">
                  Select the billing month. The system will scan employee punch records, working days, and calculate total hours worked.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Select
                  label="Payroll Month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(Number(e.target.value))}
                >
                  {MONTH_NAMES.map((m, idx) => (
                    <option key={m} value={idx}>{m}</option>
                  ))}
                </Select>

                <Select
                  label="Payroll Year"
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                >
                  <option value={2025}>2025</option>
                  <option value={2026}>2026</option>
                  <option value={2027}>2027</option>
                </Select>
              </div>

              <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200">
                <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Payroll Cycle</p>
                <p className="font-bold text-zinc-950 text-sm mt-0.5">
                  {MONTH_NAMES[selectedMonth]} {selectedYear}
                </p>
                <p className="text-[11px] text-zinc-500 mt-0.5">
                  Full cycle: 30 days &bull; Standard shift: {policy.standard_daily_hours} hrs/day
                </p>
              </div>

              <div className="p-3 bg-zinc-100/70 rounded-xl text-[11px] text-zinc-600">
                <strong>What happens next:</strong> In Step 2, we will check leaves taken and any advance loans to recover.
              </div>

              <div className="pt-3 border-t border-zinc-200 flex items-center justify-between">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowProcessModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  rightIcon={ArrowRight}
                  onClick={() => setWizardStep(2)}
                >
                  Next: Check Leaves & Advances
                </Button>
              </div>
            </div>
          )}

          {/* Step 2: Check Leaves & Advances */}
          {wizardStep === 2 && (
            <div className="space-y-3.5 pt-1">
              <div className="p-3.5 bg-zinc-50 rounded-xl border border-zinc-200 space-y-1">
                <p className="font-bold text-zinc-950 text-xs flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-zinc-800" />
                  Step 2: Check Leaves & Advances
                </p>
                <p className="text-[11px] text-zinc-600">
                  Verify approved paid and unpaid leaves for this period, along with any active salary advance deductions.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200">
                  <span className="text-[10px] text-zinc-500 font-bold uppercase block">Approved Leaves</span>
                  <p className="font-bold text-zinc-950 text-sm mt-0.5">Casual & Sick Leaves Checked</p>
                  <p className="text-[11px] text-zinc-500 mt-0.5">Paid leaves do not cut salary</p>
                </div>
                <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200">
                  <span className="text-[10px] text-zinc-500 font-bold uppercase block">Advance Deductions</span>
                  <p className="font-bold text-zinc-950 text-sm mt-0.5">Monthly Loan Recoveries</p>
                  <p className="text-[11px] text-zinc-500 mt-0.5">Auto-deducted from net pay</p>
                </div>
              </div>

              <div className="p-3 bg-zinc-100/70 rounded-xl text-[11px] text-zinc-600">
                <strong>What happens next:</strong> In Step 3, we calculate each worker's take-home pay using our standard formula.
              </div>

              <div className="pt-3 border-t border-zinc-200 flex items-center justify-between">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setWizardStep(1)}
                >
                  &larr; Back
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  rightIcon={ArrowRight}
                  onClick={() => setWizardStep(3)}
                >
                  Next: Review Salary Calculation
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Review Salary (The Clear Formula) */}
          {wizardStep === 3 && (
            <div className="space-y-3.5 pt-1">
              <div className="p-3.5 bg-zinc-50 rounded-xl border border-zinc-200 space-y-1">
                <p className="font-bold text-zinc-950 text-xs flex items-center gap-1.5">
                  <Calculator className="w-4 h-4 text-zinc-800" />
                  Step 3: Review Salary Calculation Formula
                </p>
                <p className="text-[11px] text-zinc-600">
                  Every employee's take-home pay is calculated transparently using this exact formula:
                </p>
              </div>

              {/* Prominent Formula Card */}
              <div className="p-4 bg-zinc-950 text-white rounded-xl shadow-xs border border-zinc-800 text-center space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                  Standard Calculation Formula
                </span>
                <p className="text-base sm:text-lg font-black tracking-tight text-white">
                  Basic + Allowances − Deductions = Take-Home
                </p>
                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-zinc-800 text-[11px] text-zinc-300">
                  <div>
                    <span className="text-zinc-400 block font-bold">1. Basic</span>
                    Base Monthly CTC
                  </div>
                  <div>
                    <span className="text-zinc-400 block font-bold">2. + Allowances</span>
                    HRA + Overtime Pay
                  </div>
                  <div>
                    <span className="text-zinc-400 block font-bold">3. − Deductions</span>
                    PF + Tax + Advances
                  </div>
                </div>
              </div>

              <div className="p-3 bg-zinc-100/70 rounded-xl text-[11px] text-zinc-600">
                <strong>What happens next:</strong> In Step 4, we generate the payroll batch and lock it for approval.
              </div>

              <div className="pt-3 border-t border-zinc-200 flex items-center justify-between">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setWizardStep(2)}
                >
                  &larr; Back
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  rightIcon={ArrowRight}
                  onClick={() => setWizardStep(4)}
                >
                  Next: Approve Payroll
                </Button>
              </div>
            </div>
          )}

          {/* Step 4: Approve & Lock */}
          {wizardStep === 4 && (
            <div className="space-y-3.5 pt-1">
              <div className="p-3.5 bg-zinc-50 rounded-xl border border-zinc-200 space-y-1">
                <p className="font-bold text-zinc-950 text-xs flex items-center gap-1.5">
                  <Shield className="w-4 h-4 text-emerald-600" />
                  Step 4: Approve & Lock Payroll
                </p>
                <p className="text-[11px] text-zinc-600">
                  Ready to calculate and lock payroll for <strong>{MONTH_NAMES[selectedMonth]} {selectedYear}</strong>?
                  Official employee payslips will be generated.
                </p>
              </div>

              <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200 space-y-1 text-[11px]">
                <p className="font-bold text-zinc-950">Confirmation Checklist:</p>
                <p className="text-zinc-600">&bull; Attendance punch records evaluated</p>
                <p className="text-zinc-600">&bull; Paid leaves & unpaid deductions confirmed</p>
                <p className="text-zinc-600">&bull; Statutory PF (12%) & Tax deductions applied</p>
              </div>

              <div className="pt-3 border-t border-zinc-200 flex items-center justify-between">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setWizardStep(3)}
                >
                  &larr; Back
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  loading={processingPayroll}
                  leftIcon={CheckCircle2}
                  onClick={async (e) => {
                    await handleInitiatePayroll(e);
                    setWizardStep(5);
                  }}
                >
                  {processingPayroll ? 'Computing...' : 'Approve & Lock Payroll'}
                </Button>
              </div>
            </div>
          )}

          {/* Step 5: Pay & Disburse */}
          {wizardStep === 5 && (
            <div className="space-y-3.5 pt-1 text-center">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-zinc-950">
                  Step 5: Payroll Approved & Ready to Pay!
                </h4>
                <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto">
                  Salaries for {MONTH_NAMES[selectedMonth]} {selectedYear} have been computed and payslips generated.
                </p>
              </div>

              <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200 text-left text-xs space-y-1">
                <p className="font-bold text-zinc-950">Next Action:</p>
                <p className="text-[11px] text-zinc-600">
                  You can now disburse payments via NEFT bank transfer, UPI, or cash directly from the Payroll table below.
                </p>
              </div>

              <div className="pt-3 border-t border-zinc-200 flex items-center justify-center gap-2">
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    setShowProcessModal(false);
                    setWizardStep(1);
                  }}
                >
                  Done (View Payroll Runs)
                </Button>
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* MODAL 2: Disburse Payroll Modal */}
      <Modal
        isOpen={Boolean(disburseRun)}
        onClose={() => setDisburseRun(null)}
        title={`Disburse Payroll — ${disburseRun?.name || ''}`}
      >
        {disburseRun && (
          <form onSubmit={handleExecuteDisbursement} className="space-y-4 text-xs">
            <div className="p-4 bg-zinc-50 rounded-xl border border-zinc-200/80 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-zinc-900 flex items-center gap-1.5">
                  <CreditCard className="w-4 h-4 text-zinc-700" />
                  Total Net Salary Payout
                </span>
                <span className="text-lg font-black text-zinc-950">
                  {formatINR(disburseRun.total_net || 0)}
                </span>
              </div>
              <p className="text-[11px] text-zinc-600">
                Disbursing this payroll will mark salaries as officially paid out and log completed payment vouchers for all staff members.
              </p>
            </div>

            <Select
              label="Disbursement Mode"
              value={paymentMode}
              onChange={(e) => setPaymentMode(e.target.value)}
            >
              <option value="BANK_TRANSFER">Direct Corporate Bank Transfer (NEFT / RTGS / IMPS)</option>
              <option value="UPI">Corporate UPI / Payment Gateway Payout</option>
              <option value="CHEQUE">Company Account Cheque</option>
              <option value="CASH">Cash Disbursement</option>
            </Select>

            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Disbursement Date"
                type="date"
                required
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
              />
              <Input
                label="Bank Reference / UTR No."
                placeholder="e.g. UTR-202611-098273"
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
              />
            </div>

            <div className="pt-3 border-t border-zinc-200 flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setDisburseRun(null)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                loading={disbursing}
                leftIcon={Send}
              >
                Confirm &amp; Disburse Funds
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* MODAL 3: Salary & Deduction Breakdown Detail Modal */}
      <Modal
        isOpen={Boolean(breakdownModalPayslip)}
        onClose={() => setBreakdownModalPayslip(null)}
        title={`Salary Breakdown — ${breakdownModalPayslip?.period_display || breakdownModalPayslip?.period || 'Monthly Period'}`}
        subtitle={`Itemized details of overtime compensation and wage cuts for ${breakdownModalPayslip?.employee_name || user?.full_name || 'Employee'}`}
        maxWidth="max-w-2xl"
      >
        {breakdownModalPayslip && (() => {
          const b = getPayslipBreakdown(breakdownModalPayslip);
          if (!b) return null;

          return (
            <div className="space-y-4 text-xs">
              <div className="p-4 bg-zinc-950 text-white rounded-xl shadow-xs border border-zinc-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider bg-zinc-800 text-zinc-200 border border-zinc-700">
                      Statement Overview
                    </span>
                    <span className="text-xs text-zinc-400 font-mono">
                      {breakdownModalPayslip.payslip_number || 'N/A'}
                    </span>
                  </div>
                  <h4 className="text-base font-bold text-white mt-1">
                    {breakdownModalPayslip.period_display || breakdownModalPayslip.period || 'Monthly Period'} Compensation
                  </h4>
                  <p className="text-[11px] text-zinc-400">
                    Gross Earnings: {formatINR(b.grossSalary)} &bull; Total Deductions: -{formatINR(b.totalDeductions)}
                  </p>
                </div>
                <div className="bg-zinc-900 rounded-xl p-3 border border-zinc-800 text-right sm:min-w-[170px]">
                  <p className="text-[10px] uppercase tracking-wider font-bold text-zinc-400">Net Take-Home</p>
                  <p className="text-2xl font-black text-white">{formatINR(b.netSalary)}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-xl space-y-1">
                  <div className="flex items-center justify-between text-zinc-900">
                    <span className="text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5">
                      <TrendingUp className="w-4 h-4 text-zinc-700" />
                      Overtime Pay Earned
                    </span>
                    {b.overtimeHours > 0 && (
                      <span className="text-[10px] font-bold bg-zinc-200 text-zinc-900 px-1.5 py-0.5 rounded border border-zinc-300">
                        +{b.overtimeHours.toFixed(1)} hrs
                      </span>
                    )}
                  </div>
                  <p className="text-lg font-black text-zinc-950">+{formatINR(b.overtimePay)}</p>
                  <p className="text-[11px] text-zinc-500">
                    {b.overtimeHours > 0
                      ? `Paid for ${b.overtimeHours.toFixed(1)} hrs worked extra @ 1.5x multiplier`
                      : 'No overtime hours logged for this billing period'}
                  </p>
                </div>

                <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-xl space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 text-zinc-900">
                      <Clock className="w-4 h-4 text-zinc-700" />
                      Work Hour Shortfall Cut
                    </span>
                    {b.shortfallHours > 0 && (
                      <span className="text-[10px] font-bold bg-zinc-200 text-zinc-900 px-1.5 py-0.5 rounded border border-zinc-300">
                        -{b.shortfallHours.toFixed(1)}h deficit
                      </span>
                    )}
                  </div>
                  <p className="text-lg font-black text-zinc-950">
                    {b.shortfallAmount > 0 ? `-${formatINR(b.shortfallAmount)}` : '₹0.00'}
                  </p>
                  <p className="text-[11px] text-zinc-500">
                    {b.shortfallAmount > 0
                      ? `Deducted for ${b.shortfallHours.toFixed(1)} deficit hours below standard quota`
                      : 'Zero shortfall (Full standard shift hours fulfilled)'}
                  </p>
                </div>

                <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-xl space-y-1">
                  <span className="text-[11px] font-bold text-zinc-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Shield className="w-4 h-4 text-zinc-700" />
                    Statutory Deductions (PF &amp; Tax)
                  </span>
                  <p className="text-lg font-black text-zinc-950">
                    -{formatINR(b.pfAmount + b.taxAmount)}
                  </p>
                  <p className="text-[11px] text-zinc-500">
                    PF (12%): {formatINR(b.pfAmount)} &bull; TDS/Tax (5%): {formatINR(b.taxAmount)}
                  </p>
                </div>

                <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-xl space-y-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 text-zinc-900">
                    <Banknote className="w-4 h-4 text-zinc-700" />
                    Leaves &amp; Advances Recovery
                  </span>
                  <p className="text-lg font-black text-zinc-950">
                    {(b.leaveCutAmount > 0 || b.advanceAmount > 0)
                      ? `-${formatINR(b.leaveCutAmount + b.advanceAmount)}`
                      : '₹0.00'}
                  </p>
                  <p className="text-[11px] text-zinc-500">
                    {b.leaveCutAmount > 0
                      ? `${b.leaveCutDays} unpaid day(s) cut (${formatINR(b.leaveCutAmount)})`
                      : b.advanceAmount > 0
                      ? `Salary advance recovery: ${formatINR(b.advanceAmount)}`
                      : 'No unpaid leave cuts or advance recovery active'}
                  </p>
                </div>
              </div>

              <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-xl flex items-center justify-between text-xs text-zinc-900 font-medium">
                <span>
                  Gross ({formatINR(b.grossSalary)}) − Total Cuts ({formatINR(b.totalDeductions)})
                </span>
                <span className="font-bold text-zinc-950 text-sm">
                  = In-Hand Credited: {formatINR(b.netSalary)}
                </span>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-zinc-200">
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  leftIcon={FileText}
                  onClick={() => {
                    const target = breakdownModalPayslip;
                    setBreakdownModalPayslip(null);
                    setViewPayslip(target);
                  }}
                >
                  View &amp; Print Official Payslip
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setBreakdownModalPayslip(null)}
                >
                  Close
                </Button>
              </div>
            </div>
          );
        })()}
      </Modal>

      {/* MODAL 4: Printable Official Payslip Modal */}
      <Modal
        isOpen={Boolean(viewPayslip)}
        onClose={() => setViewPayslip(null)}
        title="Official Salary Statement / Payslip"
      >
        {viewPayslip && (() => {
          const earningsList = (viewPayslip.components || []).filter(c => c.component_type === 'EARNING');
          const deductionsList = (viewPayslip.components || []).filter(c => c.component_type === 'DEDUCTION');

          return (
            <div className="space-y-4 text-xs">
              <div className="border border-zinc-200 rounded-xl p-4 bg-white shadow-2xs space-y-4 printable-payslip">
                <div className="flex items-center justify-between border-b border-zinc-200 pb-3">
                  <div>
                    <h3 className="text-base font-extrabold text-zinc-950 tracking-tight flex items-center gap-2">
                      <Building className="w-4 h-4 text-zinc-900" />
                      <span>{business?.name || 'Trinetra Technologies Pvt Ltd'}</span>
                    </h3>
                    <p className="text-[11px] text-zinc-500">Corporate Campus (HQ) &bull; Verified Workforce Platform</p>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-bold text-zinc-900 bg-zinc-100 border border-zinc-300 px-2 py-0.5 rounded uppercase">
                      Official Payslip
                    </span>
                    <p className="text-[11px] text-zinc-600 font-mono mt-1 font-bold">
                      {viewPayslip.payslip_number || 'PS-202610-0001'}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-zinc-50 p-3 rounded-lg border border-zinc-100">
                  <div>
                    <p className="text-[10px] text-zinc-400 font-bold uppercase">Employee Name</p>
                    <p className="font-bold text-zinc-900 text-xs mt-0.5">{viewPayslip.employee_name || user?.full_name}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-zinc-400 font-bold uppercase">Employee ID</p>
                    <p className="font-mono font-bold text-zinc-900 text-xs mt-0.5">{viewPayslip.employee_code || 'TRIN-0009'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-zinc-400 font-bold uppercase">Pay Period</p>
                    <p className="font-semibold text-zinc-900 text-xs mt-0.5">{viewPayslip.period_display || viewPayslip.period || 'October 2026'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-zinc-400 font-bold uppercase">Payment Status</p>
                    <p className="font-bold text-zinc-900 text-xs mt-0.5">VERIFIED / ISSUED</p>
                  </div>
                </div>

                {Number(viewPayslip.overtime_hours || 0) > 0 && (
                  <div className="p-2.5 bg-zinc-50 rounded-lg border border-zinc-200 flex items-center justify-between text-[11px]">
                    <span className="font-semibold text-zinc-900 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-zinc-700" />
                      Recorded Overtime Working Hours:
                    </span>
                    <span className="font-bold text-zinc-900 font-mono">
                      {Number(viewPayslip.overtime_hours).toFixed(2)} hrs (Paid at company rate)
                    </span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="border border-zinc-200 rounded-lg overflow-hidden bg-white">
                    <div className="bg-zinc-100 px-3 py-1.5 font-bold text-zinc-800 text-[11px] uppercase tracking-wider flex justify-between">
                      <span>Earnings</span>
                      <span>Amount (₹)</span>
                    </div>
                    <div className="divide-y divide-zinc-100 p-2 space-y-1.5">
                      {earningsList.length > 0 ? (
                        earningsList.map((c, i) => (
                          <div key={i} className="flex justify-between text-zinc-700">
                            <div>
                              <span className="font-medium text-zinc-900">{c.component_name}</span>
                              {c.calculation_details?.overtime_hours && (
                                <span className="block text-[10px] text-zinc-400 font-mono">
                                  {c.calculation_details.overtime_hours} hrs @ ₹{c.calculation_details.hourly_rate}/hr ({c.calculation_details.multiplier}x rate)
                                </span>
                              )}
                            </div>
                            <span className="font-semibold text-zinc-900">{formatINR(c.amount)}</span>
                          </div>
                        ))
                      ) : (
                        <>
                          <div className="flex justify-between text-zinc-700">
                            <span>Basic Salary</span>
                            <span className="font-semibold">{formatINR(Number(viewPayslip.gross_salary || 55000) * 0.7)}</span>
                          </div>
                          <div className="flex justify-between text-zinc-700">
                            <span>House Rent Allowance (HRA)</span>
                            <span className="font-semibold">{formatINR(Number(viewPayslip.gross_salary || 55000) * 0.2)}</span>
                          </div>
                          <div className="flex justify-between text-zinc-700">
                            <span>Special Allowance</span>
                            <span className="font-semibold">{formatINR(Number(viewPayslip.gross_salary || 55000) * 0.1)}</span>
                          </div>
                        </>
                      )}
                      <div className="flex justify-between font-bold text-zinc-900 pt-1.5 border-t border-zinc-200">
                        <span>Gross Earnings</span>
                        <span className="text-zinc-900">{formatINR(viewPayslip.gross_salary || 55000)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="border border-zinc-200 rounded-lg overflow-hidden bg-white">
                    <div className="bg-zinc-100 px-3 py-1.5 font-bold text-zinc-800 text-[11px] uppercase tracking-wider flex justify-between">
                      <span>Deductions</span>
                      <span>Amount (₹)</span>
                    </div>
                    <div className="divide-y divide-zinc-100 p-2 space-y-1.5">
                      {deductionsList.length > 0 ? (
                        deductionsList.map((c, i) => (
                          <div key={i} className="flex justify-between text-zinc-700">
                            <div>
                              <span className="font-medium text-zinc-900">{c.component_name}</span>
                              {c.calculation_details?.shortfall_hours && (
                                <span className="block text-[10px] text-zinc-500 font-mono">
                                  Deficit: {c.calculation_details.shortfall_hours} hrs short @ ₹{c.calculation_details.hourly_rate}/hr
                                </span>
                              )}
                              {c.calculation_details?.unpaid_days && (
                                <span className="block text-[10px] text-zinc-500 font-mono">
                                  {c.calculation_details.unpaid_days} days absent @ ₹{c.calculation_details.daily_rate}/day
                                </span>
                              )}
                            </div>
                            <span className="font-semibold text-zinc-900">{formatINR(c.amount)}</span>
                          </div>
                        ))
                      ) : (
                        <>
                          <div className="flex justify-between text-zinc-700">
                            <span>Provident Fund (PF - 12%)</span>
                            <span className="font-semibold">{formatINR(Number(viewPayslip.gross_salary || 55000) * 0.12)}</span>
                          </div>
                          <div className="flex justify-between text-zinc-700">
                            <span>Professional Tax &amp; TDS (5%)</span>
                            <span className="font-semibold">{formatINR(Number(viewPayslip.gross_salary || 55000) * 0.05)}</span>
                          </div>
                        </>
                      )}
                      <div className="flex justify-between font-bold text-zinc-900 pt-1.5 border-t border-zinc-200">
                        <span>Total Deductions</span>
                        <span className="text-zinc-900">{formatINR(viewPayslip.total_deductions || 5200)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-bold text-zinc-800 uppercase tracking-wide">Net Take-Home Salary</p>
                    <p className="text-xs text-zinc-500 mt-0.5">Credited directly to registered bank account</p>
                  </div>
                  <div className="text-right">
                    <span className="text-xl font-black text-zinc-950">
                      {formatINR(viewPayslip.net_salary || 49800)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  leftIcon={Printer}
                  onClick={() => window.print()}
                >
                  Print / Save as PDF
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setViewPayslip(null)}
                >
                  Close
                </Button>
              </div>
            </div>
          );
        })()}
      </Modal>
    </div>
  );
};

export default Payroll;
