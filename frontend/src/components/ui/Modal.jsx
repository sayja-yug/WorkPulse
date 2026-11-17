import React, { useEffect } from 'react';
import { X } from 'lucide-react';

export const Modal = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  maxWidth = 'max-w-lg',
  className = '',
}) => {
  // ESC key listener & body scroll lock
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose?.();
      }
    };

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={title || 'Dialog'}
    >
      <div 
        className={`
          bg-white text-zinc-900
          rounded-t-2xl sm:rounded-2xl shadow-modal border border-zinc-200
          w-full ${maxWidth} max-h-[92dvh] sm:max-h-[85vh] flex flex-col overflow-hidden
          animate-in fade-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200
          ${className}
        `}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-zinc-100 bg-zinc-50/70 shrink-0">
          <div className="min-w-0 pr-3">
            <h3 className="text-sm sm:text-base font-bold text-zinc-950 truncate">
              {title}
            </h3>
            {subtitle && (
              <p className="text-[11px] text-zinc-500 mt-0.5 leading-normal">
                {subtitle}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            type="button"
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 transition-colors cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 sm:p-6">
          {children}
        </div>
      </div>
    </div>
  );
};

export default Modal;
