import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Circle, ChevronDown, ChevronUp, Sparkles, ArrowRight } from 'lucide-react';

export const GettingStartedChecklist = ({
  hasCompany = true,
  employeeCount = 0,
  hasShifts = true,
  hasPayroll = false,
}) => {
  const [isOpen, setIsOpen] = useState(true);

  const steps = [
    {
      id: 'company',
      title: 'Company Setup',
      desc: 'Workspace and business profile created',
      done: Boolean(hasCompany),
      link: '/settings',
    },
    {
      id: 'employees',
      title: 'Add Employees',
      desc: employeeCount > 0 ? `${employeeCount} employees onboarded` : 'Add your workers to the system',
      done: employeeCount > 0,
      link: '/employees?action=add',
      actionLabel: 'Add Employee',
    },
    {
      id: 'shifts',
      title: 'Set Work Schedule',
      desc: 'Define shift timings for punch-in tracking',
      done: Boolean(hasShifts),
      link: '/shifts',
      actionLabel: 'Work Schedule',
    },
    {
      id: 'payroll',
      title: 'Run First Payroll',
      desc: 'Calculate salary and generate employee payslips',
      done: Boolean(hasPayroll),
      link: '/payroll',
      actionLabel: 'Process Payroll',
    },
  ];

  const completedCount = steps.filter((s) => s.done).length;
  // If all completed, hide or allow collapsed view
  const isAllComplete = completedCount === steps.length;

  return (
    <div className="bg-white rounded-2xl border border-zinc-200 shadow-subtle p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-zinc-900 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
            <Sparkles className="w-4 h-4 text-amber-300" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-zinc-950">Getting Started Checklist</h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-zinc-100 text-zinc-800 border border-zinc-200">
                {completedCount} of {steps.length} done
              </span>
            </div>
            <p className="text-xs text-zinc-500 mt-0.5">
              Follow these simple steps to set up your business for daily operations.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-950 hover:bg-zinc-100 transition-colors cursor-pointer"
          aria-label={isOpen ? 'Collapse checklist' : 'Expand checklist'}
        >
          {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-zinc-100 h-1.5 rounded-full mt-3 overflow-hidden">
        <div
          className="bg-zinc-900 h-full rounded-full transition-all duration-300"
          style={{ width: `${(completedCount / steps.length) * 100}%` }}
        />
      </div>

      {isOpen && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-4 pt-3 border-t border-zinc-100">
          {steps.map((step, idx) => (
            <div
              key={step.id}
              className={`p-3 rounded-xl border transition-all ${
                step.done
                  ? 'bg-zinc-50/70 border-zinc-200 text-zinc-800'
                  : 'bg-white border-zinc-300 text-zinc-950 shadow-2xs hover:border-zinc-500'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-zinc-100 text-[10px] font-bold flex items-center justify-center text-zinc-600">
                    {idx + 1}
                  </span>
                  <span className="text-xs font-bold truncate">{step.title}</span>
                </div>
                {step.done ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <Circle className="w-4 h-4 text-zinc-300 shrink-0" />
                )}
              </div>
              <p className="text-[11px] text-zinc-500 mt-1 line-clamp-1">{step.desc}</p>
              {!step.done && step.link && (
                <Link
                  to={step.link}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-zinc-900 hover:underline mt-2"
                >
                  <span>{step.actionLabel || 'Complete Step'}</span>
                  <ArrowRight className="w-3 h-3" />
                </Link>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default GettingStartedChecklist;

