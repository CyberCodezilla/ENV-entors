'use client';

import React from 'react';
import type { Segment } from '@/lib/api/types';

export interface SegmentTooltipProps {
  segment: Segment;
  x: number;
  y: number;
}

export function SegmentTooltip({ segment, x, y }: SegmentTooltipProps) {
  const arrivalIST = new Date(segment.estimatedArrivalUtc).toLocaleTimeString('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  return (
    <div
      style={{ left: `${x}px`, top: `${y}px` }}
      className="fixed z-50 pointer-events-none -translate-x-1/2 -translate-y-[calc(100%+14px)] glass-panel bg-void/90 p-2.5 rounded-md border border-line-strong shadow-glass flex flex-col gap-1 text-xs font-mono max-w-xs animate-in fade-in duration-150"
    >
      <div className="flex items-center justify-between gap-3 text-ink font-bold border-b border-line pb-1">
        <span>Segment #{segment.segmentIndex + 1}</span>
        <span className="text-ink-3">{Math.round(segment.segmentLengthM)}m · {arrivalIST}</span>
      </div>

      <div className="flex items-center gap-3 text-[11px] pt-0.5">
        <span className="text-flood">🌊 Flood: {segment.floodRisk}</span>
        <span className="text-heat">🌡 Heat: {segment.heatRisk}</span>
        <span className="text-conf-good">✅ Conf: {segment.confidence}%</span>
      </div>

      {segment.hardBlock && (
        <span className="text-risk-4 font-bold text-[10px] uppercase">
          ⛔ {segment.hardBlockReason || 'Impassable Hazard'}
        </span>
      )}
    </div>
  );
}