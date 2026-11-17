import React, { forwardRef } from 'react';

export const Switch = forwardRef(({
  label,
  description,
  id,
  checked,
  onChange,
  disabled = false,
  className = '',
  ...props
}, ref) => {
  const generatedId = id || (label ? `sw-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined);

  return (
    <label
      htmlFor={generatedId}
      className={`inline-flex items-center justify-between gap-3 cursor-pointer select-none ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
    >
      {(label || description) && (
        <div className="flex flex-col">
          {label && (
            <span className="text-xs font-semibold text-zinc-900  leading-tight">
              {label}
            </span>
          )}
          {description && (
            <span className="text-2xs text-zinc-500  mt-0.5 leading-normal">
              {description}
            </span>
          )}
        </div>
      )}

      <div className="relative inline-flex items-center shrink-0">
        <input
          ref={ref}
          id={generatedId}
          type="checkbox"
          checked={checked}
          onChange={onChange}
          disabled={disabled}
          className="sr-only peer"
          {...props}
        />
        <div className="w-9 h-5 rounded-full border border-zinc-300  bg-zinc-200  peer-checked:bg-zinc-950  peer-checked:border-zinc-950  transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-zinc-950 ">
          <div className="w-3.5 h-3.5 mt-[2px] ml-[2px] rounded-full bg-white  peer-checked:translate-x-4 transition-transform shadow-xs" />
        </div>
      </div>
    </label>
  );
});

Switch.displayName = 'Switch';
export default Switch;

