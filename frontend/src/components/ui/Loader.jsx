import React from 'react';

export const Loader = ({ message = 'Loading...', size = 'md', className = '' }) => {
  const sizeClasses = {
    sm: 'w-4 h-4 border-2',
    md: 'w-7 h-7 border-2 sm:border-[2.5px]',
    lg: 'w-10 h-10 border-3',
  };

  return (
    <div className={`flex flex-col items-center justify-center p-8 gap-3 ${className}`}>
      <div
        className={`${sizeClasses[size] || sizeClasses.md} border-zinc-950 border-t-transparent rounded-full animate-spin shrink-0`}
      />
      {message && (
        <p className="text-xs font-semibold text-zinc-600 uppercase tracking-wider select-none">
          {message}
        </p>
      )}
    </div>
  );
};

export default Loader;
