'use client';

import React from 'react';

export interface HexBadgeProps {
  children?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'brand' | 'glass' | 'risk' | 'confidence';
  color?: string;
  className?: string;
  haloColor?: string;
}

export function HexBadge({
  children,
  size = 'md',
  variant = 'brand',
  color,
  className = '',
  haloColor,
}: HexBadgeProps) {
  const sizeMap = {
    sm: { width: 28, height: 32, text: 'text-xs' },
    md: { width: 36, height: 40, text: 'text-sm' },
    lg: { width: 48, height: 54, text: 'text-base' },
  };

  const { width, height, text } = sizeMap[size];

  // Hexagon shield SVG points: (width/2, 0) -> (width, height*0.25) -> (width, height*0.75) -> (width/2, height) -> (0, height*0.75) -> (0, height*0.25)
  return (
    <div
      className={`relative inline-flex items-center justify-center shrink-0 ${text} font-display font-bold ${className}`}
      style={{ width, height }}
    >
      {/* Optional Confidence Halo Ring */}
      {haloColor && (
        <svg
          className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none"
          viewBox="0 0 100 100"
        >
          <polygon
            points="50,2 96,26 96,74 50,98 4,74 4,26"
            fill="none"
            stroke={haloColor}
            strokeWidth="5"
            strokeDasharray="260"
            strokeDashoffset="0"
            className="transition-all duration-500"
          />
        </svg>
      )}

      {/* Hexagonal Shield Background */}
      <svg
        className="absolute inset-0 w-full h-full drop-shadow-md"
        viewBox="0 0 100 100"
      >
        <defs>
          <linearGradient id="hex-brand-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FF8A3D" />
            <stop offset="38%" stopColor="#FFC53D" />
            <stop offset="100%" stopColor="#2DD4BF" />
          </linearGradient>
        </defs>

        <polygon
          points="50,6 92,28 92,72 50,94 8,72 8,28"
          fill={
            variant === 'brand'
              ? 'url(#hex-brand-grad)'
              : variant === 'glass'
              ? 'rgba(18, 28, 46, 0.9)'
              : color || '#2DD4BF'
          }
          stroke={haloColor || 'rgba(148, 184, 255, 0.2)'}
          strokeWidth="2"
        />
      </svg>

      {/* Content */}
      <span className="relative z-10 text-ink select-none flex items-center justify-center">
        {children}
      </span>
    </div>
  );
}