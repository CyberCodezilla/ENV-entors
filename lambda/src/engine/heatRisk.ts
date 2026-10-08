/**
 * Heat Risk Engine
 * Scores heat exposure for a route segment based on weather + travel context.
 *
 * Perf/fix notes (optimised):
 *   - departureHourContribution: fixed || → && in range guards (was always-true,
 *     dead-coding the baseline return 10 branch)
 *   - HEAT_BANDS.find() called once per calculateHeatRisk; label threaded
 *     through so the reasons block doesn’t repeat the O(n) scan
 */
import {
  HEAT_SCORE_WEIGHTS,
  HEAT_BANDS,
  RISK_THRESHOLDS,
  RiskLevelSchema,
} from '@heatflood/shared';
import type { z } from 'zod';

export type RiskLevel = z.infer<typeof RiskLevelSchema>;

export interface HeatRiskInput {
  apparentTemperatureC: number | null;
  relativeHumidityPct: number | null;
  estimatedArrivalUtc: Date;
  segmentWalkDurationSec: number;
  heatSensitive: boolean;
  mode: 'walking' | 'driving-traffic';
}

export interface HeatRiskOutput {
  score: number;      // 0–100
  level: RiskLevel;
  reasons: string[];
}

type HeatBand = typeof HEAT_BANDS[number];

/**
 * Returns both the numeric contribution and the matched band so callers
 * don’t need to repeat the find() for label extraction.
 */
function tempContributionWithBand(
  apparentTempC: number | null,
): { contribution: number; band: HeatBand | undefined } {
  if (apparentTempC === null) return { contribution: 0, band: undefined };
  const band = HEAT_BANDS.find(b => apparentTempC <= b.maxC);
  return { contribution: band?.heatContribution ?? 95, band };
}

function departureHourContribution(arrivalUtc: Date): number {
  // Convert UTC to IST (UTC+5:30)
  const totalMinutesUtc = arrivalUtc.getUTCHours() * 60 + arrivalUtc.getUTCMinutes();
  const istMinutes = totalMinutesUtc + 330; // +5h30m
  const istHour = Math.floor((istMinutes % 1440) / 60); // wrap at 24h

  // Peak heat window: 11–16 IST
  if (istHour >= 11 && istHour <= 16) return 100;
  // Warm shoulder: 10–17 IST (&&, not ||)
  if (istHour >= 10 && istHour <= 17) return 60;
  // Early/late: 9–18 IST (&&, not ||)
  if (istHour >= 9 && istHour <= 18) return 30;
  return 10;
}

function walkDurationContribution(durationSec: number, mode: string): number {
  if (mode !== 'walking') return 0;
  const minutes = durationSec / 60;
  if (minutes <= 5) return 10;
  if (minutes <= 15) return 30;
  if (minutes <= 30) return 60;
  return 85;
}

function scoreToLevel(score: number): RiskLevel {
  if (score <= RISK_THRESHOLDS.low) return 'low';
  if (score <= RISK_THRESHOLDS.moderate) return 'moderate';
  if (score <= RISK_THRESHOLDS.high) return 'high';
  return 'blocked';
}

export function calculateHeatRisk(input: HeatRiskInput): HeatRiskOutput {
  const { apparentTemperatureC, estimatedArrivalUtc, segmentWalkDurationSec, heatSensitive, mode } = input;

  // Single HEAT_BANDS.find() — contribution + label in one pass
  const { contribution: tempScore, band } = tempContributionWithBand(apparentTemperatureC);
  const hourScore = departureHourContribution(estimatedArrivalUtc);
  const walkScore = walkDurationContribution(segmentWalkDurationSec, mode);
  const sensitivityMultiplier = heatSensitive ? 1.15 : 1.0;

  const baseScore =
    tempScore * HEAT_SCORE_WEIGHTS.apparentTempBand +
    walkScore * HEAT_SCORE_WEIGHTS.walkingDuration +
    hourScore * HEAT_SCORE_WEIGHTS.departureHour +
    (heatSensitive ? 100 : 0) * HEAT_SCORE_WEIGHTS.userSensitivity;

  const score = Math.min(100, Math.round(baseScore * sensitivityMultiplier));

  const reasons: string[] = [];
  if (apparentTemperatureC === null) {
    reasons.push('Apparent temperature unavailable — heat risk estimated from time of day only');
  } else {
    // Reuse band found above — no second find()
    reasons.push(`Apparent temperature ${apparentTemperatureC.toFixed(1)} °C (${band?.label ?? 'unknown'} band)`);
  }
  if (mode === 'walking' && segmentWalkDurationSec > 900) {
    reasons.push(`Extended walking exposure (${Math.round(segmentWalkDurationSec / 60)} min)`);
  }
  if (heatSensitive) {
    reasons.push('Heat-sensitive travel mode selected — conservative scoring applied');
  }

  return { score, level: scoreToLevel(score), reasons };
}
