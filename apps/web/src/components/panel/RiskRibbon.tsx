'use client';

import React from 'react';
import type { Segment } from '@/lib/api/types';
import { scoreToRiskColor } from '@/lib/theme/risk';

export interface RiskRibbonProps {
  segments: Segment[];
  selectedSegmentIndex: number | null;
  onSelectSegment?: (index: number) => void;
}

export function RiskRibbon({
  segments,
  selectedSegmentIndex,
  onSelectSegment,
}: RiskRibbonProps) {
  const totalLength = segments.reduce((sum, s) => sum + (s.segmentLengthM || 1), 0);

  return (
    <div
      role="group"
      aria-label="Route risk ribbon"
      className="flex flex-col w-[12px] h-full min-h-[96px] rounded-pill overflow-hidden bg-void/80 border border-line p-[1px] gap-[1px] shrink-0"
    >
      {segments.map((seg, idx) => {
        const heightPct = Math.max(8, ((seg.segmentLengthM || 1) / totalLength) * 100);
        const floodColor = scoreToRiskColor(seg.floodRisk);
        const heatColor = scoreToRiskColor(seg.heatRisk);
        const isSelected = selectedSegmentIndex === idx;

        const arrivalIST = new Date(seg.estimatedArrivalUtc).toLocaleTimeString('en-IN', {
          timeZone: 'Asia/Kolkata',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        });

        const tooltip = `S${seg.segmentIndex + 1} · ${Math.round(seg.segmentLengthM)}m · ETA ${arrivalIST} · 🌊${seg.floodRisk} 🌡${seg.heatRisk} ✅${seg.confidence}`;

        return (
          <button
            key={idx}
            type="button"
            title={tooltip}
            aria-label={`Segment ${seg.segmentIndex + 1}, ${Math.round(seg.segmentLengthM)} meters, flood risk ${seg.floodRisk}, heat risk ${seg.heatRisk}`}
            onClick={(e) => {
              e.stopPropagation();
              onSelectSegment?.(idx);
            }}
            style={{ height: `${heightPct}%` }}
            className={`w-full grid grid-cols-2 rounded-xs transition-transform hover:scale-x-125 focus:scale-x-125 relative group ${
              isSelected ? 'ring-2 ring-white z-10' : ''
            }`}
          >
            {/* Lane A: Flood Risk */}
            <div
              style={{ backgroundColor: floodColor }}
              className={`w-full h-full ${
                seg.hardBlock ? 'bg-[repeating-linear-gradient(45deg,#E11D48,#E11D48_2px,#7F1D1D_2px,#7F1D1D_4px)]' : ''
              }`}
            />
            {/* Lane B: Heat Risk */}
            <div
              style={{ backgroundColor: heatColor }}
              className="w-full h-full"
            />
          </button>
        );
      })}
    </div>
  );
}