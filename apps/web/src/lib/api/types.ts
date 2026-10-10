export interface Place {
  name: string;
  lat: number;
  lon: number;
}

export type RiskLevel = 'low' | 'moderate' | 'high' | 'blocked';
export type ConfidenceLevel = 'limited' | 'moderate' | 'good';

export type IncidentType =
  | 'waterlogging'
  | 'road_blocked'
  | 'underpass_flooded'
  | 'extreme_heat'
  | 'electrical_hazard'
  | 'heat_exposure'
  | 'other';

export type DepthCategory =
  | 'unknown'
  | 'ankle'
  | 'knee'
  | 'vehicle_impassable'
  | 'none';

export type IncidentStatus =
  | 'pending'
  | 'corroborated'
  | 'verified'
  | 'rejected'
  | 'resolved'
  | 'expired'
  | 'queued';

export type SourceType =
  | 'official_closure'
  | 'trusted_sensor'
  | 'moderator_verified'
  | 'community_report'
  | 'historical_hotspot'
  | 'weather_derived';

export interface EvidenceItem {
  sourceType: SourceType;
  description: string;
  observedAt: string | null;
  fetchedAt: string;
  distanceM: number | null;
  verificationStatus: IncidentStatus | null;
  isVerified: boolean;
  isDemo: boolean;
}

export interface MlSignal {
  available: boolean;
  probability?: number;
  modelVersion?: string;
  featureVersion: string;
  predictedAt?: string;
  reasonUnavailable?: 'disabled' | 'timeout' | 'error' | 'invalid' | 'no_model';
}

export interface Segment {
  segmentIndex: number;
  startCoord: { lat: number; lon: number };
  endCoord: { lat: number; lon: number };
  estimatedArrivalUtc: string;
  segmentLengthM: number;
  floodRisk: number;
  heatRisk: number;
  confidence: number;
  hardBlock: boolean;
  hardBlockReason: string | null;
  floodRiskLevel: RiskLevel;
  heatRiskLevel: RiskLevel;
  confidenceLevel: ConfidenceLevel;
  evidence: EvidenceItem[];
  reasons: string[];
  mlSignal?: MlSignal;
}

export interface Route {
  routeId: string;
  rank: number;
  distanceM: number;
  durationSec: number;
  geometry: {
    type: 'LineString';
    coordinates: [number, number][];
  };
  segments: Segment[];
  maxFloodRisk: number;
  weightedFloodExposure: number;
  weightedHeatExposure: number;
  overallFloodLevel: RiskLevel;
  overallHeatLevel: RiskLevel;
  overallConfidenceLevel: ConfidenceLevel;
  isHardBlocked: boolean;
  blockReason: string | null;
  topReasons: string[];
  disclaimer: string;
}

export interface WeatherData {
  apparentTemperatureC: number | null;
  relativeHumidityPct: number | null;
  precipitationMm: number | null;
  observedAt: string | null;
  fetchedAt: string;
  isStale: boolean;
  staleThresholdMinutes: number;
}

export interface DataFreshness {
  weatherAgeMinutes: number | null;
  oldestIncidentAgeMinutes: number | null;
  hotspotsLoadedAt: string | null;
}

export interface AnalyseResponse {
  requestId: string;
  processedAt: string;
  isReplay: boolean;
  scenarioId: string | null;
  routes: Route[];
  hasConfidentRecommendation: boolean;
  noConfidentRouteReason: string | null;
  weather: WeatherData;
  dataFreshness: DataFreshness;
  mlAvailable: boolean;
  alternativesAvailable: boolean;
}

export interface AnalyseRoutesRequest {
  origin: { lat: number; lon: number };
  destination: { lat: number; lon: number };
  mode: 'walking' | 'driving-traffic';
  departureTime: string;
  heatSensitive?: boolean;
  isReplay?: boolean;
  scenarioId?: string;
  _weatherOverride?: Record<string, unknown>;
  _incidentOverrides?: Array<Record<string, unknown>>;
}

export interface Incident {
  incidentId: string;
  latitude: number;
  longitude: number;
  geohash?: string;
  type: IncidentType;
  depthCategory: DepthCategory;
  observedAt: string;
  createdAt?: string;
  expiresAt?: string;
  status: IncidentStatus;
  sourceType: SourceType;
  isDemo?: boolean;
  notes?: string | null;
  mode?: string | null;
  isOptimistic?: boolean;
}

export interface IncidentsResponse {
  incidents: Incident[];
  count: number;
  fetchedAt: string;
  bbox?: { lngMin: number; latMin: number; lngMax: number; latMax: number };
}

export interface CreateIncidentRequest {
  latitude: number;
  longitude: number;
  type: IncidentType;
  depthCategory?: DepthCategory;
  observedAt: string;
  mode?: 'walking' | 'driving-traffic';
  notes?: string;
  idempotencyKey: string;
}

export interface CreateIncidentResponse {
  incidentId: string;
  status: string;
  expiresAt: string;
  corroboratingCount?: number;
  note?: string;
  duplicate?: boolean;
}

export interface StatusResponse {
  lat: number;
  lon: number;
  fetchedAt: string;
  weather: {
    apparentTemperatureC: number | null;
    relativeHumidityPct: number | null;
    precipitationMm: number | null;
    forecastHour: string | null;
    isStale: boolean;
  };
  activeIncidentCount: number;
  hotspotCount: number;
  pilotZoneStatus: 'inside' | 'outside';
}

export interface DemoFixture extends AnalyseRoutesRequest {
  scenarioId: 'heat' | 'flood' | 'compound';
  _description: string;
  _expectedOutcome: Record<string, unknown>;
}

export interface HealthResponse {
  status: string;
  service: string;
  timestamp: string;
  version: string;
  region: string;
  sagemakerEnabled: boolean;
}

export interface VerifyResponse {
  incidentId: string;
  status: 'verified';
  verifiedAt: string;
  message: string;
}

export interface RejectResponse {
  incidentId: string;
  status: 'rejected';
  message: string;
}