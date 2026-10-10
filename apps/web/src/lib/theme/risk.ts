import type { RiskLevel, ConfidenceLevel } from '../api/types';
import { TOKENS } from './tokens';

/**
 * Maps numeric score (0-100) to unified risk ramp color hex
 */
export function scoreToRiskColor(score: number): string {
  if (score <= 20) return TOKENS.risk[0];
  if (score <= 40) return TOKENS.risk[1];
  if (score <= 60) return TOKENS.risk[2];
  if (score <= 80) return TOKENS.risk[3];
  return TOKENS.risk[4];
}

/**
 * Maps risk level string to color hex
 */
export function riskLevelToColor(level: RiskLevel): string {
  switch (level) {
    case 'low':
      return TOKENS.risk[0];
    case 'moderate':
      return TOKENS.risk[1];
    case 'high':
      return TOKENS.risk[3];
    case 'blocked':
      return TOKENS.risk[4];
    default:
      return TOKENS.risk[0];
  }
}

/**
 * Maps confidence level string to color hex
 */
export function confidenceLevelToColor(level: ConfidenceLevel): string {
  switch (level) {
    case 'good':
      return TOKENS.confidence.good;
    case 'moderate':
      return TOKENS.confidence.moderate;
    case 'limited':
      return TOKENS.confidence.limited;
    default:
      return TOKENS.confidence.moderate;
  }
}

/**
 * Mapbox GL route line color
 */
export function mapboxRouteColor(floodLevel: RiskLevel, isHardBlocked: boolean): string {
  if (isHardBlocked) return '#7F1D1D'; // Desaturated crimson / burgundy
  return riskLevelToColor(floodLevel);
}