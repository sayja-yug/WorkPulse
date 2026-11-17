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
} from 'lucide-react';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { Loader } from '../components/ui/Loader';
import { formatINR, formatDate } from '../utils/formatters';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export const Payroll = () => {
  const { isEmployee, isAuditor, canManagePayroll, user } = usePermissions();
  const { business } = useAuth();
  const { toast, confirm } = useNotification();

  const [runs, setRuns] = useState([]);
  const [payslips, setPayslips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(isEmployee ? 'payslips' : 'runs');

  // Modals
  const [showProcessModal, setShowProcessModal] = useState(false);
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
        // Employee fetches their personal payslips
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

      // 1. Create payroll run
      const res = await api.post('/payroll/runs/', payload);
      const newRun = res.data?.data || res.data;

      // 2. Automatically compute salaries, attendance proration, overtime, shortfall cuts, and statutory deductions
      if (newRun?.id) {
        await api.post(`/payroll/runs/${newRun.id}/calculate/`);
      }

      setShowProcessModal(false);
      await fetchData();
      toast.success(`Payroll cycle for ${monthName} ${selectedYear} initiated and computed according to company work hours & overtime rules!`);
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
      toast.success('Payroll calculation updated with company work hour & overtime rules!');
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Calculation failed');
    }
  };

  // Step 3: Approve & Lock Payroll (Generates official payslips)
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

  // Step 4: Disburse Payroll (Executes salary payout and records payment ledger)
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
      setPolicySuccessMsg('Company payroll, work hour & overtime rules saved successfully! Future and re-calculated payroll cycles will strictly follow these rules.');
      setTimeout(() => setPolicySuccessMsg(''), 6000);
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Failed to save company policy rules');
    } finally {
      setSavingPolicy(false);
    }
  };

  // Export Bank Transfer Excel/CSV Payout Sheet
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

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-zinc-950 tracking-tight flex items-center gap-2">
            <Banknote className="w-5 h-5 text-zinc-900" />
            <span>{isEmployee ? 'My Monthly Salary Statements' : 'Payroll & Salary Management'}</span>
          </h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            {isEmployee
              ? 'View and download your monthly salary statements, overtime earnings, and deduction breakdowns'
              : 'Rule-driven monthly payroll engine with automated overtime bonuses, shortfall hour cuts, and Indian statutory PF/Tax'}
          </p>
        </div>

        {/* Action Button strictly for Accountants & Owners */}
        {canManagePayroll && !isEmployee && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowProcessModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-zinc-950 hover:bg-black text-white rounded-lg text-xs font-bold shadow-xs transition-colors cursor-pointer"
            >
              <Calculator className="w-4 h-4" />
              <span>Process Monthly Payroll</span>
            </button>
          </div>
        )}

        {isAuditor && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-100 border border-zinc-300 text-zinc-800 rounded-lg text-xs font-semibold">
            <Shield className="w-4 h-4 text-zinc-700" />
            <span>Auditor Compliance Mode (Read-Only)</span>
          </div>
        )}
      </div>

      {/* Tabs - Only shown for Management & Auditors */}
      {!isEmployee && (
        <div className="flex items-center gap-2 border-b border-zinc-200 overflow-x-auto no-scrollbar whitespace-nowrap">
          <button
            onClick={() => setActiveTab('runs')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-colors cursor-pointer ${
              activeTab === 'runs'
                ? 'border-zinc-950 text-zinc-950'
                : 'border-transparent text-zinc-500 hover:text-zinc-800'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Payroll Runs ({runs.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('payslips')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-colors cursor-pointer ${
              activeTab === 'payslips'
                ? 'border-zinc-950 text-zinc-950'
                : 'border-transparent text-zinc-500 hover:text-zinc-800'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Generated Payslips ({payslips.length})</span>
          </button>
          {canManagePayroll && (
            <button
              onClick={() => setActiveTab('rules')}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-colors cursor-pointer ${
                activeTab === 'rules'
                  ? 'border-zinc-950 text-zinc-950'
                  : 'border-transparent text-zinc-500 hover:text-zinc-800'
              }`}
            >
              <Sliders className="w-4 h-4" />
              <span>Company Work Hours &amp; Overtime Rules</span>
            </button>
          )}
        </div>
      )}

      {/* Management View: Payroll Runs */}
      {!isEmployee && activeTab === 'runs' && (
        <div className="space-y-4">
          {/* Active Company Rule Status Banner */}
          <div className="p-3.5 bg-white rounded-xl border border-zinc-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5">
              <span className="p-2 bg-zinc-100 text-zinc-900 rounded-lg">
                <Clock className="w-4 h-4" />
              </span>
              <div>
                <p className="font-bold text-zinc-900">
                  Active Work &amp; Overtime Rules: {policy.standard_daily_hours}h/day standard
                  {policy.enable_overtime && ` • ${policy.overtime_multiplier}x Overtime Pay`}
                  {policy.enable_shortfall_deduction && ` • Shortfall Cut Active`}
                  {policy.enable_unpaid_leave_deduction && ` • Unpaid Leave Cut Active`}
                </p>
                <p className="text-[11px] text-zinc-500">
                  Salaries are automatically prorated with hour shortfall cuts and overtime bonuses during computation.
                </p>
              </div>
            </div>
            {canManagePayroll && (
              <button
                onClick={() => setActiveTab('rules')}
                className="px-3 py-1.5 text-zinc-900 hover:bg-zinc-100 rounded-lg border border-zinc-300 font-semibold text-[11px] whitespace-nowrap self-start sm:self-auto cursor-pointer transition-colors"
              >
                Modify Rules &rarr;
              </button>
            )}
          </div>

          <div className="bg-white rounded-xl border border-zinc-200 shadow-xs overflow-hidden">
            {loading ? (
              <Loader message="Loading payroll cycles..." />
            ) : runs.length === 0 ? (
              <div className="p-12 text-center text-zinc-500 dark:text-zinc-400 text-xs space-y-3">
                <Banknote className="w-8 h-8 text-zinc-300 dark:text-zinc-600 mx-auto" />
                <p className="font-semibold text-zinc-700 dark:text-zinc-300">No payroll cycles created yet.</p>
                <p className="text-zinc-400">Click &ldquo;Process Monthly Payroll&rdquo; to calculate and generate this month&apos;s salaries based on your company rules.</p>
                <button
                  onClick={() => setShowProcessModal(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-zinc-950 hover:bg-black text-white dark:bg-zinc-100 dark:hover:bg-white dark:text-zinc-950 rounded-lg text-xs font-bold shadow-xs transition-colors cursor-pointer"
                >
                  <Calculator className="w-3.5 h-3.5" />
                  <span>Initiate First Payroll</span>
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[800px] text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-zinc-100/70 dark:bg-zinc-800/60 border-b border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 font-semibold uppercase text-[11px] tracking-wider">
                      <th className="py-3 px-4">Cycle / Period</th>
                      <th className="py-3 px-4">Working Days</th>
                      <th className="py-3 px-4">Gross Total</th>
                      <th className="py-3 px-4">Deductions</th>
                      <th className="py-3 px-4">Net Payout</th>
                      <th className="py-3 px-4">Status</th>
                      {canManagePayroll && <th className="py-3 px-4 text-right">Actions</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
                    {runs.map((r) => {
                      const isDisbursed = r.is_disbursed || (r.status === 'LOCKED' && r.pay_date);
                      return (
                        <tr key={r.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors">
                          <td className="py-3.5 px-4 font-semibold text-zinc-900 dark:text-zinc-100">
                            <div className="flex items-center gap-1.5">
                              <span>{r.name}</span>
                              {isDisbursed && (
                                <Badge variant="default">
                                  Disbursed
                                </Badge>
                              )}
                            </div>
                            <div className="text-[10px] text-zinc-400 font-normal">
                              {r.period_start || r.start_date} to {r.period_end || r.end_date}
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-zinc-600 dark:text-zinc-400">{r.total_working_days || 30} days</td>
                          <td className="py-3.5 px-4 font-medium text-zinc-800 dark:text-zinc-200">{formatINR(r.total_gross || r.gross_total || 0)}</td>
                          <td className="py-3.5 px-4 text-zinc-600 dark:text-zinc-400 font-medium">-{formatINR(r.total_deductions || 0)}</td>
                          <td className="py-3.5 px-4 font-bold text-zinc-900 dark:text-zinc-100">{formatINR(r.total_net || r.net_total || 0)}</td>
                          <td className="py-3.5 px-4">
                            <Badge
                              variant={
                                isDisbursed
                                  ? 'default'
                                  : r.status === 'APPROVED'
                                  ? 'default'
                                  : r.status === 'LOCKED'
                                  ? 'neutral'
                                  : 'neutral'
                              }
                            >
                              {isDisbursed ? 'DISBURSED' : r.status}
                            </Badge>
                          </td>
                          {canManagePayroll && (
                            <td className="py-3.5 px-4 text-right whitespace-nowrap">
                              <div className="inline-flex items-center gap-2">
                                {/* DRAFT: Calculate */}
                                {r.status === 'DRAFT' && (
                                  <button
                                    onClick={() => handleCalculate(r.id)}
                                    className="px-2.5 py-1 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-900 dark:text-zinc-100 rounded text-xs font-semibold transition-colors"
                                  >
                                    Calculate
                                  </button>
                                )}

                                {/* REVIEW: Re-calculate or Approve & Lock */}
                                {r.status === 'REVIEW' && (
                                  <>
                                    <button
                                      onClick={() => handleCalculate(r.id)}
                                      className="px-2.5 py-1 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded text-xs font-semibold transition-colors"
                                      title="Re-calculate with current company rules & punch records"
                                    >
                                      Re-calc
                                    </button>
                                    <button
                                      onClick={() => handleApprove(r.id)}
                                      className="px-2.5 py-1 bg-zinc-950 hover:bg-black text-white dark:bg-zinc-100 dark:hover:bg-white dark:text-zinc-950 rounded text-xs font-bold transition-colors"
                                    >
                                      Approve &amp; Lock
                                    </button>
                                  </>
                                )}

                                {/* APPROVED: Ready for Salary Disbursement */}
                                {r.status === 'APPROVED' && !isDisbursed && (
                                  <button
                                    onClick={() => setDisburseRun(r)}
                                    className="inline-flex items-center gap-1.5 px-3 py-1 bg-zinc-950 hover:bg-black text-white dark:bg-zinc-100 dark:hover:bg-white dark:text-zinc-950 rounded-lg text-xs font-bold shadow-xs transition-colors"
                                    title="Disburse salaries to employees via bank transfer or cash"
                                  >
                                    <CreditCard className="w-3.5 h-3.5" />
                                    <span>Disburse Payroll</span>
                                  </button>
                                )}

                                {/* DISBURSED / PAID */}
                                {isDisbursed && (
                                  <button
                                    onClick={() => handleExportBankSheet(r)}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-zinc-50 dark:bg-zinc-900 dark:hover:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 rounded text-xs font-semibold transition-colors"
                                    title="Export Bank Transfer Instruction Sheet (CSV)"
                                  >
                                    <FileSpreadsheet className="w-3.5 h-3.5 text-zinc-700 dark:text-zinc-300" />
                                    <span>Bank Sheet</span>
                                  </button>
                                )}

                                {/* View Payslips link */}
                                <button
                                  onClick={() => setActiveTab('payslips')}
                                  className="px-2 py-1 text-zinc-900 dark:text-zinc-100 hover:underline text-xs font-semibold"
                                >
                                  Payslips &rarr;
                                </button>
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
          </div>
        </div>
      )}

      {/* Management View: Company Work Hours & Overtime Rules Tab */}
      {!isEmployee && activeTab === 'rules' && (
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-xs overflow-hidden p-6 max-w-4xl">
          <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-4 mb-6">
            <div>
              <h3 className="text-base font-bold text-zinc-950 dark:text-zinc-100 flex items-center gap-2">
                <Sliders className="w-5 h-5 text-zinc-900 dark:text-zinc-100" />
                <span>Company Work Hour &amp; Overtime Rules</span>
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                Configure your company's standard working hours, shortfall wage cut policies, and overtime payout rates.
              </p>
            </div>
            <span className="text-[11px] font-semibold text-zinc-800 dark:text-zinc-200 bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 px-2.5 py-1 rounded-full">
              Automated Rule Engine Active
            </span>
          </div>

          {policySuccessMsg && (
            <div className="mb-6 p-3 bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 rounded-lg text-xs font-medium flex items-center gap-2">
              <Check className="w-4 h-4 text-zinc-900 dark:text-zinc-100 shrink-0" />
              <span>{policySuccessMsg}</span>
            </div>
          )}

          <form onSubmit={handleSavePolicy} className="space-y-6 text-xs">
            {/* Rule 1: Work Hours Configuration */}
            <div className="p-4 bg-zinc-50 dark:bg-zinc-850 rounded-xl border border-zinc-200 dark:border-zinc-800 space-y-4">
              <h4 className="font-bold text-zinc-950 dark:text-zinc-100 text-sm flex items-center gap-2">
                <Clock className="w-4 h-4 text-zinc-900 dark:text-zinc-100" />
                <span>Standard Working Hours Threshold</span>
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    Standard Daily Work Hours (Hours / Day) *
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="1"
                    max="24"
                    required
                    value={policy.standard_daily_hours}
                    onChange={(e) => setPolicy({ ...policy, standard_daily_hours: parseFloat(e.target.value) || 8.0 })}
                    className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 outline-none focus:ring-1 focus:ring-zinc-950 font-semibold"
                  />
                  <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-1">
                    Baseline daily duty requirement (typically 8.0 hours). Punch times below this are flagged as shortfall; times above earn overtime.
                  </p>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    Standard Weekly Work Hours (Hours / Week) *
                  </label>
                  <input
                    type="number"
                    step="1"
                    min="10"
                    max="100"
                    required
                    value={policy.standard_weekly_hours}
                    onChange={(e) => setPolicy({ ...policy, standard_weekly_hours: parseFloat(e.target.value) || 40.0 })}
                    className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 outline-none focus:ring-1 focus:ring-zinc-950 font-semibold"
                  />
                  <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-1">
                    Weekly duty threshold for 5-day (40 hrs) or 6-day (48 hrs) work weeks.
                  </p>
                </div>
              </div>
            </div>

            {/* Rule 2: Overtime Pay Rules */}
            <div className="p-4 bg-zinc-50 dark:bg-zinc-850 rounded-xl border border-zinc-200 dark:border-zinc-800 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-zinc-950 dark:text-zinc-100 text-sm flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-zinc-900 dark:text-zinc-100" />
                    <span>Overtime (OT) Pay Policy</span>
                  </h4>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                    Pay employees additional compensation when they exceed the standard daily working hours.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={policy.enable_overtime}
                    onChange={(e) => setPolicy({ ...policy, enable_overtime: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-zinc-200 dark:bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-zinc-950 dark:peer-checked:bg-zinc-100 dark:peer-checked:after:bg-zinc-950"></div>
                </label>
              </div>

              {policy.enable_overtime && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-zinc-200 dark:border-zinc-700">
                  <div>
                    <label className="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                      Overtime Payout Rate Multiplier *
                    </label>
                    <select
                      value={policy.overtime_multiplier}
                      onChange={(e) => setPolicy({ ...policy, overtime_multiplier: parseFloat(e.target.value) })}
                      className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 outline-none focus:ring-1 focus:ring-zinc-950 font-semibold"
                    >
                      <option value={1.0}>1.0x (Regular Hourly Wage)</option>
                      <option value={1.25}>1.25x (Time and a Quarter)</option>
                      <option value={1.5}>1.5x (Time and a Half - Standard)</option>
                      <option value={2.0}>2.0x (Double Time)</option>
                    </select>
                    <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-1">
                      Formula: (OT Hours) &times; (Hourly Rate) &times; ({policy.overtime_multiplier}x)
                    </p>
                  </div>
                  <div className="bg-white dark:bg-zinc-900 p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 text-[11px] space-y-1">
                    <p className="font-bold text-zinc-900 dark:text-zinc-100">Example Overtime Calculation:</p>
                    <p className="text-zinc-600 dark:text-zinc-400">
                      An employee with &#8377;30,000/mo salary earns approx. &#8377;125/hr. If they work 10 hrs (2 hrs OT) in an 8-hr day, they receive:
                    </p>
                    <p className="font-mono font-bold text-zinc-900 dark:text-zinc-100">
                      2 hrs &times; &#8377;125 &times; {policy.overtime_multiplier} = &#8377;{(2 * 125 * policy.overtime_multiplier).toFixed(2)} OT Pay
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Rule 3: Shortfall Deficit Salary Cut Policy */}
            <div className="p-4 bg-zinc-50 dark:bg-zinc-850 rounded-xl border border-zinc-200 dark:border-zinc-800 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-zinc-950 dark:text-zinc-100 text-sm flex items-center gap-2">
                    <TrendingDown className="w-4 h-4 text-zinc-900 dark:text-zinc-100" />
                    <span>Incomplete Work Hours Shortfall Deduction (Salary Cut)</span>
                  </h4>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                    Automatically cut salary if an employee works fewer hours than the required daily company rule.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={policy.enable_shortfall_deduction}
                    onChange={(e) => setPolicy({ ...policy, enable_shortfall_deduction: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-zinc-200 dark:bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-zinc-950 dark:peer-checked:bg-zinc-100 dark:peer-checked:after:bg-zinc-950"></div>
                </label>
              </div>

              {policy.enable_shortfall_deduction && (
                <div className="bg-white dark:bg-zinc-900 p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 text-[11px] space-y-1">
                  <p className="font-bold text-zinc-900 dark:text-zinc-100">How Shortfall Deduction Works:</p>
                  <p className="text-zinc-600 dark:text-zinc-400">
                    If an employee logs out early (e.g., worked 6.0 hrs instead of {policy.standard_daily_hours} hrs), the system logs a {policy.standard_daily_hours - 6.0} hr deficit.
                  </p>
                  <p className="font-mono font-bold text-zinc-900 dark:text-zinc-100">
                    Deduction: (Deficit Hours) &times; (Hourly Rate) = Itemized as "Work Hour Shortfall Cut" on their monthly payslip.
                  </p>
                </div>
              )}
            </div>

            {/* Rule 4: Leave & Absence Cut Policy */}
            <div className="p-4 bg-zinc-50 dark:bg-zinc-850 rounded-xl border border-zinc-200 dark:border-zinc-800 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-zinc-950 dark:text-zinc-100 text-sm flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-zinc-900 dark:text-zinc-100" />
                    <span>Unpaid Leave &amp; Absenteeism Salary Cut</span>
                  </h4>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                    Deduct full daily rate for each unapproved absence or approved unpaid leave day.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={policy.enable_unpaid_leave_deduction}
                    onChange={(e) => setPolicy({ ...policy, enable_unpaid_leave_deduction: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-zinc-200 dark:bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-zinc-950 dark:peer-checked:bg-zinc-100 dark:peer-checked:after:bg-zinc-950"></div>
                </label>
              </div>

              {policy.enable_unpaid_leave_deduction && (
                <div className="bg-white dark:bg-zinc-900 p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 text-[11px] space-y-1">
                  <p className="font-bold text-zinc-900 dark:text-zinc-100">Unpaid Days Treatment:</p>
                  <p className="text-zinc-600 dark:text-zinc-400">
                    Approved Paid Leaves receive 100% full wage. Unpaid leaves or unapproved absent days trigger a 1-day wage deduction: (Unpaid Days) &times; (Daily Base Rate).
                  </p>
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-end gap-3">
              <button
                type="submit"
                disabled={savingPolicy}
                className="px-5 py-2 bg-zinc-950 hover:bg-black text-white dark:bg-zinc-100 dark:hover:bg-white dark:text-zinc-950 rounded-lg font-bold flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>{savingPolicy ? 'Saving Rules...' : 'Save Company Payroll Rules'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Payslips Section (Self-service for employee, or all staff for management) */}
      {(isEmployee || activeTab === 'payslips') && (
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-850/50 flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold text-zinc-950 dark:text-zinc-100 uppercase tracking-wider">
                {isEmployee ? 'My Issued Payslips' : 'Generated Staff Payslips'}
              </h3>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                Click &quot;Details&quot; on any statement to view itemized overtime earnings and salary cut deductions.
              </p>
            </div>
            <span className="text-[11px] font-semibold text-zinc-800 dark:text-zinc-200 bg-zinc-100 dark:bg-zinc-800 px-2.5 py-1 rounded border border-zinc-300 dark:border-zinc-700">
              {payslips.length} Statements Found
            </span>
          </div>

            {loading ? (
              <Loader message="Loading payslip statements..." />
            ) : payslips.length === 0 ? (
              <div className="p-12 text-center text-zinc-500 dark:text-zinc-400 text-xs space-y-2">
                <FileText className="w-8 h-8 text-zinc-300 dark:text-zinc-600 mx-auto" />
                <p className="font-semibold text-zinc-700 dark:text-zinc-300">No payslips found in the active billing cycles.</p>
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
                    <tr className="bg-zinc-50 dark:bg-zinc-850 border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 font-semibold uppercase text-[11px] tracking-wider">
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
                  <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                    {payslips.map((p, idx) => {
                      const pKey = p.id || idx;
                      const isExpanded = Boolean(expandedPayslips[pKey]);
                      const b = getPayslipBreakdown(p);

                      return (
                        <React.Fragment key={pKey}>
                          <tr className={`hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors ${isExpanded ? 'bg-zinc-100 dark:bg-zinc-800' : ''}`}>
                            <td className="py-3.5 px-4 font-semibold text-zinc-900 dark:text-zinc-100">
                              <p className="font-bold text-zinc-900 dark:text-zinc-100">{p.period_display || p.period || 'Monthly Period'}</p>
                              <p className="text-[10px] text-zinc-400 font-mono">{p.payslip_number || `PS-${idx + 1}`}</p>
                            </td>
                            {!isEmployee && (
                              <td className="py-3.5 px-4 text-zinc-700 dark:text-zinc-300 font-medium">
                                <p className="font-semibold text-zinc-900 dark:text-zinc-100">{p.employee_name || 'Staff Member'}</p>
                                <p className="text-[11px] text-zinc-400 font-mono">{p.employee_code || p.payslip_number}</p>
                              </td>
                            )}
                            <td className="py-3.5 px-4 text-zinc-700 dark:text-zinc-300 font-medium">
                              <span className="font-semibold">{formatINR(p.gross_salary || 55000)}</span>
                            </td>
                            <td className="py-3.5 px-4 font-medium">
                              {b.overtimeHours > 0 ? (
                                <div className="space-y-0.5">
                                  <div className="flex items-center gap-1">
                                    <span className="text-zinc-900 dark:text-zinc-100 font-bold bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded border border-zinc-300 dark:border-zinc-700 text-[11px] inline-flex items-center gap-1">
                                      <TrendingUp className="w-3 h-3 text-zinc-700 dark:text-zinc-300" />
                                      +{b.overtimeHours.toFixed(1)} hrs OT
                                    </span>
                                  </div>
                                  <p className="text-[11px] font-bold text-zinc-900 dark:text-zinc-100 font-mono">
                                    +{formatINR(b.overtimePay)}
                                  </p>
                                </div>
                              ) : (
                                <span className="text-zinc-400 text-[11px]">0.0 hrs (₹0)</span>
                              )}
                            </td>
                            <td className="py-3.5 px-4">
                              <div className="space-y-1">
                                <span className="font-bold text-zinc-900 dark:text-zinc-100 text-xs">
                                  -{formatINR(p.total_deductions || 5200)}
                                </span>
                                {/* Short details pills showing WHERE salary was cut */}
                                <div className="flex flex-wrap gap-1 max-w-[280px]">
                                  {b.shortfallAmount > 0 && (
                                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border border-zinc-300 dark:border-zinc-700" title={`${b.shortfallHours.toFixed(1)}h deficit from standard quota`}>
                                      Shortfall: -{formatINR(b.shortfallAmount)}
                                    </span>
                                  )}
                                  {b.leaveCutAmount > 0 && (
                                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border border-zinc-300 dark:border-zinc-700" title={`${b.leaveCutDays} days unpaid leave`}>
                                      Leave Cut: -{formatINR(b.leaveCutAmount)}
                                    </span>
                                  )}
                                  {b.advanceAmount > 0 && (
                                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border border-zinc-300 dark:border-zinc-700">
                                      Advance: -{formatINR(b.advanceAmount)}
                                    </span>
                                  )}
                                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700">
                                    PF (12%): -{formatINR(b.pfAmount)}
                                  </span>
                                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700">
                                    Tax (5%): -{formatINR(b.taxAmount)}
                                  </span>
                                </div>
                              </div>
                            </td>
                            <td className="py-3.5 px-4 font-bold text-zinc-950 dark:text-zinc-50 text-sm">
                              {formatINR(p.net_salary || 49800)}
                            </td>
                            <td className="py-3.5 px-4">
                              <Badge variant="default">ISSUED</Badge>
                            </td>
                            <td className="py-3.5 px-4 text-right">
                              <div className="inline-flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => setBreakdownModalPayslip(p)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-zinc-950 hover:bg-black text-white dark:bg-zinc-100 dark:hover:bg-white dark:text-zinc-950 rounded-lg text-xs font-bold transition-colors shadow-2xs cursor-pointer"
                                  title="View itemized breakdown of overtime earnings and salary cuts"
                                >
                                  <Calculator className="w-3.5 h-3.5" />
                                  <span>Details</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setViewPayslip(p)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-zinc-50 dark:bg-zinc-900 dark:hover:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-lg text-xs font-semibold transition-colors shadow-2xs cursor-pointer"
                                  title="View and print official payslip"
                                >
                                  <FileText className="w-3.5 h-3.5 text-zinc-500" />
                                  <span className="hidden sm:inline">View &amp; Print</span>
                                </button>
                              </div>
                            </td>
                          </tr>
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

      {/* MODAL 1: Process Monthly Payroll Modal */}
      <Modal
        isOpen={showProcessModal}
        onClose={() => setShowProcessModal(false)}
        title="Initiate & Process Monthly Payroll"
      >
        <form onSubmit={handleInitiatePayroll} className="space-y-4 text-xs">
          <div className="p-3 bg-zinc-50 dark:bg-zinc-850 rounded-xl border border-zinc-200 dark:border-zinc-800 space-y-1">
            <p className="font-bold text-zinc-950 dark:text-zinc-100 flex items-center gap-1.5">
              <Calculator className="w-4 h-4 text-zinc-700 dark:text-zinc-300" />
              Automated Rule-Driven Payroll Engine
            </p>
            <p className="text-[11px] text-zinc-600 dark:text-zinc-400 leading-relaxed">
              Initiating payroll scans active employee base salaries, aggregates monthly attendance punch logs, computes working days, and automatically applies company rules:
              standard daily hours ({policy.standard_daily_hours}h), overtime multiplier ({policy.overtime_multiplier}x), shortfall deductions, and statutory PF/TDS math.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Payroll Month *</label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 outline-none focus:ring-1 focus:ring-zinc-950"
              >
                {MONTH_NAMES.map((m, idx) => (
                  <option key={m} value={idx}>{m}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Payroll Year *</label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 outline-none focus:ring-1 focus:ring-zinc-950"
              >
                <option value={2025}>2025</option>
                <option value={2026}>2026</option>
                <option value={2027}>2027</option>
              </select>
            </div>
          </div>

          <div className="p-3 bg-zinc-50 dark:bg-zinc-850 rounded-lg border border-zinc-200 dark:border-zinc-800">
            <p className="text-[11px] text-zinc-500 font-semibold uppercase mb-1">Target Payroll Cycle</p>
            <p className="font-bold text-zinc-900 dark:text-zinc-100 text-sm">
              {MONTH_NAMES[selectedMonth]} {selectedYear} Monthly Payroll
            </p>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
              Period: {selectedYear}-{String(selectedMonth + 1).padStart(2, '0')}-01 to {selectedYear}-{String(selectedMonth + 1).padStart(2, '0')}-{new Date(selectedYear, selectedMonth + 1, 0).getDate()} (30 days)
            </p>
          </div>

          <div className="pt-3 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowProcessModal(false)}
              className="px-3 py-1.5 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={processingPayroll}
              className="px-4 py-1.5 bg-zinc-950 hover:bg-black text-white dark:bg-zinc-100 dark:hover:bg-white dark:text-zinc-950 rounded-lg font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Calculator className="w-3.5 h-3.5" />
              <span>{processingPayroll ? 'Computing Salaries...' : 'Compute & Generate Payroll'}</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL 2: Disburse Payroll Modal */}
      <Modal
        isOpen={Boolean(disburseRun)}
        onClose={() => setDisburseRun(null)}
        title={`Disburse Payroll — ${disburseRun?.name || ''}`}
      >
        {disburseRun && (
          <form onSubmit={handleExecuteDisbursement} className="space-y-4 text-xs">
            <div className="p-4 bg-zinc-50 dark:bg-zinc-850 rounded-xl border border-zinc-200 dark:border-zinc-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                  <CreditCard className="w-4 h-4 text-zinc-700 dark:text-zinc-300" />
                  Total Net Salary Payout
                </span>
                <span className="text-lg font-black text-zinc-950 dark:text-zinc-50">
                  {formatINR(disburseRun.total_net || 0)}
                </span>
              </div>
              <p className="text-[11px] text-zinc-600 dark:text-zinc-400">
                Disbursing this payroll will mark salaries as officially paid out and log completed payment vouchers for all staff members.
              </p>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Disbursement Mode *</label>
              <select
                value={paymentMode}
                onChange={(e) => setPaymentMode(e.target.value)}
                className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 outline-none focus:ring-1 focus:ring-zinc-950"
              >
                <option value="BANK_TRANSFER">Direct Corporate Bank Transfer (NEFT / RTGS / IMPS)</option>
                <option value="UPI">Corporate UPI / Payment Gateway Payout</option>
                <option value="CHEQUE">Company Account Cheque</option>
                <option value="CASH">Cash Disbursement</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Disbursement Date *</label>
                <input
                  type="date"
                  required
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="w-full px-3 py-1.5 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Bank Reference / UTR No.</label>
                <input
                  type="text"
                  placeholder="e.g. UTR-202611-098273"
                  value={referenceNumber}
                  onChange={(e) => setReferenceNumber(e.target.value)}
                  className="w-full px-3 py-1.5 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 outline-none"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setDisburseRun(null)}
                className="px-3 py-1.5 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={disbursing}
                className="px-4 py-1.5 bg-zinc-950 hover:bg-black text-white dark:bg-zinc-100 dark:hover:bg-white dark:text-zinc-950 rounded-lg font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{disbursing ? 'Processing Disbursement...' : 'Confirm & Disburse Funds'}</span>
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* MODAL: Salary & Deduction Breakdown Detail Modal */}
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
              {/* Top Banner: Statement & Net Take-Home */}
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
                    Gross Earnings: {formatINR(b.grossSalary)} • Total Deductions: -{formatINR(b.totalDeductions)}
                  </p>
                </div>
                <div className="bg-zinc-900 rounded-xl p-3 border border-zinc-800 text-right sm:min-w-[170px]">
                  <p className="text-[10px] uppercase tracking-wider font-bold text-zinc-400">Net Take-Home</p>
                  <p className="text-2xl font-black text-white">{formatINR(b.netSalary)}</p>
                </div>
              </div>

              {/* 4 Metric Chips */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* 1. Overtime Pay */}
                <div className="p-3 bg-zinc-50 dark:bg-zinc-850 border border-zinc-200 dark:border-zinc-800 rounded-xl space-y-1">
                  <div className="flex items-center justify-between text-zinc-900 dark:text-zinc-100">
                    <span className="text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5">
                      <TrendingUp className="w-4 h-4 text-zinc-700 dark:text-zinc-300" />
                      Overtime Pay Earned
                    </span>
                    {b.overtimeHours > 0 && (
                      <span className="text-[10px] font-bold bg-zinc-200 dark:bg-zinc-750 text-zinc-900 dark:text-zinc-100 px-1.5 py-0.5 rounded border border-zinc-300 dark:border-zinc-700">
                        +{b.overtimeHours.toFixed(1)} hrs
                      </span>
                    )}
                  </div>
                  <p className="text-lg font-black text-zinc-950 dark:text-zinc-50">
                    +{formatINR(b.overtimePay)}
                  </p>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    {b.overtimeHours > 0
                      ? `Paid for ${b.overtimeHours.toFixed(1)} hrs worked extra @ 1.5x overtime multiplier`
                      : 'No overtime hours logged for this billing period'}
                  </p>
                </div>

                {/* 2. Hour Shortfall Cut */}
                <div className="p-3 bg-zinc-50 dark:bg-zinc-850 border border-zinc-200 dark:border-zinc-800 rounded-xl space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 text-zinc-900 dark:text-zinc-100">
                      <Clock className="w-4 h-4 text-zinc-700 dark:text-zinc-300" />
                      Work Hour Shortfall Cut
                    </span>
                    {b.shortfallHours > 0 && (
                      <span className="text-[10px] font-bold bg-zinc-200 dark:bg-zinc-750 text-zinc-900 dark:text-zinc-100 px-1.5 py-0.5 rounded border border-zinc-300 dark:border-zinc-700">
                        -{b.shortfallHours.toFixed(1)}h deficit
                      </span>
                    )}
                  </div>
                  <p className="text-lg font-black text-zinc-950 dark:text-zinc-50">
                    {b.shortfallAmount > 0 ? `-${formatINR(b.shortfallAmount)}` : '₹0.00'}
                  </p>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    {b.shortfallAmount > 0
                      ? `Deducted for ${b.shortfallHours.toFixed(1)} deficit hours below standard daily quota`
                      : 'Zero shortfall (Full standard shift hours fulfilled)'}
                  </p>
                </div>

                {/* 3. Statutory Deductions */}
                <div className="p-3 bg-zinc-50 dark:bg-zinc-850 border border-zinc-200 dark:border-zinc-800 rounded-xl space-y-1">
                  <span className="text-[11px] font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider flex items-center gap-1.5">
                    <Shield className="w-4 h-4 text-zinc-700 dark:text-zinc-300" />
                    Statutory Deductions (PF &amp; Tax)
                  </span>
                  <p className="text-lg font-black text-zinc-950 dark:text-zinc-50">
                    -{formatINR(b.pfAmount + b.taxAmount)}
                  </p>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    PF (12%): {formatINR(b.pfAmount)} • TDS/Tax (5%): {formatINR(b.taxAmount)}
                  </p>
                </div>

                {/* 4. Leaves & Advances */}
                <div className="p-3 bg-zinc-50 dark:bg-zinc-850 border border-zinc-200 dark:border-zinc-800 rounded-xl space-y-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 text-zinc-900 dark:text-zinc-100">
                    <Banknote className="w-4 h-4 text-zinc-700 dark:text-zinc-300" />
                    Leaves &amp; Advances Recovery
                  </span>
                  <p className="text-lg font-black text-zinc-950 dark:text-zinc-50">
                    {(b.leaveCutAmount > 0 || b.advanceAmount > 0)
                      ? `-${formatINR(b.leaveCutAmount + b.advanceAmount)}`
                      : '₹0.00'}
                  </p>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    {b.leaveCutAmount > 0
                      ? `${b.leaveCutDays} unpaid day(s) cut (${formatINR(b.leaveCutAmount)})`
                      : b.advanceAmount > 0
                      ? `Salary advance recovery: ${formatINR(b.advanceAmount)}`
                      : 'No unpaid leave cuts or advance recovery active'}
                  </p>
                </div>
              </div>

              {/* Itemized Comparison Breakdown */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                {/* Earnings List */}
                <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden bg-white dark:bg-zinc-900">
                  <div className="bg-zinc-100 dark:bg-zinc-800 px-3 py-1.5 font-bold text-zinc-800 dark:text-zinc-200 text-[11px] uppercase tracking-wider flex justify-between">
                    <span>Earnings</span>
                    <span>Amount (₹)</span>
                  </div>
                  <div className="p-3 divide-y divide-zinc-100 dark:divide-zinc-800 space-y-2">
                    <div className="flex justify-between text-zinc-700 dark:text-zinc-300">
                      <span>Basic Salary</span>
                      <span className="font-semibold text-zinc-900 dark:text-zinc-100">{formatINR(b.basicSalary)}</span>
                    </div>
                    <div className="flex justify-between text-zinc-700 dark:text-zinc-300 pt-1.5">
                      <div>
                        <span className="font-semibold text-zinc-900 dark:text-zinc-100">Overtime Earnings</span>
                        <span className="block text-[10px] text-zinc-400 font-mono">
                          +{b.overtimeHours.toFixed(1)} hrs @ 1.5x rate
                        </span>
                      </div>
                      <span className="font-bold text-zinc-900 dark:text-zinc-100">+{formatINR(b.overtimePay)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-zinc-900 dark:text-zinc-100 pt-2 border-t border-zinc-200 dark:border-zinc-800">
                      <span>Total Gross Pay</span>
                      <span className="text-zinc-900 dark:text-zinc-100">{formatINR(b.grossSalary)}</span>
                    </div>
                  </div>
                </div>

                {/* Where Salary Was Cut List */}
                <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden bg-white dark:bg-zinc-900">
                  <div className="bg-zinc-100 dark:bg-zinc-800 px-3 py-1.5 font-bold text-zinc-800 dark:text-zinc-200 text-[11px] uppercase tracking-wider flex justify-between">
                    <span>Where Salary Was Cut</span>
                    <span>Deduction (₹)</span>
                  </div>
                  <div className="p-3 divide-y divide-zinc-100 dark:divide-zinc-800 space-y-2">
                    {b.shortfallAmount > 0 ? (
                      <div className="flex justify-between text-zinc-900 dark:text-zinc-100">
                        <div>
                          <span className="font-semibold">Shortfall Cut</span>
                          <span className="block text-[10px] text-zinc-500 font-mono">
                            {b.shortfallHours.toFixed(1)}h deficit hours
                          </span>
                        </div>
                        <span className="font-bold">-{formatINR(b.shortfallAmount)}</span>
                      </div>
                    ) : null}

                    {b.leaveCutAmount > 0 ? (
                      <div className="flex justify-between text-zinc-900 dark:text-zinc-100 pt-1.5">
                        <div>
                          <span className="font-semibold">Unpaid Leave Cut</span>
                          <span className="block text-[10px] text-zinc-500 font-mono">
                            {b.leaveCutDays} day(s) absent
                          </span>
                        </div>
                        <span className="font-bold">-{formatINR(b.leaveCutAmount)}</span>
                      </div>
                    ) : null}

                    {b.advanceAmount > 0 ? (
                      <div className="flex justify-between text-zinc-900 dark:text-zinc-100 pt-1.5">
                        <span className="font-semibold">Advance Recovery</span>
                        <span className="font-bold">-{formatINR(b.advanceAmount)}</span>
                      </div>
                    ) : null}

                    <div className="flex justify-between text-zinc-700 dark:text-zinc-300 pt-1.5">
                      <span>Provident Fund (12%)</span>
                      <span className="font-semibold">-{formatINR(b.pfAmount)}</span>
                    </div>

                    <div className="flex justify-between text-zinc-700 dark:text-zinc-300 pt-1.5">
                      <span>Professional Tax &amp; TDS (5%)</span>
                      <span className="font-semibold">-{formatINR(b.taxAmount)}</span>
                    </div>

                    <div className="flex justify-between font-bold text-zinc-900 dark:text-zinc-100 pt-2 border-t border-zinc-200 dark:border-zinc-800">
                      <span>Total Wage Cuts</span>
                      <span className="text-zinc-900 dark:text-zinc-100">-{formatINR(b.totalDeductions)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Equation Calculation Note */}
              <div className="p-3 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl flex items-center justify-between text-[11px] text-zinc-900 dark:text-zinc-100 font-medium">
                <span>
                  Gross ({formatINR(b.grossSalary)}) − Total Cuts ({formatINR(b.totalDeductions)})
                </span>
                <span className="font-bold text-zinc-950 dark:text-zinc-50 text-xs">
                  = In-Hand Credited: {formatINR(b.netSalary)}
                </span>
              </div>

              {/* Modal Footer Actions */}
              <div className="pt-2 flex items-center justify-end gap-2 border-t border-zinc-200 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => {
                    const target = breakdownModalPayslip;
                    setBreakdownModalPayslip(null);
                    setViewPayslip(target);
                  }}
                  className="px-3 py-1.5 bg-zinc-950 hover:bg-black text-white dark:bg-zinc-100 dark:hover:bg-white dark:text-zinc-950 rounded-lg font-bold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>View &amp; Print Official Payslip</span>
                </button>
                <button
                  type="button"
                  onClick={() => setBreakdownModalPayslip(null)}
                  className="px-4 py-1.5 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-lg font-semibold transition-colors cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          );
        })()}
      </Modal>

      {/* MODAL 3: Printable Official Payslip Modal */}
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
              {/* Header / Company Banner */}
              <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 bg-white dark:bg-zinc-900 shadow-2xs space-y-4 printable-payslip">
                <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3">
                  <div>
                    <h3 className="text-base font-extrabold text-zinc-950 dark:text-zinc-100 tracking-tight flex items-center gap-2">
                      <Building className="w-4 h-4 text-zinc-900 dark:text-zinc-100" />
                      <span>{business?.name || 'Trinetra Technologies Pvt Ltd'}</span>
                    </h3>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400">Corporate Campus (HQ) • Verified Workforce Platform</p>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-bold text-zinc-900 dark:text-zinc-100 bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 px-2 py-0.5 rounded uppercase">
                      Official Payslip
                    </span>
                    <p className="text-[11px] text-zinc-600 dark:text-zinc-400 font-mono mt-1 font-bold">
                      {viewPayslip.payslip_number || 'PS-202610-0001'}
                    </p>
                  </div>
                </div>

                {/* Employee Summary Details */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-zinc-50 dark:bg-zinc-850 p-3 rounded-lg border border-zinc-100 dark:border-zinc-800">
                  <div>
                    <p className="text-[10px] text-zinc-400 font-bold uppercase">Employee Name</p>
                    <p className="font-bold text-zinc-900 dark:text-zinc-100 text-xs mt-0.5">{viewPayslip.employee_name || user?.full_name}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-zinc-400 font-bold uppercase">Employee ID</p>
                    <p className="font-mono font-bold text-zinc-900 dark:text-zinc-100 text-xs mt-0.5">{viewPayslip.employee_code || 'TRIN-0009'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-zinc-400 font-bold uppercase">Pay Period</p>
                    <p className="font-semibold text-zinc-900 dark:text-zinc-100 text-xs mt-0.5">{viewPayslip.period_display || viewPayslip.period || 'October 2026'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-zinc-400 font-bold uppercase">Payment Status</p>
                    <p className="font-bold text-zinc-900 dark:text-zinc-100 text-xs mt-0.5">VERIFIED / ISSUED</p>
                  </div>
                </div>

                {/* Work Hours & Overtime Summary if present */}
                {Number(viewPayslip.overtime_hours || 0) > 0 && (
                  <div className="p-2.5 bg-zinc-50 dark:bg-zinc-850 rounded-lg border border-zinc-200 dark:border-zinc-800 flex items-center justify-between text-[11px]">
                    <span className="font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-zinc-700 dark:text-zinc-300" />
                      Recorded Overtime Working Hours:
                    </span>
                    <span className="font-bold text-zinc-900 dark:text-zinc-100 font-mono">
                      {Number(viewPayslip.overtime_hours).toFixed(2)} hrs (Paid at company rate)
                    </span>
                  </div>
                )}

                {/* Earnings & Deductions Tables */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Earnings Breakdown */}
                  <div className="border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden bg-white dark:bg-zinc-900">
                    <div className="bg-zinc-100 dark:bg-zinc-800 px-3 py-1.5 font-bold text-zinc-800 dark:text-zinc-200 text-[11px] uppercase tracking-wider flex justify-between">
                      <span>Earnings</span>
                      <span>Amount (₹)</span>
                    </div>
                    <div className="divide-y divide-zinc-100 dark:divide-zinc-800 p-2 space-y-1.5">
                      {earningsList.length > 0 ? (
                        earningsList.map((c, i) => (
                          <div key={i} className="flex justify-between text-zinc-700 dark:text-zinc-300">
                            <div>
                              <span className="font-medium text-zinc-900 dark:text-zinc-100">{c.component_name}</span>
                              {c.calculation_details?.overtime_hours && (
                                <span className="block text-[10px] text-zinc-400 font-mono">
                                  {c.calculation_details.overtime_hours} hrs @ ₹{c.calculation_details.hourly_rate}/hr ({c.calculation_details.multiplier}x rate)
                                </span>
                              )}
                            </div>
                            <span className="font-semibold text-zinc-900 dark:text-zinc-100">{formatINR(c.amount)}</span>
                          </div>
                        ))
                      ) : (
                        <>
                          <div className="flex justify-between text-zinc-700 dark:text-zinc-300">
                            <span>Basic Salary</span>
                            <span className="font-semibold">{formatINR(Number(viewPayslip.gross_salary || 55000) * 0.7)}</span>
                          </div>
                          <div className="flex justify-between text-zinc-700 dark:text-zinc-300">
                            <span>House Rent Allowance (HRA)</span>
                            <span className="font-semibold">{formatINR(Number(viewPayslip.gross_salary || 55000) * 0.2)}</span>
                          </div>
                          <div className="flex justify-between text-zinc-700 dark:text-zinc-300">
                            <span>Special Allowance</span>
                            <span className="font-semibold">{formatINR(Number(viewPayslip.gross_salary || 55000) * 0.1)}</span>
                          </div>
                        </>
                      )}
                      <div className="flex justify-between font-bold text-zinc-900 dark:text-zinc-100 pt-1.5 border-t border-zinc-200 dark:border-zinc-800">
                        <span>Gross Earnings</span>
                        <span className="text-zinc-900 dark:text-zinc-100">{formatINR(viewPayslip.gross_salary || 55000)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Deductions Breakdown */}
                  <div className="border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden bg-white dark:bg-zinc-900">
                    <div className="bg-zinc-100 dark:bg-zinc-800 px-3 py-1.5 font-bold text-zinc-800 dark:text-zinc-200 text-[11px] uppercase tracking-wider flex justify-between">
                      <span>Deductions</span>
                      <span>Amount (₹)</span>
                    </div>
                    <div className="divide-y divide-zinc-100 dark:divide-zinc-800 p-2 space-y-1.5">
                      {deductionsList.length > 0 ? (
                        deductionsList.map((c, i) => (
                          <div key={i} className="flex justify-between text-zinc-700 dark:text-zinc-300">
                            <div>
                              <span className="font-medium text-zinc-900 dark:text-zinc-100">{c.component_name}</span>
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
                            <span className="font-semibold text-zinc-900 dark:text-zinc-100">{formatINR(c.amount)}</span>
                          </div>
                        ))
                      ) : (
                        <>
                          <div className="flex justify-between text-zinc-700 dark:text-zinc-300">
                            <span>Provident Fund (PF - 12%)</span>
                            <span className="font-semibold">{formatINR(Number(viewPayslip.gross_salary || 55000) * 0.12)}</span>
                          </div>
                          <div className="flex justify-between text-zinc-700 dark:text-zinc-300">
                            <span>Professional Tax &amp; TDS (5%)</span>
                            <span className="font-semibold">{formatINR(Number(viewPayslip.gross_salary || 55000) * 0.05)}</span>
                          </div>
                        </>
                      )}
                      <div className="flex justify-between font-bold text-zinc-900 dark:text-zinc-100 pt-1.5 border-t border-zinc-200 dark:border-zinc-800">
                        <span>Total Deductions</span>
                        <span className="text-zinc-900 dark:text-zinc-100">{formatINR(viewPayslip.total_deductions || 5200)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Net Payout Banner */}
                <div className="p-3 bg-zinc-50 dark:bg-zinc-850 rounded-xl border border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wide">Net Take-Home Salary</p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">Credited directly to registered bank account</p>
                  </div>
                  <div className="text-right">
                    <span className="text-xl font-black text-zinc-950 dark:text-zinc-50">
                      {formatINR(viewPayslip.net_salary || 49800)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3.5 py-1.5 bg-zinc-950 hover:bg-black text-white dark:bg-zinc-100 dark:hover:bg-white dark:text-zinc-950 rounded-lg font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print / Save as PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewPayslip(null)}
                  className="px-3 py-1.5 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg font-semibold cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          );
        })()}
      </Modal>
    </div>
  );
};
export default Payroll;
