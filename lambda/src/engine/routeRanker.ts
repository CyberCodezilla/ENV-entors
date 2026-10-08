/**
 * Route Ranker — Day 2
 *
 * Applies per-segment risk scores, rolls up to route level,
 * eliminates hard-blocked routes, and ranks survivors.
 *
 * Ranking priority:
 *   1. Hard-blocked routes are excluded entirely
 *   2. Max segment flood risk (worst-case approach)
 *   3. Weighted flood exposure across all segments
 *   4. Weighted heat exposure (secondary)
 *   5. ETA (final tiebreaker only)
 */
import {
  RouteResult,
  SegmentAssessment,
  ROUTE_DISCLAIMER,
  RISK_THRESHOLDS,
  CONFIDENCE_THRESHOLDS,
  RiskLevelSchema,
  ConfidenceLevelSchema,
} from '@heatflood/shared';
import type { z } from 'zod';

type RiskLevel = z.infer<typeof RiskLevelSchema>;
type ConfidenceLevel = z.infer<typeof ConfidenceLevelSchema>;

export interface RawRoute {
  routeId: string;
  distanceM: number;
  durationSec: number;
  geometry: { type: 'LineString'; coordinates: [number, number][] };
  segments: SegmentAssessment[];
}

function riskLevelFromScore(score: number): RiskLevel {
  if (score <= RISK_THRESHOLDS.low) return 'low';
  if (score <= RISK_THRESHOLDS.moderate) return 'moderate';
  if (score <= RISK_THRESHOLDS.high) return 'high';
  return 'blocked';
}

function confidenceLevelFromScore(score: number): ConfidenceLevel {
  if (score <= CONFIDENCE_THRESHOLDS.limited) return 'limited';
  if (score <= CONFIDENCE_THRESHOLDS.moderate) return 'moderate';
  return 'good';
}

function weightedAverage(values: number[], weights: number[]): number {
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  if (totalWeight === 0) return 0;
  const sum = values.reduce((acc, v, i) => acc + v * weights[i], 0);
  return Math.round(sum / totalWeight);
}

export function rankRoutes(rawRoutes: RawRoute[]): {
  routes: RouteResult[];
  hasConfidentRecommendation: boolean;
  noConfidentRouteReason: string | null;
} {
  // 1. Roll up segment scores to route level
  const evaluated = rawRoutes.map((raw) => {
    const segs = raw.segments;

    const anyHardBlock = segs.some(s => s.hardBlock);
    const hardBlockSeg = segs.find(s => s.hardBlock);

    const maxFloodRisk = Math.max(...segs.map(s => s.floodRisk));
    const segLengths = segs.map(s => {
      const [lon1, lat1] = s.startCoord as unknown as [number, number];
      const [lon2, lat2] = s.endCoord as unknown as [number, number];
      return Math.sqrt((lon2 - lon1) ** 2 + (lat2 - lat1) ** 2); // planar approx for weights
    });

    const weightedFlood = weightedAverage(segs.map(s => s.floodRisk), segLengths);
    const weightedHeat = weightedAverage(segs.map(s => s.heatRisk), segLengths);
    const minConfidence = Math.min(...segs.map(s => s.confidence));

    const topReasons = [
      ...new Set(
        segs
          .sort((a, b) => b.floodRisk - a.floodRisk)
          .flatMap(s => s.reasons)
          .filter(r => !r.startsWith('No elevated'))
          .slice(0, 3),
      ),
    ].slice(0, 3);

    const result: RouteResult = {
      routeId: raw.routeId,
      rank: 0, // assigned below
      distanceM: raw.distanceM,
      durationSec: raw.durationSec,
      geometry: raw.geometry,
      segments: segs,

      maxFloodRisk,
      weightedFloodExposure: weightedFlood,
      weightedHeatExposure: weightedHeat,
      overallFloodLevel: riskLevelFromScore(maxFloodRisk),
      overallHeatLevel: riskLevelFromScore(weightedHeat),
      overallConfidenceLevel: confidenceLevelFromScore(minConfidence),

      isHardBlocked: anyHardBlock,
      blockReason: hardBlockSeg?.hardBlockReason ?? null,

      topReasons: topReasons.length > 0 ? topReasons : ['No elevated risk signals detected from available data'],
      disclaimer: ROUTE_DISCLAIMER,
    };

    return result;
  });

  // 2. Separate blocked from viable routes
  const viableRoutes = evaluated.filter(r => !r.isHardBlocked);
  const blockedRoutes = evaluated.filter(r => r.isHardBlocked);

  // 3. Sort viable routes
  viableRoutes.sort((a, b) => {
    if (a.maxFloodRisk !== b.maxFloodRisk) return a.maxFloodRisk - b.maxFloodRisk;
    if (a.weightedFloodExposure !== b.weightedFloodExposure) return a.weightedFloodExposure - b.weightedFloodExposure;
    if (a.weightedHeatExposure !== b.weightedHeatExposure) return a.weightedHeatExposure - b.weightedHeatExposure;
    return a.durationSec - b.durationSec;
  });

  // 4. Assign ranks
  viableRoutes.forEach((r, i) => { r.rank = i + 1; });
  blockedRoutes.forEach((r, i) => { r.rank = viableRoutes.length + i + 1; });

  const allRoutes = [...viableRoutes, ...blockedRoutes];

  const hasConfidentRecommendation = viableRoutes.length > 0;
  const noConfidentRouteReason = !hasConfidentRecommendation
    ? 'All available routes intersect active hazard evidence. Delay travel or check official guidance before proceeding.'
    : null;

  return { routes: allRoutes, hasConfidentRecommendation, noConfidentRouteReason };
}
