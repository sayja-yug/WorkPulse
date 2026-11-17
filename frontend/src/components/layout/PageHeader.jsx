import React from 'react';
import { Breadcrumb } from '../ui/Breadcrumb';

export const PageHeader = ({
  title,
  subtitle,
  description,
  breadcrumbs = [],
  badge,
  actions,
  children,
  className = '',
}) => {
  return (
    <div className={`flex flex-col gap-3 sm:gap-4 pb-4 border-b border-zinc-200 ${className}`}>
      {breadcrumbs.length > 0 && (
        <Breadcrumb items={breadcrumbs} className="-mb-1" />
      )}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div className="space-y-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-black text-zinc-950 tracking-tight leading-tight truncate">
              {title}
            </h1>
            {badge && (
              <div className="shrink-0">{badge}</div>
            )}
          </div>
          {(description || subtitle) && (
            <p className="text-xs sm:text-sm text-zinc-500 leading-relaxed max-w-3xl">
              {description || subtitle}
            </p>
          )}
        </div>

        {actions && (
          <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 shrink-0 self-start sm:self-auto">
            {actions}
          </div>
        )}
      </div>

      {children}
    </div>
  );
};

export default PageHeader;
