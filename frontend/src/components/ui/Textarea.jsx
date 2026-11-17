import React, { forwardRef } from 'react';

export const Textarea = forwardRef(({
  label,
  error,
  helperText,
  className = '',
  containerClassName = '',
  id,
  rows = 3,
  disabled = false,
  required = false,
  ...props
}, ref) => {
  const generatedId = id || (label ? `textarea-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined);

  return (
    <div className={`w-full flex flex-col gap-1.5 ${containerClassName}`}>
      {label && (
        <label
          htmlFor={generatedId}
          className="text-xs font-semibold text-zinc-800  flex items-center justify-between"
        >
          <span>
            {label}
            {required && <span className="text-zinc-500 ml-1">*</span>}
          </span>
        </label>
      )}

      <textarea
        ref={ref}
        id={generatedId}
        rows={rows}
        disabled={disabled}
        required={required}
        className={`
          w-full rounded-lg border bg-white  text-zinc-900 
          placeholder:text-zinc-400 
          text-base sm:text-xs font-medium p-3 transition-all outline-none resize-y
          ${error
            ? 'border-zinc-800  ring-1 ring-zinc-800 '
            : 'border-zinc-300  focus:border-zinc-950  focus:ring-1 focus:ring-zinc-950 '
          }
          disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-zinc-50 
          ${className}
        `}
        {...props}
      />

      {error ? (
        <p className="text-2xs font-medium text-zinc-900  mt-0.5">
          {error}
        </p>
      ) : helperText ? (
        <p className="text-2xs text-zinc-500  mt-0.5">
          {helperText}
        </p>
      ) : null}
    </div>
  );
});

Textarea.displayName = 'Textarea';
export default Textarea;

