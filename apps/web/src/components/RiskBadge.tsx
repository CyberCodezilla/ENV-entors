/**
 * RiskBadge — compact coloured pill for flood/heat risk level.
 * Used in route cards and segment tooltips.
 */
'use client';

import { RISK_COLORS } from '@/lib/riskColors';

interface Props {
  level: string;
  type: 'flood' | 'heat';
  score?: number;
  small?: boolean;
}

export function RiskBadge({ level, type, score, small = false }: Props) {
  const colors = RISK_COLORS[level] ?? RISK_COLORS.low;
  const icon = type === 'flood' ? '\uD83D\uDCA7' : '\uD83C\uDF21\uFE0F';
  const sizeClass = small ? 'text-xs px-2 py-0.5' : 'text-sm px-3 py-1';

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-semibold ${colors.bg} ${colors.text} ${sizeClass}`}
      title={`${type === 'flood' ? 'Flood' : 'Heat'} risk: ${colors.label}${score !== undefined ? ` (${score}/100)` : ''}`}
    >
      <span>{icon}</span>
      <span>{colors.label}</span>
      {score !== undefined && !small && (
        <span className="opacity-75 text-xs">({score})</span>
      )}
    </span>
  );
}
