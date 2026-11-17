import React, { forwardRef } from 'react';

export const Card = forwardRef(({
  children,
  className = '',
  hoverEffect = false,
  ...props
}, ref) => {
  return (
    <div
      ref={ref}
      className={`
        bg-white border border-zinc-200 rounded-xl
        shadow-xs text-zinc-900 overflow-hidden
        ${hoverEffect ? 'hover:border-zinc-400 transition-colors' : ''}
        ${className}
      `}
      {...props}
    >
      {children}
    </div>
  );
});
Card.displayName = 'Card';

export const CardHeader = forwardRef(({
  children,
  className = '',
  ...props
}, ref) => {
  const isRow = className.includes('flex-row') || className.includes('justify-between');
  return (
    <div
      ref={ref}
      className={`p-4 sm:p-5 border-b border-zinc-100 ${
        isRow ? 'flex items-center justify-between gap-4' : 'flex flex-col gap-1'
      } ${className}`}
      {...props}
    >
      {children}
    </div>
  );
});
CardHeader.displayName = 'CardHeader';

export const CardTitle = forwardRef(({
  children,
  className = '',
  as: Component = 'h3',
  ...props
}, ref) => {
  return (
    <Component
      ref={ref}
      className={`text-sm sm:text-base font-bold tracking-tight text-zinc-950 ${className}`}
      {...props}
    >
      {children}
    </Component>
  );
});
CardTitle.displayName = 'CardTitle';

export const CardDescription = forwardRef(({
  children,
  className = '',
  ...props
}, ref) => {
  return (
    <p
      ref={ref}
      className={`text-xs text-zinc-500 leading-relaxed ${className}`}
      {...props}
    >
      {children}
    </p>
  );
});
CardDescription.displayName = 'CardDescription';

export const CardContent = forwardRef(({
  children,
  className = '',
  ...props
}, ref) => {
  return (
    <div
      ref={ref}
      className={`p-4 sm:p-5 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
});
CardContent.displayName = 'CardContent';

export const CardFooter = forwardRef(({
  children,
  className = '',
  ...props
}, ref) => {
  return (
    <div
      ref={ref}
      className={`p-4 sm:p-5 border-t border-zinc-100 bg-zinc-50/60 flex items-center justify-between gap-3 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
});
CardFooter.displayName = 'CardFooter';

export default Card;
