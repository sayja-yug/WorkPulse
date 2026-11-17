import React, { forwardRef } from 'react';

export const Radio = forwardRef(({
  label,
  description,
  id,
  name,
  value,
  checked,
  onChange,
  disabled = false,
  className = '',
  ...props
}, ref) => {
  const generatedId = id || (label ? `rad-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined);

  return (
    <label
      htmlFor={generatedId}
      className={`inline-flex items-start gap-2.5 cursor-pointer select-none group ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
    >
      <div className="relative flex items-center justify-center shrink-0 mt-0.5">
        <input
          ref={ref}
          id={generatedId}
          type="radio"
          name={name}
          value={value}
          checked={checked}
          onChange={onChange}
          disabled={disabled}
          className="sr-only peer"
          {...props}
        />
        <div className="w-4 h-4 rounded-full border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 peer-checked:border-zinc-950 dark:peer-checked:border-white transition-all peer-focus-visible:ring-2 peer-focus-visible:ring-zinc-950 dark:peer-focus-visible:ring-white flex items-center justify-center shadow-2xs">
          <div className="w-2 h-2 rounded-full bg-zinc-950 dark:bg-white opacity-0 peer-checked:opacity-100 transition-opacity" />
        </div>
      </div>

      {(label || description) && (
        <div className="flex flex-col">
          {label && (
            <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 leading-tight">
              {label}
            </span>
          )}
          {description && (
            <span className="text-2xs text-zinc-500 dark:text-zinc-400 mt-0.5 leading-normal">
              {description}
            </span>
          )}
        </div>
      )}
    </label>
  );
});

Radio.displayName = 'Radio';
export default Radio;

