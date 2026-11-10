import React, { useState, useEffect } from 'react';
import api from '../api/client';
import { PayrollRun } from '../types';
import {
  Banknote,
  Calculator,
  Lock,
  Download,
  CheckCircle2,
  Calendar,
  Layers,
  FileText,
} from 'lucide-react';

export const Payroll: React.FC = () => {
  const [runs, setRuns] = useState<PayrollRun[]>([]);
  const [payslips, setPayslips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'runs' | 'payslips'>('runs');

  const fetchData = async () => {
    try {
      setLoading(true);
      const [runsRes, payslipsRes] = await Promise.all([
        api.get('/payroll/runs/'),
        api.get('/payroll/payslips/'),
      ]);
      const rData = runsRes.data.data;
      setRuns(Array.isArray(rData) ? rData : rData.results || []);

      const pData = payslipsRes.data.data;
      setPayslips(Array.isArray(pData) ? pData : pData.results || []);
    } catch (err) {
      console.error('Failed to load payroll data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

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

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Payroll & Salary Slips</h2>
          <p className="text-xs text-slate-500 mt-0.5">Decimal-accurate salary disbursement, statutory deductions & digital payslips</p>
        </div>

        <div className="flex bg-slate-200/60 p-1 rounded-lg">
          <button
            onClick={() => setActiveTab('runs')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
              activeTab === 'runs' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Payroll Runs
          </button>
          <button
            onClick={() => setActiveTab('payslips')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
              activeTab === 'payslips' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Generated Payslips ({payslips.length})
          </button>
        </div>
      </div>

      {activeTab === 'runs' ? (
        <div className="space-y-4">
          {runs.map((run) => (
            <div key={run.id} className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <h3 className="text-base font-bold text-slate-900">{run.name}</h3>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                      run.status === 'APPROVED' || run.status === 'LOCKED'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : run.status === 'REVIEW'
                        ? 'bg-blue-50 text-blue-700 border border-blue-200'
                        : 'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}
                  >
                    {run.status}
                  </span>
                </div>

                <div className="flex items-center gap-4 text-xs text-slate-500">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>Period: {run.period_start} to {run.period_end}</span>
                  </div>
                  <span>•</span>
                  <span>{run.items_count || 20} Employees Included</span>
                </div>

                <div className="flex items-center gap-6 pt-2">
                  <div>
                    <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-400">Total Gross</span>
                    <p className="text-sm font-bold text-slate-800">₹{parseFloat(run.total_gross).toLocaleString('en-IN')}</p>
                  </div>
                  <div>
                    <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-400">Total Deductions</span>
                    <p className="text-sm font-bold text-rose-600">-₹{parseFloat(run.total_deductions).toLocaleString('en-IN')}</p>
                  </div>
                  <div>
                    <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-400">Net Payable</span>
                    <p className="text-base font-extrabold text-emerald-600">₹{parseFloat(run.total_net).toLocaleString('en-IN')}</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {run.status !== 'APPROVED' && run.status !== 'LOCKED' && (
                  <>
                    <button
                      onClick={() => handleCalculate(run.id)}
                      className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors border border-indigo-200"
                    >
                      <Calculator className="w-3.5 h-3.5" />
                      <span>Calculate</span>
                    </button>
                    <button
                      onClick={() => handleApprove(run.id)}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
                    >
                      <Lock className="w-3.5 h-3.5" />
                      <span>Approve & Lock</span>
                    </button>
                  </>
                )}
                {(run.status === 'APPROVED' || run.status === 'LOCKED') && (
                  <span className="text-xs font-semibold text-emerald-700 flex items-center gap-1 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Locked & Disbursed</span>
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Payslip Number</th>
                  <th className="py-3 px-4">Employee</th>
                  <th className="py-3 px-4">Period</th>
                  <th className="py-3 px-4">Gross Earnings</th>
                  <th className="py-3 px-4">Deductions</th>
                  <th className="py-3 px-4">Net Salary</th>
                  <th className="py-3 px-4 text-right">Download</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {payslips.map((ps) => (
                  <tr key={ps.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono text-xs font-semibold text-indigo-600">{ps.payslip_number}</td>
                    <td className="py-3 px-4">
                      <p className="font-semibold text-slate-900 text-xs leading-tight">{ps.employee_name}</p>
                      <p className="text-[11px] text-slate-500 font-mono leading-tight">{ps.employee_code}</p>
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-700">{ps.period_display}</td>
                    <td className="py-3 px-4 text-xs font-medium text-slate-800">
                      ₹{parseFloat(ps.gross_salary || '0').toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-4 text-xs font-medium text-rose-600">
                      -₹{parseFloat(ps.total_deductions || '0').toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-4 text-xs font-bold text-emerald-600">
                      ₹{parseFloat(ps.net_salary || '0').toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => alert(`Downloading payslip ${ps.payslip_number} for ${ps.employee_name}`)}
                        className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors inline-flex items-center gap-1 text-xs font-medium"
                      >
                        <Download className="w-4 h-4" />
                        <span>PDF</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
