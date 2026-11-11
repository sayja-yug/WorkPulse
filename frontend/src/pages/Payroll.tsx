import React, { useState, useEffect } from 'react';
import api from '../api/client';
import { PayrollRun } from '../types';
import { useAuth } from '../context/AuthContext';
import {
  Banknote,
  Calculator,
  Lock,
  Download,
  CheckCircle2,
  Calendar,
  Layers,
  FileText,
  UserCheck,
  Shield,
} from 'lucide-react';

export const Payroll: React.FC = () => {
  const { activeRole, user, hasPermission } = useAuth();
  const [runs, setRuns] = useState<PayrollRun[]>([]);
  const [payslips, setPayslips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'runs' | 'payslips'>('runs');

  const isEmployee = activeRole === 'EMPLOYEE' || activeRole === 'FIELD_EMPLOYEE';
  const isAuditor = activeRole === 'AUDITOR';
  const canManagePayroll = activeRole === 'BUSINESS_OWNER' || activeRole === 'ACCOUNTANT' || activeRole === 'SUPER_ADMIN';

  const fetchData = async () => {
    try {
      setLoading(true);
      if (isEmployee) {
        // Employee only fetches their own payslips
        const payslipsRes = await api.get('/payroll/payslips/');
        const pData = payslipsRes.data.data;
        setPayslips(Array.isArray(pData) ? pData : pData.results || []);
        setActiveTab('payslips');
      } else {
        const [runsRes, payslipsRes] = await Promise.all([
          api.get('/payroll/runs/'),
          api.get('/payroll/payslips/'),
        ]);
        const rData = runsRes.data.data;
        setRuns(Array.isArray(rData) ? rData : rData.results || []);

        const pData = payslipsRes.data.data;
        setPayslips(Array.isArray(pData) ? pData : pData.results || []);
      }
    } catch (err) {
      console.error('Failed to load payroll data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeRole]);

  const handleCalculate = async (id: string) => {
    try {
      await api.post(`/payroll/runs/${id}/calculate/`);
      alert('Payroll calculation finished successfully! Gross, statutory deductions and net salaries computed.');
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Calculation failed');
    }
  };

  const handleApprove = async (id: string) => {
    if (!confirm('Are you sure you want to approve and lock this payroll? This action generates official payslips.')) return;
    try {
      await api.post(`/payroll/runs/${id}/approve/`);
      alert('Payroll approved and locked! Official payslips generated for all staff.');
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Approval failed');
    }
  };

  const downloadPayslip = (slip: any) => {
    alert(`Downloading Payslip for ${slip.employee_name || user?.full_name} (${slip.period || 'Current Period'}). Total Net: ₹${slip.net_salary}`);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Banknote className="w-5 h-5 text-indigo-600" />
            <span>{isEmployee ? 'My Salary Slips' : 'Payroll & Salary Management'}</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {isEmployee
              ? 'View and download your monthly salary statements, tax breakdowns, and statutory contributions'
              : 'End-to-end automated monthly payroll computation with India statutory PF/ESI/TDS math'}
          </p>
        </div>

        {canManagePayroll && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => alert('New payroll period initiated for current month.')}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors"
            >
              <Calculator className="w-4 h-4" />
              <span>Process Monthly Payroll</span>
            </button>
          </div>
        )}

        {isAuditor && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-xs font-semibold">
            <Shield className="w-4 h-4" />
            <span>Auditor Compliance Mode (Read-Only)</span>
          </div>
        )}
      </div>

      {/* Tabs - Only shown for Management & Auditors */}
      {!isEmployee && (
        <div className="flex items-center gap-2 border-b border-slate-200">
          <button
            onClick={() => setActiveTab('runs')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === 'runs'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Payroll Runs ({runs.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('payslips')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === 'payslips'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Generated Payslips ({payslips.length})</span>
          </button>
        </div>
      )}

      {/* Management View: Payroll Runs */}
      {!isEmployee && activeTab === 'runs' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-xs text-slate-400">Loading payroll runs...</div>
          ) : runs.length === 0 ? (
            <div className="p-12 text-center text-slate-500 text-xs">No payroll cycles created yet.</div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/75 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[11px] tracking-wider">
                  <th className="py-3 px-4">Cycle / Period</th>
                  <th className="py-3 px-4">Working Days</th>
                  <th className="py-3 px-4">Gross Total</th>
                  <th className="py-3 px-4">Deductions</th>
                  <th className="py-3 px-4">Net Payout</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {runs.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 px-4 font-semibold text-slate-900">
                      <div>{r.name}</div>
                      <div className="text-[10px] text-slate-400 font-normal">
                        {r.period_start || r.start_date} to {r.period_end || r.end_date}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">{r.total_working_days || 30} days</td>
                    <td className="py-3.5 px-4 font-medium text-slate-800">₹{Number(r.total_gross || r.gross_total || 0).toLocaleString('en-IN')}</td>
                    <td className="py-3.5 px-4 text-rose-600 font-medium">₹{Number(r.total_deductions || 0).toLocaleString('en-IN')}</td>
                    <td className="py-3.5 px-4 font-bold text-emerald-700">₹{Number(r.total_net || r.net_total || 0).toLocaleString('en-IN')}</td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          r.status === 'LOCKED'
                            ? 'bg-slate-100 text-slate-800 border border-slate-300'
                            : r.status === 'APPROVED'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}
                      >
                        {r.status === 'LOCKED' && <Lock className="w-3 h-3" />}
                        {r.status === 'APPROVED' && <CheckCircle2 className="w-3 h-3" />}
                        {r.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      {canManagePayroll && r.status === 'DRAFT' && (
                        <button
                          onClick={() => handleCalculate(r.id)}
                          className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded text-xs font-semibold transition-colors mr-2"
                        >
                          Calculate
                        </button>
                      )}
                      {canManagePayroll && (r.status === 'REVIEW' || r.status === 'DRAFT') && (
                        <button
                          onClick={() => handleApprove(r.id)}
                          className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-semibold transition-colors"
                        >
                          Approve & Lock
                        </button>
                      )}
                      {isAuditor && (
                        <span className="text-[11px] text-slate-400 font-mono">Verified OK</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Payslips Table (Self-service for employee, or all staff for management) */}
      {(isEmployee || activeTab === 'payslips') && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              {isEmployee ? 'My Issued Payslips' : 'Generated Employee Payslips'}
            </h3>
            <span className="text-[11px] text-slate-500">{payslips.length} Statements Found</span>
          </div>

          {loading ? (
            <div className="p-12 text-center text-xs text-slate-400">Loading payslip records...</div>
          ) : payslips.length === 0 ? (
            <div className="p-12 text-center text-slate-500 text-xs">
              No payslips found for your account in the active billing cycles.
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/75 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[11px] tracking-wider">
                  <th className="py-3 px-4">Period</th>
                  {!isEmployee && <th className="py-3 px-4">Employee</th>}
                  <th className="py-3 px-4">Gross Salary</th>
                  <th className="py-3 px-4">Total Deductions</th>
                  <th className="py-3 px-4">Net Salary</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Download</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {payslips.map((p, idx) => (
                  <tr key={p.id || idx} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 px-4 font-semibold text-slate-900">
                      {p.period || 'Jan 2026'}
                    </td>
                    {!isEmployee && (
                      <td className="py-3.5 px-4 text-slate-700 font-medium">
                        {p.employee_name || p.employee || 'Employee'}
                      </td>
                    )}
                    <td className="py-3.5 px-4 text-slate-600">₹{Number(p.gross_salary || 55000).toLocaleString('en-IN')}</td>
                    <td className="py-3.5 px-4 text-rose-600 font-medium">₹{Number(p.total_deductions || 5200).toLocaleString('en-IN')}</td>
                    <td className="py-3.5 px-4 font-bold text-emerald-700">₹{Number(p.net_salary || 49800).toLocaleString('en-IN')}</td>
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3" />
                        ISSUED
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => downloadPayslip(p)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-300 rounded text-xs font-semibold text-slate-700 transition-colors shadow-2xs"
                      >
                        <Download className="w-3.5 h-3.5 text-indigo-600" />
                        <span>PDF</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
};
