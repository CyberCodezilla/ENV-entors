/**
 * RouteCard — Day 5 update: adds DataFreshnessFooter.
 */
'use client';

import type { RouteResult } from '@heatflood/shared';
import type { AnalyseRoutesResponse } from '@heatflood/shared';
import { RiskBadge } from './RiskBadge';
import { ConfidenceBadge } from './ConfidenceBadge';
import { DataFreshnessFooter } from './DataFreshnessFooter';

interface Props {
  route: RouteResult;
  isSelected: boolean;
  onSelect: () => void;
  isReplay?: boolean;
  freshness?: AnalyseRoutesResponse['dataFreshness'];
}

function formatDuration(sec: number): string {
  const mins = Math.round(sec / 60);
  if (mins < 60) return `${mins} min`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

function formatDistance(m: number): string {
  if (m < 1000) return `${Math.round(m)} m`;
  return `${(m / 1000).toFixed(1)} km`;
}

export function RouteCard({ route, isSelected, onSelect, isReplay = false, freshness }: Props) {
  const isBlocked = route.isHardBlocked;
  const isRecommended = route.rank === 1 && !isBlocked;
  const mlSignals = route.segments.map(s => s.mlSignal).filter(s => s?.available && typeof s.probability === 'number');
  const mlProbability = mlSignals.length > 0
    ? mlSignals.reduce((sum, s) => sum + (s?.probability ?? 0), 0) / mlSignals.length
    : null;

  return (
    <button
      onClick={onSelect}
      disabled={isBlocked}
      className={[
        'w-full text-left rounded-xl p-4 transition-all border-2',
        isBlocked
          ? 'bg-gray-900 border-red-900 opacity-60 cursor-not-allowed'
          : isSelected
          ? 'bg-gray-800 border-blue-500'
          : isRecommended
          ? 'bg-gray-800 border-green-500 hover:border-green-400'
          : 'bg-gray-800 border-gray-700 hover:border-gray-500',
      ].join(' ')}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-white">Route {route.rank}</span>
          {isRecommended && (
            <span className="text-xs bg-green-700 text-white px-2 py-0.5 rounded-full">✓ Recommended</span>
          )}
          {isBlocked && (
            <span className="text-xs bg-red-900 text-white px-2 py-0.5 rounded-full">⛔ Blocked</span>
          )}
          {isReplay && (
            <span className="text-xs bg-yellow-700 text-white px-2 py-0.5 rounded-full">DEMO</span>
          )}
        </div>
        <span className="text-xs text-gray-400">
          {formatDistance(route.distanceM)} · {formatDuration(route.durationSec)}
        </span>
      </div>

      <div className="flex flex-wrap gap-2 mb-3">
        <RiskBadge level={route.overallFloodLevel} type="flood" score={route.weightedFloodExposure} small />
        <RiskBadge level={route.overallHeatLevel} type="heat" score={route.weightedHeatExposure} small />
        <ConfidenceBadge level={route.overallConfidenceLevel} showExplainer />
      </div>

      {mlProbability !== null && (
        <p className="text-[11px] text-blue-300 mb-2">
          ML advisory signal: {(mlProbability * 100).toFixed(0)}% susceptibility · rule engine remains authoritative
        </p>
      )}

      {isBlocked && route.blockReason && (
        <p className="text-xs text-red-400 mb-2">{route.blockReason}</p>
      )}

      {route.topReasons.length > 0 && !isBlocked && (
        <ul className="text-xs text-gray-400 space-y-0.5">
          {route.topReasons.map((r, i) => (
            <li key={i} className="flex gap-1"><span>•</span><span>{r}</span></li>
          ))}
        </ul>
      )}

      {freshness && (
        <DataFreshnessFooter freshness={freshness} isReplay={isReplay} />
      )}

      <p className="text-[10px] text-gray-600 mt-3 leading-tight">{route.disclaimer}</p>
    </button>
  );
}
