import { Check, Circle } from 'lucide-react';

const steps = [
  ['phone', 'Phone Number'], ['aadhaar', 'Aadhaar'], ['bank', 'Bank Details'], ['other', 'Other'],
];

export function OnboardingProgress({ steps: status = {} }) {
  const percent = steps.filter(([key]) => key !== 'other' && status[key]).length * 25;
  return (
    <section aria-label="Onboarding progress" className="rounded-xl border border-zinc-200 bg-white p-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-zinc-900">Onboarding progress</h3>
        <span className="text-sm font-semibold text-zinc-800" aria-live="polite">{percent}%</span>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {steps.map(([key, label]) => {
          const complete = key !== 'other' && Boolean(status[key]);
          const Icon = complete ? Check : Circle;
          return (
            <div key={key} className="min-w-0">
              <div className={`mb-2 h-1 rounded-full ${complete ? 'bg-emerald-700' : 'bg-zinc-200'}`} />
              <p className="text-xs font-semibold">{label}</p>
              <p className="mt-1 flex items-center gap-1 text-[11px] text-zinc-600">
                <Icon aria-hidden="true" size={12} />{complete ? 'Complete' : 'Pending'}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
