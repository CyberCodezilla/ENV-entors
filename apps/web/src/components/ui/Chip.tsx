'use client';

import React from 'react';
import type { RiskLevel, ConfidenceLevel } from '@/lib/api/types';

export interface ChipProps {
  label: string;
  variant?: 'risk' | 'confidence' | 'neutral' | 'brand';
  riskLevel?: RiskLevel;
  confidenceLevel?: ConfidenceLevel;
  icon?: React.ReactNode;
  className?: string;
  mono?: boolean;
}

export function Chip({
  label,
  variant = 'neutral',
  riskLevel,
  confidenceLevel,
  icon,
  className = '',
  mono = false,
}: ChipProps) {
  let styleClasses = 'bg-raised/70 text-ink-2 border-line';

  if (variant === 'risk' && riskLevel) {
    const riskMap: Record<RiskLevel, string> = {
      low: 'bg-risk-low/15 text-risk-low border-risk-low/30',
      moderate: 'bg-risk-moderate/15 text-risk-moderate border-risk-moderate/30',
      high: 'bg-risk-high/15 text-risk-high border-risk-high/30',
      blocked: 'bg-risk-blocked/20 text-risk-blocked border-risk-blocked/50',
    };
    styleClasses = riskMap[riskLevel] || styleClasses;
  } else if (variant === 'confidence' && confidenceLevel) {
    const confMap: Record<ConfidenceLevel, string> = {
      good: 'bg-conf-good/15 text-conf-good border-conf-good/30',
      moderate: 'bg-conf-moderate/15 text-conf-moderate border-conf-moderate/30',
      limited: 'bg-conf-limited/15 text-conf-limited border-conf-limited/30',
    };
    styleClasses = confMap[confidenceLevel] || styleClasses;
  } else if (variant === 'brand') {
    styleClasses = 'bg-flood/10 text-flood border-flood/30';
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-pill text-xs font-medium border ${styleClasses} ${
        mono ? 'font-mono' : ''
      } ${className}`}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      <span className="capitalize">{label}</span>
    </span>
  );
}