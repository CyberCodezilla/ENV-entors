/**
 * Maps risk/confidence levels to Tailwind colour tokens and hex values.
 * Single source of truth for all UI colour decisions.
 */
import type { RiskLevel, ConfidenceLevel } from '@heatflood/shared';

export const RISK_COLORS: Record<string, { bg: string; text: string; hex: string; label: string }> = {
  low:      { bg: 'bg-risk-low',      text: 'text-white', hex: '#22c55e', label: 'Low Risk' },
  moderate: { bg: 'bg-risk-moderate', text: 'text-white', hex: '#f59e0b', label: 'Moderate Risk' },
  high:     { bg: 'bg-risk-high',     text: 'text-white', hex: '#ef4444', label: 'High Risk' },
  blocked:  { bg: 'bg-risk-blocked',  text: 'text-white', hex: '#7f1d1d', label: 'Route Blocked' },
};

export const CONFIDENCE_COLORS: Record<string, { text: string; hex: string; label: string }> = {
  good:     { text: 'text-confidence-good',     hex: '#3b82f6', label: 'Good Confidence' },
  moderate: { text: 'text-confidence-moderate', hex: '#a3a3a3', label: 'Moderate Confidence' },
  limited:  { text: 'text-confidence-limited',  hex: '#f97316', label: 'Limited Confidence' },
};

export function mapboxRouteColor(floodLevel: string, isHardBlocked: boolean): string {
  if (isHardBlocked) return '#7f1d1d';
  return RISK_COLORS[floodLevel]?.hex ?? '#a3a3a3';
}
