import React, { useState } from 'react';
import { HelpCircle, X, CheckCircle2 } from 'lucide-react';

/**
 * HelpButton - Quick 30-second guided help for non-technical users
 * Answers:
 * 1. Where am I?
 * 2. What can I do here?
 * 3. What happens next?
 */
export const HelpButton = ({
  title = 'Quick Guide',
  whereAmI = 'You are on this page.',
  whatCanIDo = 'View your current records and take key actions.',
  whatHappensNext = 'Your changes are saved immediately across the company.',
}) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-zinc-100 hover:bg-zinc-200 text-zinc-700 transition-colors cursor-pointer border border-zinc-200/80 shadow-2xs"
        title="Need help with this page?"
        aria-label="Page help"
      >
        <HelpCircle className="w-3.5 h-3.5 text-zinc-600" />
        <span className="hidden sm:inline">Help</span>
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-2xl border border-zinc-200 p-4 z-50 animate-in fade-in zoom-in-95 duration-150 text-left">
          <div className="flex items-center justify-between border-b border-zinc-100 pb-2 mb-3">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-zinc-900 text-white flex items-center justify-center font-bold text-xs">
                ?
              </div>
              <h4 className="text-xs font-bold text-zinc-950 uppercase tracking-wider">{title}</h4>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-md text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-3 text-xs">
            {/* 1. Where am I? */}
            <div className="bg-zinc-50 p-2.5 rounded-lg border border-zinc-100">
              <p className="font-bold text-zinc-950 text-[11px] uppercase tracking-wide flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-zinc-900" />
                Where am I?
              </p>
              <p className="text-zinc-600 mt-1 leading-relaxed">{whereAmI}</p>
            </div>

            {/* 2. What can I do here? */}
            <div className="bg-zinc-50 p-2.5 rounded-lg border border-zinc-100">
              <p className="font-bold text-zinc-950 text-[11px] uppercase tracking-wide flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-zinc-900" />
                What can I do here?
              </p>
              <p className="text-zinc-600 mt-1 leading-relaxed">{whatCanIDo}</p>
            </div>

            {/* 3. What happens next? */}
            <div className="bg-zinc-50 p-2.5 rounded-lg border border-zinc-100">
              <p className="font-bold text-zinc-950 text-[11px] uppercase tracking-wide flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-zinc-900" />
                What happens next?
              </p>
              <p className="text-zinc-600 mt-1 leading-relaxed">{whatHappensNext}</p>
            </div>
          </div>

          <div className="mt-3 pt-2 border-t border-zinc-100 flex items-center justify-between text-[11px]">
            <span className="text-zinc-400">30-second summary</span>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="font-bold text-zinc-950 hover:underline cursor-pointer"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default HelpButton;

