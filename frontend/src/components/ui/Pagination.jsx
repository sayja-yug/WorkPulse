import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './Button';

export const Pagination = ({
  currentPage = 1,
  totalPages = 1,
  totalItems,
  pageSize = 10,
  onPageChange,
  className = '',
  ...props
}) => {
  if (totalPages <= 1 && !totalItems) return null;

  const startItem = totalItems ? Math.min((currentPage - 1) * pageSize + 1, totalItems) : null;
  const endItem = totalItems ? Math.min(currentPage * pageSize, totalItems) : null;

  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;
    
    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push('...');
      
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      
      for (let i = start; i <= end; i++) {
        if (!pages.includes(i)) pages.push(i);
      }
      
      if (currentPage < totalPages - 2) pages.push('...');
      if (!pages.includes(totalPages)) pages.push(totalPages);
    }
    return pages;
  };

  return (
    <div
      className={`
        flex flex-col sm:flex-row items-center justify-between gap-3 p-3 sm:p-4
        border-t border-zinc-200 dark:border-zinc-800 text-xs select-none ${className}
      `}
      {...props}
    >
      <div className="text-zinc-500 dark:text-zinc-400">
        {totalItems ? (
          <span>
            Showing <strong className="text-zinc-900 dark:text-zinc-100">{startItem}</strong> to{' '}
            <strong className="text-zinc-900 dark:text-zinc-100">{endItem}</strong> of{' '}
            <strong className="text-zinc-900 dark:text-zinc-100">{totalItems}</strong> entries
          </span>
        ) : (
          <span>
            Page <strong className="text-zinc-900 dark:text-zinc-100">{currentPage}</strong> of{' '}
            <strong className="text-zinc-900 dark:text-zinc-100">{totalPages}</strong>
          </span>
        )}
      </div>

      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="xs"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
          aria-label="Previous Page"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Previous</span>
        </Button>

        <div className="flex items-center gap-1 mx-1">
          {getPageNumbers().map((p, idx) => {
            if (p === '...') {
              return (
                <span key={`dots-${idx}`} className="px-2 text-zinc-400">
                  ...
                </span>
              );
            }
            const isCurrent = p === currentPage;
            return (
              <button
                key={p}
                type="button"
                onClick={() => onPageChange(p)}
                className={`
                  w-7 h-7 rounded-lg text-xs font-semibold flex items-center justify-center transition-all cursor-pointer
                  ${isCurrent
                    ? 'bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 shadow-2xs font-bold'
                    : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                  }
                `}
              >
                {p}
              </button>
            );
          })}
        </div>

        <Button
          variant="outline"
          size="xs"
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(currentPage + 1)}
          aria-label="Next Page"
        >
          <span className="hidden sm:inline">Next</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
};

export default Pagination;

