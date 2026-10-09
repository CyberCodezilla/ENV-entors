/**
 * GET /demo/scenarios/:id
 *
 * Returns a pre-set scenario fixture that the frontend sends straight
 * to POST /routes/analyse with isReplay=true.
 *
 * Available scenario IDs: heat | flood | compound
 *
 * Perf notes (optimised):
 *   - Scenario files are static — they never change at runtime.
 *     Previously fs.readFileSync + JSON.parse ran on every request.
 *     Now files are loaded ONCE at module initialisation into SCENARIO_CACHE
 *     as raw strings (no JSON.parse needed).
 *   - JSON.parse → JSON.stringify round-trip eliminated: the raw JSON string
 *     is stored and returned directly as the response body, saving a full
 *     object graph allocation per request.
 */
import { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import * as fs from 'fs';
import * as path from 'path';
import { logger } from '../utils/logger';

const SCENARIO_DIR = path.join(__dirname, '..', '..', '..', 'data', 'scenarios');
const VALID_IDS = ['heat', 'flood', 'compound'] as const;
type ScenarioId = typeof VALID_IDS[number];

const EMBEDDED_SCENARIOS: Record<ScenarioId, object> = {
  heat: {
    scenarioId: "heat",
    _description: "Peak summer heat scenario: 42°C feels-like, 85% humidity, 13:30 IST. Tests heat-sensitive route preference.",
    _expectedOutcome: {
      hasConfidentRecommendation: true,
      prefersShadedRoute: true,
      heatLevelShouldBe: "high"
    },
    origin: { lat: 19.1120, lon: 72.8320 },
    destination: { lat: 19.1380, lon: 72.8550 },
    mode: "walking",
    departureTime: "2026-07-18T08:00:00Z",
    heatSensitive: true,
    isReplay: true,
    _weatherOverride: {
      apparentTemperatureC: 42.1,
      relativeHumidityPct: 85,
      precipitationMm: 0,
      forecastHourUtc: "2026-07-18T08:00:00Z"
    },
    _incidentOverrides: []
  },
  flood: {
    scenarioId: "flood",
    _description: "Heavy monsoon flooding: 28mm/hr rain, 3 verified waterlogging reports near Versova underpass. Andheri underpass hard-blocked.",
    _expectedOutcome: {
      hasConfidentRecommendation: true,
      blockedRouteCount: 1,
      recommendedRouteShouldAvoid: "underpass"
    },
    origin: { lat: 19.1120, lon: 72.8320 },
    destination: { lat: 19.1380, lon: 72.8550 },
    mode: "walking",
    departureTime: "2026-07-18T04:30:00Z",
    heatSensitive: false,
    isReplay: true,
    _weatherOverride: {
      apparentTemperatureC: 27.3,
      relativeHumidityPct: 98,
      precipitationMm: 28.4,
      forecastHourUtc: "2026-07-18T04:00:00Z"
    },
    _incidentOverrides: [
      {
        incidentId: "demo-flood-1",
        latitude: 19.1180,
        longitude: 72.8370,
        type: "underpass_flooded",
        depthCategory: "vehicle_impassable",
        status: "verified",
        sourceType: "official_closure",
        observedAt: "2026-07-18T04:15:00Z",
        isDemo: true
      },
      {
        incidentId: "demo-flood-2",
        latitude: 19.1195,
        longitude: 72.8390,
        type: "waterlogging",
        depthCategory: "knee",
        status: "corroborated",
        sourceType: "community_report",
        observedAt: "2026-07-18T04:20:00Z",
        isDemo: true
      },
      {
        incidentId: "demo-flood-3",
        latitude: 19.1205,
        longitude: 72.8385,
        type: "road_blocked",
        depthCategory: "knee",
        status: "corroborated",
        sourceType: "community_report",
        observedAt: "2026-07-18T04:25:00Z",
        isDemo: true
      }
    ]
  },
  compound: {
    scenarioId: "compound",
    _description: "Compound disaster: post-rain 38°C heat + residual waterlogging. All routes either flooded or dangerously hot. hasConfidentRecommendation=false scenario.",
    _expectedOutcome: {
      hasConfidentRecommendation: false,
      noConfidentRouteReasonContains: "flooded"
    },
    origin: { lat: 19.1120, lon: 72.8320 },
    destination: { lat: 19.1380, lon: 72.8550 },
    mode: "walking",
    departureTime: "2026-07-18T06:30:00Z",
    heatSensitive: true,
    isReplay: true,
    _weatherOverride: {
      apparentTemperatureC: 38.5,
      relativeHumidityPct: 92,
      precipitationMm: 2.1,
      forecastHourUtc: "2026-07-18T06:00:00Z"
    },
    _incidentOverrides: [
      {
        incidentId: "demo-compound-1",
        latitude: 19.1180,
        longitude: 72.8370,
        type: "underpass_flooded",
        depthCategory: "vehicle_impassable",
        status: "verified",
        sourceType: "official_closure",
        observedAt: "2026-07-18T06:00:00Z",
        isDemo: true
      },
      {
        incidentId: "demo-compound-2",
        latitude: 19.1250,
        longitude: 72.8430,
        type: "road_blocked",
        depthCategory: "vehicle_impassable",
        status: "verified",
        sourceType: "official_closure",
        observedAt: "2026-07-18T06:05:00Z",
        isDemo: true
      },
      {
        incidentId: "demo-compound-3",
        latitude: 19.1300,
        longitude: 72.8480,
        type: "road_blocked",
        depthCategory: "knee",
        status: "corroborated",
        sourceType: "community_report",
        observedAt: "2026-07-18T06:10:00Z",
        isDemo: true
      }
    ]
  }
};

/** Load all scenario files once at cold-start, falling back to embedded scenario defaults if filesystem is unbundled. */
const SCENARIO_CACHE = new Map<ScenarioId, string>();
for (const id of VALID_IDS) {
  try {
    const raw = fs.readFileSync(path.join(SCENARIO_DIR, `${id}.json`), 'utf8');
    SCENARIO_CACHE.set(id, raw);
  } catch {
    // Fall back to embedded scenario data if relative filesystem read fails in Lambda environment
    SCENARIO_CACHE.set(id, JSON.stringify(EMBEDDED_SCENARIOS[id]));
  }
}

const VALID_ID_SET = new Set<string>(VALID_IDS);

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  const id = event.pathParameters?.id ?? '';

  if (!VALID_ID_SET.has(id)) {
    return {
      statusCode: 404,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' },
      body: JSON.stringify({
        error: 'SCENARIO_NOT_FOUND',
        validIds: VALID_IDS,
      }),
    };
  }

  const raw = SCENARIO_CACHE.get(id as ScenarioId);
  if (!raw) {
    // File was missing at deploy time
    logger.error('getDemoScenario: file not found in cache', { id });
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' },
      body: JSON.stringify({ error: 'SCENARIO_READ_ERROR' }),
    };
  }

  logger.info('getDemoScenario served', { id });

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=300',
    },
    // Return raw string directly — no JSON.parse + JSON.stringify round-trip
    body: raw,
  };
};
