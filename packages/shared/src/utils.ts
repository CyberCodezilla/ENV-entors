/**
 * HeatFlood Guardian — Shared Utility Functions
 */
import { RISK_THRESHOLDS, CONFIDENCE_THRESHOLDS } from './constants';
import { RiskLevel, ConfidenceLevel } from './schemas';

/**
 * Maps a 0–100 risk score to a RiskLevel ('low' | 'moderate' | 'high' | 'blocked').
 */
export function scoreToLevel(score: number): RiskLevel {
  if (score <= RISK_THRESHOLDS.low) return 'low';
  if (score <= RISK_THRESHOLDS.moderate) return 'moderate';
  if (score <= RISK_THRESHOLDS.high) return 'high';
  return 'blocked';
}

/**
 * Maps a 0–100 confidence score to a ConfidenceLevel ('limited' | 'moderate' | 'good').
 */
export function confidenceLevelFromScore(score: number): ConfidenceLevel {
  if (score <= CONFIDENCE_THRESHOLDS.limited) return 'limited';
  if (score <= CONFIDENCE_THRESHOLDS.moderate) return 'moderate';
  return 'good';
}

/**
 * Calculates the age in minutes of the oldest incident in an array.
 * Returns null if the array is empty.
 */
export function calculateOldestIncidentAge(
  incidents: Array<{ observedAt: string }>,
  now: Date,
): number | null {
  if (!incidents.length) return null;
  return incidents.reduce((max, inc) => {
    const age = (now.getTime() - new Date(inc.observedAt).getTime()) / 60_000;
    return age > max ? age : max;
  }, 0);
}
