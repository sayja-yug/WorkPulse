import React, { useState, useRef, useEffect, forwardRef } from 'react';

export const Dropdown = forwardRef(({
  trigger,
  children,
  align = 'right', // 'left' | 'right'
  className = '',
  menuClassName = '',
  ...props
}, ref) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const alignStyles = align === 'left' ? 'left-0' : 'right-0';

  return (
    <div ref={containerRef} className={`relative inline-block text-left ${className}`} {...props}>
      <div onClick={() => setIsOpen((prev) => !prev)}>
        {trigger}
      </div>

      {isOpen && (
        <div
          ref={ref}
          className={`
            absolute ${alignStyles} mt-1.5 min-w-[180px] max-w-xs
            bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800
            rounded-xl shadow-popover py-1 z-50 text-xs text-zinc-900 dark:text-zinc-100
            animate-in fade-in zoom-in-95 duration-100
            ${menuClassName}
          `}
          onClick={() => setIsOpen(false)}
        >
          {children}
        </div>
      )}
    </div>
  );
});
Dropdown.displayName = 'Dropdown';

export const DropdownItem = ({
  children,
  icon: Icon,
  onClick,
  danger = false,
  className = '',
  disabled = false,
  ...props
}) => {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`
        w-full text-left px-3.5 py-2 flex items-center gap-2.5 transition-colors cursor-pointer select-none
        disabled:opacity-40 disabled:pointer-events-none
        ${danger
          ? 'text-zinc-900 dark:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 font-semibold'
          : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-950 dark:hover:text-white'
        }
        ${className}
      `}
      {...props}
    >
      {Icon && <Icon className="w-4 h-4 shrink-0 text-zinc-400 dark:text-zinc-500" />}
      <span className="truncate">{children}</span>
    </button>
  );
};

export const DropdownSeparator = ({ className = '' }) => (
  <div className={`border-t border-zinc-100 dark:border-zinc-800 my-1 ${className}`} />
);

export default Dropdown;

