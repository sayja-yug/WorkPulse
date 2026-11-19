import React, { useState } from 'react';
import { Info } from 'lucide-react';

export const NumberTooltip = ({ text }) => {
  const [show, setShow] = useState(false);

  if (!text) return null;

  return (
    <span className="relative inline-flex items-center ml-1">
      <button
        type="button"
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        onFocus={() => setShow(true)}
        onBlur={() => setShow(false)}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setShow(!show);
        }}
        className="text-zinc-400 hover:text-zinc-700 transition-colors p-0.5 rounded cursor-help"
        aria-label="More information"
      >
        <Info className="w-3 h-3" />
      </button>

      {show && (
        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 w-48 sm:w-56 p-2 bg-zinc-950 text-white text-[11px] font-medium leading-relaxed rounded-lg shadow-xl z-50 text-center pointer-events-none animate-in fade-in zoom-in-95 duration-100">
          {text}
          <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-zinc-950" />
        </span>
      )}
    </span>
  );
};

export default NumberTooltip;

