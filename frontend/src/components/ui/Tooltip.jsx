import React, { useState } from 'react';

export const Tooltip = ({
  content,
  children,
  position = 'top', // 'top' | 'bottom' | 'left' | 'right'
  className = '',
  delay = 150,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [timeoutId, setTimeoutId] = useState(null);

  if (!content) return children;

  const handleMouseEnter = () => {
    const id = setTimeout(() => setIsVisible(true), delay);
    setTimeoutId(id);
  };

  const handleMouseLeave = () => {
    if (timeoutId) clearTimeout(timeoutId);
    setIsVisible(false);
  };

  const positions = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-1.5',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-1.5',
    left: 'right-full top-1/2 -translate-y-1/2 mr-1.5',
    right: 'left-full top-1/2 -translate-y-1/2 ml-1.5',
  };

  return (
    <div
      className={`relative inline-flex ${className}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={handleMouseEnter}
      onBlur={handleMouseLeave}
    >
      {children}
      {isVisible && (
        <div
          role="tooltip"
          className={`
            absolute z-50 px-2.5 py-1 text-2xs font-semibold
            bg-zinc-950 text-white dark:bg-white dark:text-zinc-950
            rounded-md shadow-subtle pointer-events-none whitespace-nowrap
            animate-in fade-in zoom-in-95 duration-100
            ${positions[position] || positions.top}
          `}
        >
          {content}
        </div>
      )}
    </div>
  );
};

export default Tooltip;

