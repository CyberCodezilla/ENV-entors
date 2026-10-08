/**
 * Confidence Scoring Engine — Day 2
 *
 * Answers: "How much should we trust this risk assessment?"
 * Low confidence does NOT mean low risk — communicate this in the UI.
 */
import {
  CONFIDENCE_WEIGHTS,
  CONFIDENCE_THRESHOLDS,
  TTL_MINUTES,
  ConfidenceLevelSchema,
} from '@heatflood/shared';
import type { z } from 'zod';

export type ConfidenceLevel = z.infer<typeof ConfidenceLevelSchema>;

export interface ConfidenceInput {
  weatherAgeMinutes: number | null;
  incidentCount: number;
  verifiedIncidentCount: number;
  oldestIncidentAgeMinutes: number | null;
  hotspotDataAvailable: boolean;
  conflictingReports: boolean; // two reports within radius but contradicting severity
  mlAvailable: boolean;
}

export interface ConfidenceOutput {
  score: number;          // 0–100
  level: ConfidenceLevel;
  isStaleWeather: boolean;
  reasons: string[];
}

function freshnessScore(weatherAgeMinutes: number | null, oldestIncidentAgeMinutes: number | null): number {
  let score = 100;
  if (weatherAgeMinutes === null) {
    score -= 40; // No weather data at all
  } else if (weatherAgeMinutes > TTL_MINUTES.weatherStale) {
    score -= 30;
  }
  if (oldestIncidentAgeMinutes !== null && oldestIncidentAgeMinutes > 90) {
    score -= 20;
  }
  return Math.max(0, score);
}

function sourceReliabilityScore(verifiedCount: number, totalCount: number): number {
  if (totalCount === 0) return 50; // No reports — baseline
  const verifiedRatio = verifiedCount / totalCount;
  return Math.round(30 + verifiedRatio * 70);
}

function spatialScore(hotspotAvailable: boolean): number {
  return hotspotAvailable ? 90 : 50;
}

function corroborationScore(incidentCount: number, conflicting: boolean): number {
  if (conflicting) return 20;
  if (incidentCount >= 3) return 100;
  if (incidentCount === 2) return 75;
  if (incidentCount === 1) return 50;
  return 60; // No reports = uncertain but not low
}

function levelFromScore(score: number): ConfidenceLevel {
  if (score <= CONFIDENCE_THRESHOLDS.limited) return 'limited';
  if (score <= CONFIDENCE_THRESHOLDS.moderate) return 'moderate';
  return 'good';
}

export function calculateConfidence(input: ConfidenceInput): ConfidenceOutput {
  const {
    weatherAgeMinutes,
    incidentCount,
    verifiedIncidentCount,
    oldestIncidentAgeMinutes,
    hotspotDataAvailable,
    conflictingReports,
  } = input;

  const isStaleWeather = weatherAgeMinutes !== null && weatherAgeMinutes > TTL_MINUTES.weatherStale;

  const fScore = freshnessScore(weatherAgeMinutes, oldestIncidentAgeMinutes);
  const sScore = sourceReliabilityScore(verifiedIncidentCount, incidentCount);
  const spScore = spatialScore(hotspotDataAvailable);
  const cScore = corroborationScore(incidentCount, conflictingReports);

  const score = Math.min(
    100,
    Math.round(
      fScore * CONFIDENCE_WEIGHTS.freshness +
      sScore * CONFIDENCE_WEIGHTS.sourceReliability +
      spScore * CONFIDENCE_WEIGHTS.spatialRelevance +
      cScore * CONFIDENCE_WEIGHTS.corroboration,
    ),
  );

  const reasons: string[] = [];
  if (isStaleWeather) reasons.push(`Weather data is ${weatherAgeMinutes} min old (threshold: ${TTL_MINUTES.weatherStale} min)`);
  if (weatherAgeMinutes === null) reasons.push('No weather data available — confidence limited');
  if (conflictingReports) reasons.push('Conflicting community reports reduce confidence');
  if (incidentCount === 0) reasons.push('No community reports in this area — assessment based on weather and historical data only');
  if (verifiedIncidentCount > 0) reasons.push(`${verifiedIncidentCount} verified report(s) increase confidence`);

  return { score, level: levelFromScore(score), isStaleWeather, reasons };
}
