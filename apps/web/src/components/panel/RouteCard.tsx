'use client';

import React from 'react';
import type { Route } from '@/lib/api/types';
import { HexBadge } from '@/components/ui/HexBadge';
import { Chip } from '@/components/ui/Chip';
import { ConfidenceHalo } from './ConfidenceHalo';
import { RiskRibbon } from './RiskRibbon';
import { GuardianAdvisory } from './GuardianAdvisory';
import { formatDistance, formatDuration } from '@/lib/geo/distance';
import { useAppStore } from '@/lib/store/useAppStore';

export interface RouteCardProps {
  route: Route;
  selected: boolean;
  onSelect: () => void;
}

export function RouteCard({ route, selected, onSelect }: RouteCardProps) {
  const { selectSegment, analysis } = useAppStore();

  return (
    <article
      onClick={onSelect}
      className={`glass-panel p-3.5 rounded-lg border transition-all duration-200 cursor-pointer relative overflow-hidden flex flex-col gap-2.5 ${
        selected
          ? 'border-line-strong bg-raised/90 shadow-glow -translate-y-0.5'
          : 'hover:border-line-strong/60 hover:-translate-y-0.5 bg-base/80'
      } ${
        route.isHardBlocked ? 'border-risk-4/40 bg-risk-4/5' : ''
      }`}
    >
      {/* Impassable diagonal stamp (M4) */}
      {route.isHardBlocked && (
        <div className="absolute top-3 right-3 rotate-[-8deg] z-20 pointer-events-none border-2 border-risk-4 text-risk-4 font-mono font-black text-[10px] px-2 py-0.5 uppercase tracking-wider rounded-xs bg-void/90 shadow-glass animate-in zoom-in-95 duration-200">
          Impassable
        </div>
      )}

      {/* Main content flex with Risk Ribbon */}
      <div className="flex gap-3">
        {/* Dual-lane Risk Ribbon on the left edge */}
        <RiskRibbon
          segments={route.segments}
          selectedSegmentIndex={
            selected ? analysis.selectedSegmentIndex : null
          }
          onSelectSegment={(idx) => {
            if (!selected) onSelect();
            selectSegment(idx);
          }}
        />

        <div className="flex-1 flex flex-col gap-2 min-w-0">
          {/* Header row: Rank badge + Distance / Duration */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <ConfidenceHalo level={route.overallConfidenceLevel}>
                <HexBadge size="sm" variant={selected ? 'brand' : 'glass'}>
                  {route.rank}
                </HexBadge>
              </ConfidenceHalo>

              <div className="flex flex-col">
                <span className="font-display font-bold text-sm text-ink leading-tight">
                  {route.rank === 1 ? 'Recommended Route' : `Alternative #${route.rank}`}
                </span>
                <span className="font-mono text-xs text-ink-3">
                  {formatDistance(route.distanceM)} · {formatDuration(route.durationSec)}
                </span>
              </div>
            </div>
          </div>

          {/* Level chips row */}
          <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
            <Chip
              variant="risk"
              riskLevel={route.overallFloodLevel}
              label={`Flood: ${route.overallFloodLevel}`}
            />
            <Chip
              variant="risk"
              riskLevel={route.overallHeatLevel}
              label={`Heat: ${route.overallHeatLevel}`}
            />
            <Chip
              variant="confidence"
              confidenceLevel={route.overallConfidenceLevel}
              label={`Confidence: ${route.overallConfidenceLevel}`}
            />
          </div>

          {/* Hard Block Reason */}
          {route.isHardBlocked && route.blockReason && (
            <p className="text-xs text-risk-4 font-medium leading-snug mt-1">
              ⛔ {route.blockReason}
            </p>
          )}

          {/* Sparse data confidence notice */}
          {route.overallConfidenceLevel === 'limited' && (
            <p className="text-[11px] text-conf-limited leading-snug">
              Sparse evidence — this corridor may be unmonitored right now.
            </p>
          )}

          {/* Guardian Advisory bubbles (M8) */}
          {route.rank === 1 && route.topReasons && route.topReasons.length > 0 && (
            <GuardianAdvisory topReasons={route.topReasons} />
          )}
        </div>
      </div>
    </article>
  );
}