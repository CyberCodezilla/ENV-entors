/**
 * Route Ranker
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
 *
 * Perf notes (optimised):
 *   - Single O(n) pass over segments for all rollup values
 *   - Sort operates on a shallow copy so RouteResult.segments is never mutated
 *   - topReasons deduplication uses a Set built once, no double-slice
 */
import {
  RouteResult,
  SegmentAssessment,
  ROUTE_DISCLAIMER,
  RISK_THRESHOLDS,
  CONFIDENCE_THRESHOLDS,
  RiskLevelSchema,
  ConfidenceLevelSchema,
  scoreToLevel,
  confidenceLevelFromScore,
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

/** Distance-weighted average — O(n), single pass. */
function weightedAverage(values: number[], weights: number[]): number {
  let totalWeight = 0;
  let sum = 0;
  for (let i = 0; i < values.length; i++) {
    totalWeight += weights[i];
    sum += values[i] * weights[i];
  }
  return totalWeight === 0 ? 0 : Math.round(sum / totalWeight);
}

export function rankRoutes(rawRoutes: RawRoute[]): {
  routes: RouteResult[];
  hasConfidentRecommendation: boolean;
  noConfidentRouteReason: string | null;
} {
  const evaluated = rawRoutes.map((raw) => {
    const segs = raw.segments;
    const n = segs.length;

    // --- Single O(n) pass for all rollup values ---
    let maxFloodRisk = 0;
    let minConfidence = Infinity;
    let anyHardBlock = false;
    let hardBlockSeg: SegmentAssessment | undefined;
    const floodRisks: number[] = new Array(n);
    const heatRisks: number[] = new Array(n);
    const segWeights: number[] = new Array(n);

    for (let i = 0; i < n; i++) {
      const s = segs[i];
      const w = s.segmentLengthM ?? 0;

      floodRisks[i] = s.floodRisk;
      heatRisks[i] = s.heatRisk;
      segWeights[i] = w;

      if (s.floodRisk > maxFloodRisk) maxFloodRisk = s.floodRisk;
      if (s.confidence < minConfidence) minConfidence = s.confidence;
      if (s.hardBlock && !anyHardBlock) {
        anyHardBlock = true;
        hardBlockSeg = s;
      }
    }
    if (minConfidence === Infinity) minConfidence = 0;

    const weightedFlood = weightedAverage(floodRisks, segWeights);
    const weightedHeat = weightedAverage(heatRisks, segWeights);

    // topReasons: sort a COPY so segs order is preserved in RouteResult
    const segsCopy = segs.slice().sort((a, b) => b.floodRisk - a.floodRisk);
    const seen = new Set<string>();
    const topReasons: string[] = [];
    for (const s of segsCopy) {
      for (const r of s.reasons) {
        if (!r.startsWith('No elevated') && !seen.has(r)) {
          seen.add(r);
          topReasons.push(r);
          if (topReasons.length === 3) break;
        }
      }
      if (topReasons.length === 3) break;
    }

    const result: RouteResult = {
      routeId: raw.routeId,
      rank: 0,
      distanceM: raw.distanceM,
      durationSec: raw.durationSec,
      geometry: raw.geometry,
      segments: segs,           // original order preserved

      maxFloodRisk,
      weightedFloodExposure: weightedFlood,
      weightedHeatExposure: weightedHeat,
      overallFloodLevel: scoreToLevel(maxFloodRisk),
      overallHeatLevel: scoreToLevel(weightedHeat),
      overallConfidenceLevel: confidenceLevelFromScore(minConfidence),

      isHardBlocked: anyHardBlock,
      blockReason: hardBlockSeg?.hardBlockReason ?? null,

      topReasons: topReasons.length > 0
        ? topReasons
        : ['No elevated risk signals detected from available data'],
      disclaimer: ROUTE_DISCLAIMER,
    };

    return result;
  });

  const viableRoutes = evaluated.filter(r => !r.isHardBlocked);
  const blockedRoutes = evaluated.filter(r => r.isHardBlocked);

  // Sort viable routes: lowest max flood risk -> lowest weighted flood exposure -> lowest weighted heat exposure -> lowest duration
  viableRoutes.sort((a, b) => {
    if (a.maxFloodRisk !== b.maxFloodRisk) return a.maxFloodRisk - b.maxFloodRisk;
    if (a.weightedFloodExposure !== b.weightedFloodExposure) return a.weightedFloodExposure - b.weightedFloodExposure;
    if (a.weightedHeatExposure !== b.weightedHeatExposure) return a.weightedHeatExposure - b.weightedHeatExposure;
    return a.durationSec - b.durationSec;
  });

  // Sort blocked routes consistently by flood risk then duration
  blockedRoutes.sort((a, b) => {
    if (a.maxFloodRisk !== b.maxFloodRisk) return a.maxFloodRisk - b.maxFloodRisk;
    return a.durationSec - b.durationSec;
  });

  viableRoutes.forEach((r, i) => { r.rank = i + 1; });
  blockedRoutes.forEach((r, i) => { r.rank = viableRoutes.length + i + 1; });

  const allRoutes = [...viableRoutes, ...blockedRoutes];

  const confidentViableRoutes = viableRoutes.filter(r => r.overallConfidenceLevel !== 'limited');
  const hasConfidentRecommendation = confidentViableRoutes.length > 0;
  const noConfidentRouteReason = !hasConfidentRecommendation
    ? 'All available pedestrian/road routes intersect active hazard evidence or have limited confidence. Fallback recommendation: Seek elevated transit corridors (e.g., Mumbai Metro Line 1 / Line 2A elevated corridors across Andheri/Versova) or proceed to designated emergency high-ground rally points.'
    : null;

  return { routes: allRoutes, hasConfidentRecommendation, noConfidentRouteReason };
}
