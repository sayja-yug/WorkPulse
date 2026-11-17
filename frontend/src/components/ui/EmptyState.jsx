import React from 'react';
import { Inbox } from 'lucide-react';
import { Button } from './Button';

export const EmptyState = ({
  icon: Icon = Inbox,
  title = 'No records found',
  description = 'There are no items to display at this moment.',
  actionLabel,
  onAction,
  actionIcon,
  children,
  className = '',
  ...props
}) => {
  return (
    <div
      className={`
        flex flex-col items-center justify-center text-center p-8 sm:p-12
        rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800
        bg-zinc-50/50 dark:bg-zinc-900/40 space-y-3 ${className}
      `}
      {...props}
    >
      <div className="w-12 h-12 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 flex items-center justify-center border border-zinc-200/60 dark:border-zinc-700/60 shadow-2xs">
        <Icon className="w-6 h-6 stroke-[1.75]" />
      </div>

      <div className="max-w-sm space-y-1">
        <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
          {title}
        </h3>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
          {description}
        </p>
      </div>

      {(actionLabel || children) && (
        <div className="pt-2 flex flex-wrap items-center justify-center gap-2">
          {actionLabel && (
            <Button
              variant="primary"
              size="sm"
              onClick={onAction}
              leftIcon={actionIcon}
            >
              {actionLabel}
            </Button>
          )}
          {children}
        </div>
      )}
    </div>
  );
};

export default EmptyState;

