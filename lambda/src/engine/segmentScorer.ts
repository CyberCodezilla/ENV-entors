/**
 * Segment Scorer — Day 2
 *
 * Orchestrates flood + heat + confidence scoring for a single segment.
 * Called by the route analyser for every segment of every candidate route.
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

  // Hotspot nearest distance
  let hotspotDistanceM: number | null = null;
  let hotspotOverlap = false;
  for (const hs of input.nearbyHotspots) {
    const d = haversineDistanceM(midLat, midLon, hs.lat, hs.lon);
    if (d <= hs.radiusM) hotspotOverlap = true;
    if (hotspotDistanceM === null || d < hotspotDistanceM) hotspotDistanceM = d;
  }

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
    estimatedArrivalUtc: input.estimatedArrivalUtc,
    segmentWalkDurationSec: (input.segmentLengthM / 1.2), // ~1.2 m/s walking
    heatSensitive: input.heatSensitive,
    mode: input.mode,
  });

  // --- Confidence ---
  const confidence = calculateConfidence({
    weatherAgeMinutes: input.weatherAgeMinutes,
    incidentCount: input.nearbyIncidents.length,
    verifiedIncidentCount: input.nearbyIncidents.filter(i => i.status === 'verified').length,
    oldestIncidentAgeMinutes: input.nearbyIncidents.length > 0
      ? Math.max(...input.nearbyIncidents.map(i =>
          (input.now.getTime() - new Date(i.observedAt).getTime()) / 60_000
        ))
      : null,
    hotspotDataAvailable: input.nearbyHotspots.length > 0,
    conflictingReports: false, // Simplified: Day 3 can detect conflicts
    mlAvailable: false,
  });

  // --- ML signal (optional, non-blocking) ---
  const mlProvider = input.mlProvider ?? DEFAULT_ML;
  let mlSignal;
  try {
    const mlResult = await Promise.race([
      mlProvider.predict({
        featureVersion: ML_FEATURE_VERSION,
        predictionTimeUtc: input.estimatedArrivalUtc.toISOString(),
        segmentId: `seg-${input.segmentIndex}`,
        rainfall_recent_1h_mm: input.precipitationMmPerHour,
        rainfall_recent_3h_mm: null,
        rainfall_forecast_1h_mm: null,
        relative_humidity_pct: input.relativeHumidityPct,
        apparent_temperature_c: input.apparentTemperatureC,
        hotspot_distance_m: hotspotDistanceM,
        hotspot_overlap: hotspotOverlap ? 1 : 0,
        recent_report_count: input.nearbyIncidents.length,
        verified_report_count: input.nearbyIncidents.filter(i => i.status === 'verified').length,
        newest_report_age_min: input.nearbyIncidents.length > 0
          ? Math.min(...input.nearbyIncidents.map(i =>
              (input.now.getTime() - new Date(i.observedAt).getTime()) / 60_000
            ))
          : null,
        hour_of_day: new Date(input.estimatedArrivalUtc).getUTCHours(),
        day_of_week: new Date(input.estimatedArrivalUtc).getUTCDay(),
        month: new Date(input.estimatedArrivalUtc).getUTCMonth() + 1,
        location_geohash5: encodeGeohash(midLat, midLon, 5),
      }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('ML timeout')), ML_TIMEOUT_MS)
      ),
    ]);
    mlSignal = mlResult;
  } catch {
    mlSignal = {
      available: false,
      featureVersion: ML_FEATURE_VERSION,
      reasonUnavailable: 'timeout' as const,
    };
  }

  return {
    segmentIndex: input.segmentIndex,
    startCoord: input.startCoord,
    endCoord: input.endCoord,
    estimatedArrivalUtc: input.estimatedArrivalUtc.toISOString(),

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
