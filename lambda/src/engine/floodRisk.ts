/**
 * Flood Risk Engine — Day 2
 * Deterministic, rule-based segment flood scoring (0-100).
 * ML signal is additive overlay only (Day 5).
 */
import {
  FLOOD_SCORE_WEIGHTS,
  RAINFALL_BANDS,
  SEGMENT_PARAMS,
  REPORT_DECAY,
  HARD_BLOCK_SOURCES,
  HARD_BLOCK_TYPES,
  TTL_MINUTES,
  RiskLevelSchema,
  RISK_THRESHOLDS,
  EvidenceItem,
  IncidentTypeSchema,
} from '@heatflood/shared';
import type { z } from 'zod';

export type RiskLevel = z.infer<typeof RiskLevelSchema>;

export interface ActiveIncident {
  incidentId: string;
  latitude: number;
  longitude: number;
  type: z.infer<typeof IncidentTypeSchema>;
  depthCategory: string;
  status: string;
  sourceType: string;
  observedAt: string;
  isDemo: boolean;
}

export interface FloodHotspot {
  hotspotId: string;
  lat: number;
  lon: number;
  radiusM: number;
}

export interface FloodRiskInput {
  segmentId: string;
  precipitationMmPerHour: number | null;
  minutesSinceRainStop: number | null; // null if still raining or never rained
  incidents: ActiveIncident[];
  hotspotDistanceM: number | null;
  hotspotOverlap: boolean;
  now: Date;
}

