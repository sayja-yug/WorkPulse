import React from 'react';

export const Badge = ({ children, variant = 'default', className = '' }) => {
  const variants = {
    default: 'bg-zinc-100 text-zinc-800 border-zinc-200',
    success: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    warning: 'bg-amber-50 text-amber-800 border-amber-200',
    danger: 'bg-rose-50 text-rose-700 border-rose-200',
    info: 'bg-zinc-100 text-zinc-800 border-zinc-300',
    indigo: 'bg-zinc-900 text-white border-zinc-800',
    purple: 'bg-zinc-800 text-zinc-100 border-zinc-700',
  };

  const style = variants[variant] || variants.default;

  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${style} ${className}`}
    >
      {children}
    </span>
  );
};

