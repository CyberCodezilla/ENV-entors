/**
 * Heat Risk Engine — Day 2
 * Scores heat exposure for a route segment based on weather + travel context.
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

function tempContribution(apparentTempC: number | null): number {
  if (apparentTempC === null) return 0;
  const band = HEAT_BANDS.find(b => apparentTempC <= b.maxC);
  return band?.heatContribution ?? 95;
}

function departureHourContribution(arrivalUtc: Date): number {
  // Convert UTC to IST (UTC+5:30)
  const istHour = (arrivalUtc.getUTCHours() + 5 + Math.floor((arrivalUtc.getUTCMinutes() + 30) / 60)) % 24;
  // Peak heat: 11–16 IST
  if (istHour >= 11 && istHour <= 16) return 100;
  if (istHour >= 10 || istHour <= 17) return 60;
  if (istHour >= 9 || istHour <= 18) return 30;
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

  const tempScore = tempContribution(apparentTemperatureC);
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
    const band = HEAT_BANDS.find(b => apparentTemperatureC <= b.maxC);
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