export interface FloodRiskOutput {
  score: number;        // 0–100
  level: RiskLevel;
  hardBlock: boolean;
  hardBlockReason: string | null;
  evidence: EvidenceItem[];
  reasons: string[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function rainContribution(mmPerHour: number | null, minutesSinceStop: number | null): number {
  // Still raining
  if (mmPerHour !== null && mmPerHour > 0) {
    const band = RAINFALL_BANDS.find(b => mmPerHour <= b.maxMm);
    return band?.floodContribution ?? 95;
  }
  // Rain stopped recently — retain partial concern
  if (minutesSinceStop !== null && minutesSinceStop <= TTL_MINUTES.recentRainWindow) {
    const decay = 1 - minutesSinceStop / TTL_MINUTES.recentRainWindow;
    return Math.round(40 * decay); // up to 40 points post-rain
  }
  return 0;
}

function reportContribution(incidents: ActiveIncident[], now: Date): {
  score: number;
  hardBlock: boolean;
  hardBlockReason: string | null;
  evidence: EvidenceItem[];
  reasons: string[];
} {
  let score = 0;
  let hardBlock = false;
  let hardBlockReason: string | null = null;
  const evidence: EvidenceItem[] = [];
  const reasons: string[] = [];

  for (const inc of incidents) {
    const isHardBlockSource = (HARD_BLOCK_SOURCES as readonly string[]).includes(inc.sourceType);
    const isHardBlockType = (HARD_BLOCK_TYPES as readonly string[]).includes(inc.type);
    const isVerified = inc.status === 'verified' || inc.status === 'corroborated';

    const observedMs = new Date(inc.observedAt).getTime();
    const ageMinutes = (now.getTime() - observedMs) / 60_000;

    // Hard block check
    if ((isHardBlockSource || isHardBlockType) && isVerified) {
      hardBlock = true;
      hardBlockReason = `Verified ${inc.type.replace('_', ' ')} from ${inc.sourceType.replace(/_/g, ' ')}${inc.isDemo ? ' [DEMO]' : ''}`;
      score = 100;
      reasons.push(`HARD BLOCK: ${hardBlockReason}`);
      evidence.push({
        sourceType: inc.sourceType as EvidenceItem['sourceType'],
        description: `${inc.type} — ${inc.status}`,
        observedAt: inc.observedAt,
        fetchedAt: new Date().toISOString(),
        distanceM: null,
        verificationStatus: inc.status as EvidenceItem['verificationStatus'],
        isVerified: true,
        isDemo: inc.isDemo,
      });
      continue;
    }

    // Time-decayed report contribution
    const halfLife = REPORT_DECAY.halfLifeMinutes;
    const decayFactor = Math.max(
      REPORT_DECAY.minimumWeight,
      Math.pow(0.5, ageMinutes / halfLife),
    );

    let baseScore = 0;
    if (isVerified) baseScore = 70;
    else if (inc.status === 'pending') baseScore = 35;

    // Depth bonus
    if (inc.depthCategory === 'knee') baseScore = Math.min(100, baseScore + 15);
    if (inc.depthCategory === 'vehicle_impassable') baseScore = Math.min(100, baseScore + 25);

    const contribution = Math.round(baseScore * decayFactor);
    score = Math.min(100, score + contribution);

    reasons.push(
      `${inc.status} ${inc.type.replace('_', ' ')} report (${Math.round(ageMinutes)} min ago, depth: ${inc.depthCategory})${inc.isDemo ? ' [DEMO]' : ''}`
    );
    evidence.push({
      sourceType: inc.sourceType as EvidenceItem['sourceType'],
      description: `${inc.type} — ${inc.status}`,
      observedAt: inc.observedAt,
      fetchedAt: new Date().toISOString(),
      distanceM: null,
      verificationStatus: inc.status as EvidenceItem['verificationStatus'],
      isVerified,
      isDemo: inc.isDemo,
    });
  }

  return { score, hardBlock, hardBlockReason, evidence, reasons };
}

function hotspotContribution(hotspotDistanceM: number | null, overlap: boolean): number {
  if (overlap) return 25;
  if (hotspotDistanceM === null) return 0;
  if (hotspotDistanceM <= SEGMENT_PARAMS.hotspotMatchRadiusM) {
    const proximity = 1 - hotspotDistanceM / SEGMENT_PARAMS.hotspotMatchRadiusM;
    return Math.round(15 * proximity);
  }
  return 0;
}

function scoreToLevel(score: number): RiskLevel {
  if (score <= RISK_THRESHOLDS.low) return 'low';
  if (score <= RISK_THRESHOLDS.moderate) return 'moderate';
  if (score <= RISK_THRESHOLDS.high) return 'high';
  return 'blocked';
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export function calculateFloodRisk(input: FloodRiskInput): FloodRiskOutput {
  const { precipitationMmPerHour, minutesSinceRainStop, incidents, hotspotDistanceM, hotspotOverlap, now } = input;

  const rainScore = rainContribution(precipitationMmPerHour, minutesSinceRainStop);
  const hotScore = hotspotContribution(hotspotDistanceM, hotspotOverlap);
  const reportResult = reportContribution(incidents, now);

  if (reportResult.hardBlock) {
    return {
      score: 100,
      level: 'blocked',
      hardBlock: true,
      hardBlockReason: reportResult.hardBlockReason,
      evidence: reportResult.evidence,
      reasons: reportResult.reasons,
    };
  }

  // Weighted combination
  const weightedScore = Math.min(
    100,
    Math.round(
      rainScore * FLOOD_SCORE_WEIGHTS.rainSignal +
      hotScore * (FLOOD_SCORE_WEIGHTS.hotspotPrior / 0.15) * 0.15 +
      reportResult.score * FLOOD_SCORE_WEIGHTS.reportSignal,
    ),
  );

  const reasons: string[] = [];
  if (rainScore > 0) reasons.push(`Precipitation signal: ${rainScore}/100`);
  if (hotScore > 0) reasons.push(`Proximity to flood-susceptible zone`);
  reasons.push(...reportResult.reasons);

  if (precipitationMmPerHour === null) {
    reasons.push('Weather data unavailable — flood susceptibility based on historical data only');
  }
  if (incidents.length === 0 && rainScore === 0 && hotScore === 0) {
    reasons.push('No elevated flood signals detected from available data');
  }

  return {
    score: weightedScore,
    level: scoreToLevel(weightedScore),
    hardBlock: false,
    hardBlockReason: null,
    evidence: reportResult.evidence,
    reasons,
  };
}
