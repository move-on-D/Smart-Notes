import React from 'react';

interface CupboardIconProps {
  className?: string;
  size?: number;
}

export const CupboardIcon: React.FC<CupboardIconProps> = ({ className = 'w-6 h-6', size }) => {
  return (
    <svg 
      viewBox="0 0 64 64" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={size ? { width: size, height: size } : undefined}
    >
      {/* Cupboard Outer Cabinet Frame */}
      <rect x="8" y="7" width="48" height="50" rx="3" fill="#0f172a" stroke="#0284c7" strokeWidth="2" />
      {/* Top Arch / Crown */}
      <rect x="6" y="5" width="52" height="4" rx="1" fill="#0369a1" />

      {/* Middle Shelf Divider */}
      <rect x="8" y="31" width="48" height="3" fill="#38bdf8" />
      {/* Bottom Shelf Base */}
      <rect x="6" y="54" width="52" height="4" rx="1" fill="#38bdf8" />

      {/* Vertical subtle back panel partition */}
      <line x1="24" y1="9" x2="24" y2="54" stroke="#0284c7" strokeWidth="0.8" strokeOpacity="0.3" />
      <line x1="40" y1="9" x2="40" y2="54" stroke="#0284c7" strokeWidth="0.8" strokeOpacity="0.3" />

      {/* TOP SHELF BOOKS */}
      {/* Book 1 (Cyan) */}
      <rect x="12" y="14" width="5" height="17" rx="0.8" fill="#06b6d4" />
      <line x1="13" y1="16" x2="16" y2="16" stroke="#e0f2fe" strokeWidth="0.8" />
      
      {/* Book 2 (Amber) */}
      <rect x="18" y="17" width="4.5" height="14" rx="0.8" fill="#f59e0b" />
      <line x1="19" y1="19" x2="21.5" y2="19" stroke="#fef3c7" strokeWidth="0.8" />

      {/* Book 3 (Emerald) */}
      <rect x="23.5" y="15" width="5" height="16" rx="0.8" fill="#10b981" />
      <line x1="24.5" y1="17" x2="27.5" y2="17" stroke="#d1fae5" strokeWidth="0.8" />

      {/* Book 4 (Rose, leaning) */}
      <g transform="translate(30, 31) rotate(16)">
        <rect x="0" y="-16" width="4.5" height="16" rx="0.8" fill="#f43f5e" />
      </g>

      {/* Star sparkle on top shelf */}
      <circle cx="48" cy="18" r="1.5" fill="#38bdf8" />

      {/* BOTTOM SHELF BOOKS */}
      {/* Book 5 (Violet Binder) */}
      <rect x="12" y="38" width="6" height="16" rx="0.8" fill="#8b5cf6" />
      <line x1="13" y1="41" x2="17" y2="41" stroke="#ede9fe" strokeWidth="0.8" />

      {/* Book 6 (Blue Textbook) */}
      <rect x="19" y="36" width="5" height="18" rx="0.8" fill="#3b82f6" />
      <line x1="20" y1="39" x2="23" y2="39" stroke="#dbeafe" strokeWidth="0.8" />

      {/* Book 7 (Gold Register) */}
      <rect x="25" y="40" width="4.5" height="14" rx="0.8" fill="#eab308" />

      {/* Book 8 (Teal, leaning) */}
      <g transform="translate(31, 54) rotate(14)">
        <rect x="0" y="-16" width="4.5" height="16" rx="0.8" fill="#14b8a6" />
      </g>

      {/* Knobs */}
      <circle cx="9.5" cy="32.5" r="0.8" fill="#38bdf8" />
      <circle cx="54.5" cy="32.5" r="0.8" fill="#38bdf8" />
    </svg>
  );
};
