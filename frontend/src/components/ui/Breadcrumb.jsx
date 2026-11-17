import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';

export const Breadcrumb = ({
  items = [], // Array of { label, href, icon }
  className = '',
  ...props
}) => {
  return (
    <nav
      aria-label="Breadcrumb"
      className={`flex items-center text-xs text-zinc-500 dark:text-zinc-400 overflow-x-auto no-scrollbar whitespace-nowrap py-1 ${className}`}
      {...props}
    >
      <ol className="inline-flex items-center gap-1.5">
        <li className="inline-flex items-center">
          <Link
            to="/"
            className="inline-flex items-center gap-1 text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white transition-colors"
          >
            <Home className="w-3.5 h-3.5" />
            <span className="sr-only">Home</span>
          </Link>
        </li>

        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <li key={index} className="inline-flex items-center gap-1.5">
              <ChevronRight className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-600 shrink-0" />
              {isLast || !item.href ? (
                <span className="font-bold text-zinc-900 dark:text-zinc-100" aria-current="page">
                  {item.label}
                </span>
              ) : (
                <Link
                  to={item.href}
                  className="hover:text-zinc-900 dark:hover:text-white transition-colors"
                >
                  {item.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};

export default Breadcrumb;

