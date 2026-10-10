'use client';

import React from 'react';
import type { ConfidenceLevel } from '@/lib/api/types';
import { confidenceLevelToColor } from '@/lib/theme/risk';

export interface ConfidenceHaloProps {
  level: ConfidenceLevel;
  children: React.ReactNode;
}

export function ConfidenceHalo({ level, children }: ConfidenceHaloProps) {
  const haloColor = confidenceLevelToColor(level);

  return (
    <div className="relative inline-flex items-center justify-center">
      {/* Animated SVG ring around rank badge */}
      <svg
        className="absolute -inset-1 w-[calc(100%+8px)] h-[calc(100%+8px)] -rotate-90 pointer-events-none"
        viewBox="0 0 100 100"
      >
        <circle
          cx="50"
          cy="50"
          r="45"
          fill="none"
          stroke={haloColor}
          strokeWidth="3.5"
          strokeDasharray="283"
          strokeDashoffset={level === 'good' ? '0' : level === 'moderate' ? '70' : '140'}
          className="transition-all duration-700 ease-out"
          strokeLinecap="round"
        />
      </svg>
      {children}
    </div>
  );
}