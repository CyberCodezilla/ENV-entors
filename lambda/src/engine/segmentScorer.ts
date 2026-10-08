/**
 * Segment Scorer
 *
 * Orchestrates flood + heat + confidence scoring for a single segment.
 * Called by the route analyser for every segment of every candidate route.
 *
 * Perf notes (optimised):
 *   - arrivalDate constructed once (was 3x — hour/day/month extraction)
 *   - verifiedIncidents filtered once, reused for confidence + ML features
 *   - ML await skipped entirely when provider is DisabledMlRiskProvider
 *     (avoids Promise.race + setTimeout overhead per segment)
 */
import {
  SegmentAssessment,
  SEGMENT_PARAMS,
  haversineDistanceM,
  encodeGeohash,
  ML_FEATURE_VERSION,
  ML_TIMEOUT_MS,
} from '@heatflood/shared';
import { calculateFloodRisk, ActiveIncident, FloodHotspot } from './floodRisk';
import { calculateHeatRisk } from './heatRisk';
import { calculateConfidence } from './confidence';
import { DisabledMlRiskProvider, MlRiskProvider } from '@heatflood/shared';

export interface SegmentInput {
  segmentIndex: number;
  startCoord: { lat: number; lon: number };
  endCoord: { lat: number; lon: number };
  estimatedArrivalUtc: Date;
  segmentLengthM: number;

  // Weather
  precipitationMmPerHour: number | null;
  minutesSinceRainStop: number | null;
  apparentTemperatureC: number | null;
  relativeHumidityPct: number | null;
  weatherAgeMinutes: number | null;

  // Community data
  nearbyIncidents: ActiveIncident[];
  nearbyHotspots: FloodHotspot[];

  // Context
  heatSensitive: boolean;
  mode: 'walking' | 'driving-traffic';
  now: Date;

  // ML (optional)
  mlProvider?: MlRiskProvider;
}

const DEFAULT_ML = new DisabledMlRiskProvider();

export async function scoreSegment(input: SegmentInput): Promise<SegmentAssessment> {
  const midLat = (input.startCoord.lat + input.endCoord.lat) / 2;
  const midLon = (input.startCoord.lon + input.endCoord.lon) / 2;

  // Hotspot nearest distance — O(h)
  let hotspotDistanceM: number | null = null;
  let hotspotOverlap = false;
  for (const hs of input.nearbyHotspots) {
    const d = haversineDistanceM(midLat, midLon, hs.lat, hs.lon);
    if (d <= hs.radiusM) hotspotOverlap = true;
    if (hotspotDistanceM === null || d < hotspotDistanceM) hotspotDistanceM = d;
  }

  // Cache verified incidents — used by both confidence and ML features
  const verifiedIncidents = input.nearbyIncidents.filter(i => i.status === 'verified');

  // Hoist arrival Date — reused for hour/day/month extraction
  const arrivalDate = input.estimatedArrivalUtc;

  // --- Flood risk ---
  const flood = calculateFloodRisk({
    segmentId: `seg-${input.segmentIndex}`,
    precipitationMmPerHour: input.precipitationMmPerHour,
    minutesSinceRainStop: input.minutesSinceRainStop,
    incidents: input.nearbyIncidents,
    hotspotDistanceM,
    hotspotOverlap,
    now: input.now,
  });

  // --- Heat risk ---
  const heat = calculateHeatRisk({
    apparentTemperatureC: input.apparentTemperatureC,
    relativeHumidityPct: input.relativeHumidityPct,
    estimatedArrivalUtc: arrivalDate,
    segmentWalkDurationSec: (input.segmentLengthM / 1.2),
    heatSensitive: input.heatSensitive,
    mode: input.mode,
  });

  // Oldest incident age — single reduce, no spread
  const oldestIncidentAgeMinutes = input.nearbyIncidents.length > 0
    ? input.nearbyIncidents.reduce((max, i) => {
        const age = (input.now.getTime() - new Date(i.observedAt).getTime()) / 60_000;
        return age > max ? age : max;
      }, 0)
    : null;

  // Newest incident age for ML — single reduce, no spread
  const newestIncidentAgeMin = input.nearbyIncidents.length > 0
    ? input.nearbyIncidents.reduce((min, i) => {
        const age = (input.now.getTime() - new Date(i.observedAt).getTime()) / 60_000;
        return age < min ? age : min;
      }, Infinity)
    : null;

  // --- Confidence ---
  const confidence = calculateConfidence({
    weatherAgeMinutes: input.weatherAgeMinutes,
    incidentCount: input.nearbyIncidents.length,
    verifiedIncidentCount: verifiedIncidents.length,
    oldestIncidentAgeMinutes,
    hotspotDataAvailable: input.nearbyHotspots.length > 0,
    conflictingReports: false,
    mlAvailable: false,
  });

  // --- ML signal ---
  // Skip the Promise.race + setTimeout entirely for DisabledMlRiskProvider
  // (saves ~0.1 ms per segment × N segments × M routes)
  const mlProvider = input.mlProvider ?? DEFAULT_ML;
  const isDisabled = mlProvider instanceof DisabledMlRiskProvider;

  let mlSignal;
  if (isDisabled) {
    mlSignal = {
      available: false as const,
      featureVersion: ML_FEATURE_VERSION,
      reasonUnavailable: 'disabled' as const,
    };
  } else {
    try {
      mlSignal = await Promise.race([
        mlProvider.predict({
          featureVersion: ML_FEATURE_VERSION,
          predictionTimeUtc: arrivalDate.toISOString(),
          segmentId: `seg-${input.segmentIndex}`,
          rainfall_recent_1h_mm: input.precipitationMmPerHour,
          rainfall_recent_3h_mm: null,
          rainfall_forecast_1h_mm: null,
          relative_humidity_pct: input.relativeHumidityPct,
          apparent_temperature_c: input.apparentTemperatureC,
          hotspot_distance_m: hotspotDistanceM,
          hotspot_overlap: hotspotOverlap ? 1 : 0,
          recent_report_count: input.nearbyIncidents.length,
          verified_report_count: verifiedIncidents.length,
          newest_report_age_min: newestIncidentAgeMin,
          hour_of_day: arrivalDate.getUTCHours(),
          day_of_week: arrivalDate.getUTCDay(),
          month: arrivalDate.getUTCMonth() + 1,
          location_geohash5: encodeGeohash(midLat, midLon, 5),
        }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('ML timeout')), ML_TIMEOUT_MS)
        ),
      ]);
    } catch {
      mlSignal = {
        available: false as const,
        featureVersion: ML_FEATURE_VERSION,
        reasonUnavailable: 'timeout' as const,
      };
    }
  }

  return {
    segmentIndex: input.segmentIndex,
    startCoord: input.startCoord,
    endCoord: input.endCoord,
    estimatedArrivalUtc: arrivalDate.toISOString(),

    floodRisk: flood.score,
    heatRisk: heat.score,
    confidence: confidence.score,
    hardBlock: flood.hardBlock,
    hardBlockReason: flood.hardBlockReason,

    floodRiskLevel: flood.level,
    heatRiskLevel: heat.level,
    confidenceLevel: confidence.level,

    evidence: flood.evidence,
    reasons: [...flood.reasons, ...heat.reasons, ...confidence.reasons],

    mlSignal,
  };
}
