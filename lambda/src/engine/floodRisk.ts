/**
 * Flood Risk Engine
 * Deterministic, rule-based segment flood scoring (0-100).
 * ML signal is additive overlay only.
 *
 * Perf notes (optimised):
 *   - fetchedAt timestamp hoisted outside incident loop (was new Date() per incident)
 *   - type/sourceType display strings computed once per incident, not twice
 */
import {
  FLOOD_SCORE_WEIGHTS,
  RAINFALL_BANDS,
  SEGMENT_PARAMS,
  REPORT_DECAY,
  HARD_BLOCK_SOURCES,
  HARD_BLOCK_TYPES,
  TTL_MINUTES,
  scoreToLevel,
  RiskLevel,
  EvidenceItem,
  IncidentTypeSchema,
} from '@heatflood/shared';
import type { z } from 'zod';

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
  minutesSinceRainStop: number | null;
  incidents: ActiveIncident[];
  hotspotDistanceM: number | null;
  hotspotOverlap: boolean;
  now: Date;
}

export interface FloodRiskOutput {
  score: number;
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
  if (mmPerHour !== null && mmPerHour > 0) {
    const band = RAINFALL_BANDS.find(b => mmPerHour <= b.maxMm);
    return band?.floodContribution ?? 95;
  }
  if (minutesSinceStop !== null && minutesSinceStop <= TTL_MINUTES.recentRainWindow) {
    const decay = 1 - minutesSinceStop / TTL_MINUTES.recentRainWindow;
    return Math.round(40 * decay);
  }
  return 0;
}

function reportContribution(
  incidents: ActiveIncident[],
  now: Date,
): {
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

  // Hoist timestamp — same value for every incident in this call
  const fetchedAt = new Date().toISOString();
  const nowMs = now.getTime();
  const halfLife = REPORT_DECAY.halfLifeMinutes;

  for (const inc of incidents) {
    const isHardBlockSource = (HARD_BLOCK_SOURCES as readonly string[]).includes(inc.sourceType);
    const isHardBlockType = (HARD_BLOCK_TYPES as readonly string[]).includes(inc.type);
    const isModeratorVerified = inc.status === 'verified';
    const isVerified = inc.status === 'verified' || inc.status === 'corroborated';

    // Hoist display strings — each replace allocates a new string
    const typeDisplay = inc.type.replace(/_/g, ' ');
    const sourceDisplay = inc.sourceType.replace(/_/g, ' ');
    const demoTag = inc.isDemo ? ' [DEMO]' : '';

    const ageMinutes = (nowMs - new Date(inc.observedAt).getTime()) / 60_000;

    if (isHardBlockSource || (isHardBlockType && isModeratorVerified)) {
      hardBlock = true;
      hardBlockReason = `Verified ${typeDisplay} from ${sourceDisplay}${demoTag}`;
      score = 100;
      reasons.push(`HARD BLOCK: ${hardBlockReason}`);
      evidence.push({
        sourceType: inc.sourceType as EvidenceItem['sourceType'],
        description: `${inc.type} — ${inc.status}`,
        observedAt: inc.observedAt,
        fetchedAt,
        distanceM: null,
        verificationStatus: inc.status as EvidenceItem['verificationStatus'],
        isVerified: true,
        isDemo: inc.isDemo,
      });
      continue;
    }

    const decayFactor = Math.max(
      REPORT_DECAY.minimumWeight,
      Math.pow(0.5, ageMinutes / halfLife),
    );

    let baseScore = 0;
    if (isVerified) baseScore = 70;
    else if (inc.status === 'pending') baseScore = 35;

    if (inc.depthCategory === 'knee') baseScore = Math.min(100, baseScore + 15);
    if (inc.depthCategory === 'vehicle_impassable') baseScore = Math.min(100, baseScore + 25);

    const contribution = Math.round(baseScore * decayFactor);
    score = Math.min(100, score + contribution);

    reasons.push(
      `${inc.status} ${typeDisplay} report (${Math.round(ageMinutes)} min ago, depth: ${inc.depthCategory})${demoTag}`
    );
    evidence.push({
      sourceType: inc.sourceType as EvidenceItem['sourceType'],
      description: `${inc.type} — ${inc.status}`,
      observedAt: inc.observedAt,
      fetchedAt,
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

  const activeWeightSum =
    FLOOD_SCORE_WEIGHTS.rainSignal +
    FLOOD_SCORE_WEIGHTS.hotspotPrior +
    FLOOD_SCORE_WEIGHTS.reportSignal;

  const rawWeightedScore =
    rainScore * FLOOD_SCORE_WEIGHTS.rainSignal +
    hotScore * FLOOD_SCORE_WEIGHTS.hotspotPrior +
    reportResult.score * FLOOD_SCORE_WEIGHTS.reportSignal;

  const weightedScore = Math.min(
    100,
    Math.round(rawWeightedScore / activeWeightSum),
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
