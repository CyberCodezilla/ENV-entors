/**
 * HeatFlood Guardian — Shared Constants
 * All thresholds configurable here; change once, applies everywhere.
 */

// ---------------------------------------------------------------------------
// Pilot zone bounding box [lng_min, lat_min, lng_max, lat_max]
// ---------------------------------------------------------------------------
export const PILOT_BBOX = [72.81, 19.09, 72.88, 19.15] as const;

// ---------------------------------------------------------------------------
// Risk score thresholds (0–100)
// ---------------------------------------------------------------------------
export const RISK_THRESHOLDS = {
  low: 30,        // 0–30 = low
  moderate: 60,   // 31–60 = moderate
  high: 85,       // 61–85 = high
  blocked: 86,    // 86–100 = blocked/critical
} as const;

// ---------------------------------------------------------------------------
// Confidence score thresholds (0–100)
// ---------------------------------------------------------------------------
export const CONFIDENCE_THRESHOLDS = {
  limited: 40,    // 0–40
  moderate: 70,   // 41–70
  good: 71,       // 71–100
} as const;

// ---------------------------------------------------------------------------
// Evidence TTL and stale windows
// ---------------------------------------------------------------------------
export const TTL_MINUTES = {
  weatherStale: 30,             // Weather older than this shows stale banner
  unverifiedReport: 120,        // Unverified reports expire after 2 h
  corroboratedReport: 240,      // Corroborated reports expire after 4 h
  recentRainWindow: 90,         // Retain rain-related flood concern for 90 min after rain stops
  segmentScoreCache: 5,         // Cache segment scores for 5 min max
} as const;

// ---------------------------------------------------------------------------
// Segment and matching parameters
// ---------------------------------------------------------------------------
export const SEGMENT_PARAMS = {
  maxSegmentLengthM: 200,       // Split route into ~200 m segments
  hazardMatchRadiusM: 200,      // Haversine radius for incident-to-segment matching
  hotspotMatchRadiusM: 350,     // Wider radius for static hotspot matching
  corroborationRadius: 150,     // Reports within 150 m of each other may corroborate
  corroborationWindowMinutes: 60, // Must be within 60 min of each other
} as const;

// ---------------------------------------------------------------------------
// Risk score weights
// ---------------------------------------------------------------------------
export const FLOOD_SCORE_WEIGHTS = {
  rainSignal: 0.30,       // Recent + forecast precipitation band
  hotspotPrior: 0.15,     // Static flood-prone zone overlap
  sensorSignal: 0.25,     // Trusted sensor reading (not yet integrated)
  reportSignal: 0.30,     // Incident reports (adjusted for freshness/verification)
} as const;

export const HEAT_SCORE_WEIGHTS = {
  apparentTempBand: 0.45,
  walkingDuration: 0.30,
  departureHour: 0.15,
  userSensitivity: 0.10,
} as const;

// ---------------------------------------------------------------------------
// Confidence score weights (sum to 1)
// ---------------------------------------------------------------------------
export const CONFIDENCE_WEIGHTS = {
  freshness: 0.30,
  sourceReliability: 0.25,
  spatialRelevance: 0.25,
  corroboration: 0.20,
} as const;

// ---------------------------------------------------------------------------
// Report decay (time-based weight reduction for unverified reports)
// ---------------------------------------------------------------------------
export const REPORT_DECAY = {
  halfLifeMinutes: 45,    // Report influence halves every 45 minutes
  minimumWeight: 0.1,     // Floor weight so old reports still register
} as const;

// ---------------------------------------------------------------------------
// Hard-block sources
// ---------------------------------------------------------------------------
export const HARD_BLOCK_SOURCES = [
  'official_closure',
  'trusted_sensor',
] as const;

export const HARD_BLOCK_TYPES = [
  'road_blocked',
  'electrical_hazard',
  'underpass_flooded',
] as const;

// ---------------------------------------------------------------------------
// Precipitation bands (mm/hour) → flood susceptibility
// ---------------------------------------------------------------------------
export const RAINFALL_BANDS = [
  { maxMm: 2.5,  label: 'negligible', floodContribution: 5  },
  { maxMm: 7.5,  label: 'light',      floodContribution: 20 },
  { maxMm: 15,   label: 'moderate',   floodContribution: 45 },
  { maxMm: 30,   label: 'heavy',      floodContribution: 65 },
  { maxMm: 60,   label: 'very_heavy', floodContribution: 80 },
  { maxMm: Infinity, label: 'extreme', floodContribution: 95 },
] as const;

// ---------------------------------------------------------------------------
// Apparent temperature bands → heat concern
// ---------------------------------------------------------------------------
export const HEAT_BANDS = [
  { maxC: 28,   label: 'comfortable', heatContribution: 5  },
  { maxC: 32,   label: 'warm',        heatContribution: 25 },
  { maxC: 36,   label: 'hot',         heatContribution: 50 },
  { maxC: 40,   label: 'very_hot',    heatContribution: 75 },
  { maxC: Infinity, label: 'extreme', heatContribution: 95 },
] as const;

// ---------------------------------------------------------------------------
// Disclaimer (required on every route result)
// ---------------------------------------------------------------------------
export const ROUTE_DISCLAIMER =
  'This recommendation is based on available evidence and may not reflect current road conditions. Never enter floodwater. Check official guidance before travel.';

// ---------------------------------------------------------------------------
// ML
// ---------------------------------------------------------------------------
export const ML_FEATURE_VERSION = process.env.ML_FEATURE_VERSION ?? 'flood-susceptibility-v2';
export const ML_TIMEOUT_MS = 800;
export const SAGEMAKER_ENABLED = process.env.SAGEMAKER_ENABLED === 'true';
