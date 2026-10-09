export const PILOT_BBOX = [72.82, 19.1, 72.87, 19.145] as const;
export const RISK_THRESHOLDS = { low: 30, moderate: 60, high: 85, blocked: 86 } as const;
export const CONFIDENCE_THRESHOLDS = { limited: 40, moderate: 70, good: 71 } as const;
export const TTL_MINUTES = { weatherStale: 30, unverifiedReport: 120, corroboratedReport: 240, recentRainWindow: 90, segmentScoreCache: 5 } as const;
export const SEGMENT_PARAMS = { maxSegmentLengthM: 200, hazardMatchRadiusM: 200, hotspotMatchRadiusM: 350, corroborationRadius: 150, corroborationWindowMinutes: 60 } as const;
export const FLOOD_SCORE_WEIGHTS = { rainSignal: 0.30, hotspotPrior: 0.15, sensorSignal: 0.25, reportSignal: 0.30 } as const;
export const HEAT_SCORE_WEIGHTS = { apparentTempBand: 0.45, walkingDuration: 0.30, departureHour: 0.15, userSensitivity: 0.10 } as const;
export const CONFIDENCE_WEIGHTS = { freshness: 0.30, sourceReliability: 0.25, spatialRelevance: 0.25, corroboration: 0.20 } as const;
export const REPORT_DECAY = { halfLifeMinutes: 45, minimumWeight: 0.1 } as const;
export const HARD_BLOCK_SOURCES = ['official_closure', 'trusted_sensor'] as const;
export const HARD_BLOCK_TYPES = ['road_blocked', 'electrical_hazard', 'underpass_flooded'] as const;
export const RAINFALL_BANDS = [
  { maxMm: 2.5, label: 'negligible', floodContribution: 5 },
  { maxMm: 7.5, label: 'light', floodContribution: 20 },
  { maxMm: 15, label: 'moderate', floodContribution: 45 },
  { maxMm: 30, label: 'heavy', floodContribution: 65 },
  { maxMm: 60, label: 'very_heavy', floodContribution: 80 },
  { maxMm: Infinity, label: 'extreme', floodContribution: 95 },
] as const;
export const HEAT_BANDS = [
  { maxC: 28, label: 'comfortable', heatContribution: 5 },
  { maxC: 32, label: 'warm', heatContribution: 25 },
  { maxC: 36, label: 'hot', heatContribution: 50 },
  { maxC: 40, label: 'very_hot', heatContribution: 75 },
  { maxC: Infinity, label: 'extreme', heatContribution: 95 },
] as const;
export const ROUTE_DISCLAIMER = 'This recommendation is based on available evidence and may not reflect current road conditions. Never enter floodwater. Check official guidance before travel.';
export const ML_FEATURE_VERSION = 'rainfall-stress-v1' as const;
export const ML_TIMEOUT_MS = 800;
export const SAGEMAKER_ENABLED = process.env.SAGEMAKER_ENABLED === 'true';
