/**
 * HeatFlood Guardian — Shared Schemas
 * Single source of truth for all request/response shapes.
 * Validated with Zod at both API Gateway entry and frontend API client.
 */
import { z } from 'zod';

// ---------------------------------------------------------------------------
// Primitives
// ---------------------------------------------------------------------------

export const LatLonSchema = z.object({
  lat: z.number().min(-90).max(90),
  lon: z.number().min(-180).max(180),
});

export const TravelModeSchema = z.enum(['walking', 'driving-traffic']);

export const RiskLevelSchema = z.enum(['low', 'moderate', 'high', 'blocked']);

export const ConfidenceLevelSchema = z.enum(['limited', 'moderate', 'good']);

export const IncidentStatusSchema = z.enum([
  'pending',
  'corroborated',
  'verified',
  'rejected',
  'resolved',
  'expired',
]);

export const IncidentTypeSchema = z.enum([
  'waterlogging',
  'road_blocked',
  'electrical_hazard',
  'heat_exposure',
  'other',
]);

export const DepthCategorySchema = z.enum([
  'unknown',
  'ankle',
  'knee',
  'vehicle_impassable',
]);

export const SourceTypeSchema = z.enum([
  'official_closure',
  'trusted_sensor',
  'moderator_verified',
  'community_report',
  'historical_hotspot',
  'weather_derived',
]);

// ---------------------------------------------------------------------------
// Route analysis request
// ---------------------------------------------------------------------------

export const AnalyseRoutesRequestSchema = z.object({
  origin: LatLonSchema,
  destination: LatLonSchema,
  mode: TravelModeSchema,
  departureTime: z.string().datetime({ offset: true }),
  heatSensitive: z.boolean().optional().default(false),
  isReplay: z.boolean().optional().default(false),
  scenarioId: z.string().optional(),
});

export type AnalyseRoutesRequest = z.infer<typeof AnalyseRoutesRequestSchema>;

// ---------------------------------------------------------------------------
// Evidence item (on a segment)
// ---------------------------------------------------------------------------

export const EvidenceItemSchema = z.object({
  sourceType: SourceTypeSchema,
  description: z.string(),
  observedAt: z.string().datetime({ offset: true }).nullable(),
  fetchedAt: z.string().datetime({ offset: true }),
  distanceM: z.number().nullable(),
  verificationStatus: IncidentStatusSchema.nullable(),
  isVerified: z.boolean(),
  isDemo: z.boolean().default(false),
});

export type EvidenceItem = z.infer<typeof EvidenceItemSchema>;

// ---------------------------------------------------------------------------
// Segment assessment
// ---------------------------------------------------------------------------

export const SegmentAssessmentSchema = z.object({
  segmentIndex: z.number().int().min(0),
  startCoord: LatLonSchema,
  endCoord: LatLonSchema,
  estimatedArrivalUtc: z.string().datetime({ offset: true }),

  floodRisk: z.number().min(0).max(100),
  heatRisk: z.number().min(0).max(100),
  confidence: z.number().min(0).max(100),
  hardBlock: z.boolean(),
  hardBlockReason: z.string().nullable(),

  floodRiskLevel: RiskLevelSchema,
  heatRiskLevel: RiskLevelSchema,
  confidenceLevel: ConfidenceLevelSchema,

  evidence: z.array(EvidenceItemSchema),
  reasons: z.array(z.string()),

  mlSignal: z
    .object({
      available: z.boolean(),
      probability: z.number().min(0).max(1).optional(),
      modelVersion: z.string().optional(),
      featureVersion: z.string(),
      predictedAt: z.string().datetime({ offset: true }).optional(),
      reasonUnavailable: z
        .enum(['disabled', 'timeout', 'error', 'invalid', 'no_model'])
        .optional(),
    })
    .optional(),
});

export type SegmentAssessment = z.infer<typeof SegmentAssessmentSchema>;

// ---------------------------------------------------------------------------
// Route result
// ---------------------------------------------------------------------------

