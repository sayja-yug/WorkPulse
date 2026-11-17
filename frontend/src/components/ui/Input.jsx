import React, { forwardRef } from 'react';

export const Input = forwardRef(({
  label,
  error,
  helperText,
  leftIcon: LeftIcon,
  rightIcon: RightIcon,
  rightElement,
  className = '',
  containerClassName = '',
  id,
  type = 'text',
  disabled = false,
  required = false,
  ...props
}, ref) => {
  const generatedId = id || (label ? `input-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined);

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
        {LeftIcon && (
          <div className="absolute left-3 text-zinc-400 pointer-events-none flex items-center justify-center">
            <LeftIcon className="w-4 h-4" />
          </div>
        )}

        <input
          ref={ref}
          id={generatedId}
          type={type}
          disabled={disabled}
          required={required}
          className={`
            w-full rounded-lg border bg-white text-zinc-900
            placeholder:text-zinc-400
            text-base sm:text-xs font-medium py-2 transition-all outline-none
            ${LeftIcon ? 'pl-9' : 'pl-3'}
            ${RightIcon || rightElement ? 'pr-9' : 'pr-3'}
            ${error
              ? 'border-zinc-900 ring-1 ring-zinc-900'
              : 'border-zinc-300 focus:border-zinc-950 focus:ring-1 focus:ring-zinc-950'
            }
            disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-zinc-100
            ${className}
          `}
          {...props}
        />

        {RightIcon && (
          <div className="absolute right-3 text-zinc-400 pointer-events-none flex items-center justify-center">
            <RightIcon className="w-4 h-4" />
          </div>
        )}

        {rightElement && (
          <div className="absolute right-2 flex items-center justify-center">
            {rightElement}
          </div>
        )}
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

Input.displayName = 'Input';
export default Input;
