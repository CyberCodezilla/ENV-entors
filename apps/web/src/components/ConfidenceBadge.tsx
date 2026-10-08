/**
 * ConfidenceBadge — shows data confidence level.
 * Always displayed alongside risk badges.
 * Low confidence ≠ low risk — the label makes this explicit.
 */
'use client';

import { CONFIDENCE_COLORS } from '@/lib/riskColors';

interface Props {
  level: string;
  score?: number;
  showExplainer?: boolean;
}

export function ConfidenceBadge({ level, score, showExplainer = false }: Props) {
  const colors = CONFIDENCE_COLORS[level] ?? CONFIDENCE_COLORS.moderate;

  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium ${colors.text}`}>
      <span>📊</span>
      <span>{colors.label}</span>
      {score !== undefined && <span className="opacity-60">({score})</span>}
      {showExplainer && level === 'limited' && (
        <span className="ml-1 text-orange-400">— limited data, not ‘safe’</span>
      )}
    </span>
  );
}
