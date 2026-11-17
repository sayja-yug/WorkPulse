import React from 'react';

export const Skeleton = ({
  className = '',
  circle = false,
  ...props
}) => {
  return (
    <div
      className={`
        bg-zinc-200/80 dark:bg-zinc-800/80 animate-pulse
        ${circle ? 'rounded-full' : 'rounded-lg'}
        ${className}
      `}
      {...props}
    />
  );
};

export const TableSkeleton = ({ rows = 5, cols = 5, className = '' }) => {
  return (
    <div className={`space-y-3 p-4 ${className}`}>
      <div className="flex gap-4 mb-4">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} className="h-5 flex-1" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex gap-4 py-2 border-b border-zinc-100 dark:border-zinc-800/60">
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton key={c} className="h-4 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
};

export const CardSkeleton = ({ className = '' }) => {
  return (
    <div className={`p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-3 ${className}`}>
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-28" />
        <Skeleton circle className="h-8 w-8" />
      </div>
      <Skeleton className="h-7 w-36" />
      <Skeleton className="h-3.5 w-48" />
    </div>
  );
};

export default Skeleton;

