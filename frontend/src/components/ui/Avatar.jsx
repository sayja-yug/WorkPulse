import React, { useState } from 'react';

export const Avatar = ({
  src,
  alt = '',
  name = '',
  size = 'md', // 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  className = '',
  ...props
}) => {
  const [imageError, setImageError] = useState(false);

  const sizes = {
    xs: 'w-5 h-5 text-[9px]',
    sm: 'w-7 h-7 text-xs',
    md: 'w-9 h-9 text-xs',
    lg: 'w-11 h-11 text-sm',
    xl: 'w-14 h-14 text-base font-bold',
  };

  const getInitials = (text) => {
    if (!text) return 'U';
    const parts = text.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const initials = getInitials(name || alt);
  const sizeStyle = sizes[size] || sizes.md;

  return (
    <div
      className={`
        relative inline-flex items-center justify-center shrink-0 rounded-full select-none
        bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 font-bold tracking-tight
        border border-zinc-200/80 dark:border-zinc-800 shadow-2xs overflow-hidden
        ${sizeStyle} ${className}
      `}
      {...props}
    >
      {src && !imageError ? (
        <img
          src={src}
          alt={alt || name}
          onError={() => setImageError(true)}
          className="w-full h-full object-cover"
        />
      ) : (
        <span>{initials}</span>
      )}
    </div>
  );
};

export default Avatar;

