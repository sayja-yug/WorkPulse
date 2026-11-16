import React from 'react';
import { X } from 'lucide-react';

export const Modal = ({ isOpen, onClose, title, subtitle, children, maxWidth = 'max-w-lg' }) => {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className={`bg-white rounded-2xl shadow-2xl border border-zinc-200 w-full ${maxWidth} overflow-hidden animate-in fade-in zoom-in-95 duration-200`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-zinc-100 bg-zinc-50/60">
          <div className="min-w-0 pr-3">
            <h3 className="text-sm sm:text-base font-bold text-zinc-950 truncate">{title}</h3>
            {subtitle && <p className="text-[11px] text-zinc-500 mt-0.5">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-zinc-400 hover:text-black hover:bg-zinc-100 transition-colors shrink-0 cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-5 sm:p-6 max-h-[82vh] overflow-y-auto">{children}</div>
      </div>
    </div>
  );
};