export const RouteResultSchema = z.object({
  routeId: z.string(),
  rank: z.number().int().min(1),
  distanceM: z.number(),
  durationSec: z.number(),
  geometry: z.object({
    type: z.literal('LineString'),
    coordinates: z.array(z.tuple([z.number(), z.number()])),
  }),
  segments: z.array(SegmentAssessmentSchema),

  maxFloodRisk: z.number().min(0).max(100),
  weightedFloodExposure: z.number().min(0).max(100),
  weightedHeatExposure: z.number().min(0).max(100),
  overallFloodLevel: RiskLevelSchema,
  overallHeatLevel: RiskLevelSchema,
  overallConfidenceLevel: ConfidenceLevelSchema,
  isHardBlocked: z.boolean(),
  blockReason: z.string().nullable(),

  topReasons: z.array(z.string()).max(3),
  disclaimer: z.string(),
});

export type RouteResult = z.infer<typeof RouteResultSchema>;

// ---------------------------------------------------------------------------
// Analyse routes response
// ---------------------------------------------------------------------------

export const AnalyseRoutesResponseSchema = z.object({
  requestId: z.string(),
  processedAt: z.string().datetime({ offset: true }),
  isReplay: z.boolean(),
  scenarioId: z.string().nullable(),

  routes: z.array(RouteResultSchema),
  hasConfidentRecommendation: z.boolean(),
  noConfidentRouteReason: z.string().nullable(),

  weather: z.object({
    apparentTemperatureC: z.number().nullable(),
    relativeHumidityPct: z.number().nullable(),
    precipitationMm: z.number().nullable(),
    observedAt: z.string().datetime({ offset: true }).nullable(),
    fetchedAt: z.string().datetime({ offset: true }),
    isStale: z.boolean(),
    staleThresholdMinutes: z.number(),
  }),

  dataFreshness: z.object({
    weatherAgeMinutes: z.number().nullable(),
    oldestIncidentAgeMinutes: z.number().nullable(),
    hotspotsLoadedAt: z.string().datetime({ offset: true }).nullable(),
  }),

  mlAvailable: z.boolean(),
  alternativesAvailable: z.boolean(),
});

export type AnalyseRoutesResponse = z.infer<typeof AnalyseRoutesResponseSchema>;

// ---------------------------------------------------------------------------
// Incident
// ---------------------------------------------------------------------------

export const CreateIncidentRequestSchema = z.object({
  latitude: z.number().min(19.09).max(19.15),
  longitude: z.number().min(72.81).max(72.88),
  type: IncidentTypeSchema,
  depthCategory: DepthCategorySchema.optional().default('unknown'),
  observedAt: z.string().datetime({ offset: true }),
  mode: TravelModeSchema.optional(),
  notes: z.string().max(280).optional(),
  idempotencyKey: z.string().min(8).max(64),
});

export type CreateIncidentRequest = z.infer<typeof CreateIncidentRequestSchema>;

export const IncidentSchema = z.object({
  incidentId: z.string(),
  latitude: z.number(),
  longitude: z.number(),
  geohash: z.string(),
  type: IncidentTypeSchema,
  depthCategory: DepthCategorySchema,
  observedAt: z.string().datetime({ offset: true }),
  createdAt: z.string().datetime({ offset: true }),
  expiresAt: z.string().datetime({ offset: true }),
  status: IncidentStatusSchema,
  sourceType: z.literal('community_report'),
  isDemo: z.boolean().default(false),
  version: z.number().int().min(1),
});

export type Incident = z.infer<typeof IncidentSchema>;

// ---------------------------------------------------------------------------
// Status endpoint
// ---------------------------------------------------------------------------

export const AreaStatusResponseSchema = z.object({
  lat: z.number(),
  lon: z.number(),
  fetchedAt: z.string().datetime({ offset: true }),
  weather: z.object({
    apparentTemperatureC: z.number().nullable(),
    relativeHumidityPct: z.number().nullable(),
    precipitationMm: z.number().nullable(),
    forecastHour: z.string().datetime({ offset: true }).nullable(),
    isStale: z.boolean(),
  }),
  activeIncidentCount: z.number().int(),
  hotspotCount: z.number().int(),
  pilotZoneStatus: z.enum(['inside', 'outside', 'unknown']),
});

export type AreaStatusResponse = z.infer<typeof AreaStatusResponseSchema>;
