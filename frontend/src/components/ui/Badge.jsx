import React from 'react';

export const Badge = ({
  children,
  variant = 'default', // 'default' | 'inverted' | 'outline' | 'neutral' | 'success' | 'warning' | 'danger'
  size = 'sm',        // 'xs' | 'sm' | 'md'
  dot = false,
  dotColor,
  className = '',
  ...props
}) => {
  const variants = {
    default: 'bg-zinc-100 text-zinc-800 border-zinc-200',
    inverted: 'bg-zinc-950 text-white border-zinc-950 shadow-2xs',
    neutral: 'bg-zinc-100 text-zinc-800 border-zinc-300',
    outline: 'bg-white text-zinc-800 border-zinc-300',
    success: 'bg-zinc-100 text-zinc-950 border-zinc-300 font-bold',
    warning: 'bg-zinc-100 text-zinc-900 border-zinc-400 font-bold',
    danger: 'bg-zinc-900 text-white border-zinc-800 font-bold',
    info: 'bg-zinc-100 text-zinc-800 border-zinc-200',
  };

  const sizes = {
    xs: 'text-[10px] px-1.5 py-0.5 rounded-md',
    sm: 'text-[11px] px-2.5 py-0.5 rounded-full',
    md: 'text-xs px-3 py-1 rounded-full',
  };

  const dotColors = {
    success: 'bg-zinc-950',
    warning: 'bg-zinc-500',
    danger: 'bg-zinc-950',
    default: 'bg-zinc-400',
  };

  const style = variants[variant] || variants.default;
  const sizeStyle = sizes[size] || sizes.sm;
  const effectiveDotColor = dotColor || dotColors[variant] || 'bg-current';

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-bold tracking-wide border select-none ${style} ${sizeStyle} ${className}`}
      {...props}
    >
      {dot && (
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${effectiveDotColor}`} />
      )}
      <span>{children}</span>
    </span>
  );
};

export default Badge;
