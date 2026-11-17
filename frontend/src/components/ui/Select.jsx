import React, { forwardRef } from 'react';
import { ChevronDown } from 'lucide-react';

export const Select = forwardRef(({
  label,
  error,
  helperText,
  options = [],
  children,
  className = '',
  containerClassName = '',
  id,
  disabled = false,
  required = false,
  ...props
}, ref) => {
  const generatedId = id || (label ? `select-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined);

  return (
    <div className={`w-full flex flex-col gap-1.5 ${containerClassName}`}>
      {label && (
        <label
          htmlFor={generatedId}
          className="text-xs font-bold text-zinc-800 uppercase tracking-wider flex items-center justify-between"
        >
          <span>
            {label}
            {required && <span className="text-zinc-500 ml-1">*</span>}
          </span>
        </label>
      )}

      <div className="relative w-full flex items-center">
        <select
          ref={ref}
          id={generatedId}
          disabled={disabled}
          required={required}
          className={`
            w-full rounded-lg border bg-white text-zinc-900
            text-base sm:text-xs font-medium py-2 pl-3 pr-8 transition-all outline-none appearance-none cursor-pointer
            ${error
              ? 'border-zinc-900 ring-1 ring-zinc-900'
              : 'border-zinc-300 focus:border-zinc-950 focus:ring-1 focus:ring-zinc-950'
            }
            disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-zinc-100
            ${className}
          `}
          {...props}
        >
          {children || (
            options.map((opt) => {
              const val = typeof opt === 'object' ? opt.value : opt;
              const lbl = typeof opt === 'object' ? opt.label : opt;
              return (
                <option key={val} value={val} className="bg-white text-zinc-900">
                  {lbl}
                </option>
              );
            })
          )}
        </select>

        <div className="absolute right-3 text-zinc-400 pointer-events-none flex items-center justify-center">
          <ChevronDown className="w-4 h-4" />
        </div>
      </div>

      {error ? (
        <p className="text-2xs font-semibold text-zinc-900 mt-0.5">
          {error}
        </p>
      ) : helperText ? (
        <p className="text-2xs text-zinc-500 mt-0.5">
          {helperText}
        </p>
      ) : null}
    </div>
  );
});

Select.displayName = 'Select';
export default Select;
