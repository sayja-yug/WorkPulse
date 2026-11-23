import React, { forwardRef } from 'react';
import { Loader2 } from 'lucide-react';

export const Button = forwardRef(({
  children,
  type = 'button',
  variant = 'primary', // 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'icon'
  size = 'md',         // 'xs' | 'sm' | 'md' | 'lg' | 'icon'
  isLoading = false,
  disabled = false,
  className = '',
  leftIcon: LeftIcon,
  rightIcon: RightIcon,
  ...props
}, ref) => {
  const baseStyles = 'inline-flex items-center justify-center font-semibold transition-all duration-150 select-none outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 focus-visible:ring-offset-1 disabled:opacity-50 disabled:pointer-events-none cursor-pointer';

  const variants = {
    primary: 'bg-zinc-950 hover:bg-black active:bg-zinc-900 text-white shadow-xs border border-transparent',
    secondary: 'bg-white hover:bg-zinc-50 active:bg-zinc-100 text-zinc-900 border border-zinc-300 shadow-2xs',
    outline: 'bg-transparent hover:bg-zinc-100 active:bg-zinc-200 text-zinc-900 border border-zinc-300',
    ghost: 'bg-transparent hover:bg-zinc-100 active:bg-zinc-200 text-zinc-700 hover:text-zinc-950',
    danger: 'bg-rose-800 hover:bg-rose-900 text-white border border-rose-800 shadow-2xs',
    icon: 'bg-transparent hover:bg-zinc-100 active:bg-zinc-200 text-zinc-600 hover:text-zinc-950 rounded-lg',
  };

  const sizes = {
    xs: 'text-2xs px-2 py-1 rounded-md gap-1 min-h-[28px]',
    sm: 'text-xs px-2.5 py-1.5 rounded-lg gap-1.5 min-h-[32px]',
    md: 'text-xs sm:text-sm px-3.5 py-2 rounded-lg gap-2 min-h-[38px] sm:min-h-[36px]',
    lg: 'text-sm px-4 py-2.5 rounded-xl gap-2 min-h-[44px]',
    icon: 'p-2 rounded-lg min-w-[36px] min-h-[36px] sm:min-w-[32px] sm:min-h-[32px]',
  };

  const computedVariant = variants[variant] || variants.primary;
  const computedSize = sizes[size] || sizes.md;

  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || isLoading}
      className={`${baseStyles} ${computedVariant} ${computedSize} ${className}`}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin shrink-0" />
      ) : LeftIcon ? (
        <LeftIcon className="w-4 h-4 shrink-0" />
      ) : null}
      
      {children && <span>{children}</span>}
      
      {!isLoading && RightIcon ? (
        <RightIcon className="w-4 h-4 shrink-0" />
      ) : null}
    </button>
  );
});

Button.displayName = 'Button';
export default Button;
