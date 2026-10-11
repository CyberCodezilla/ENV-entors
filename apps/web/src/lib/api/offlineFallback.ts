import type {
  AnalyseResponse,
  AnalyseRoutesRequest,
  DemoFixture,
  HealthResponse,
  IncidentsResponse,
  Route,
  Segment,
  Incident,
  EvidenceItem,
  RiskLevel,
  ConfidenceLevel,
} from './types';
import type { Bbox } from '../geo/bbox';

export const DEMO_SCENARIO_FIXTURES: Record<'heat' | 'flood' | 'compound', DemoFixture> = {
  heat: {
    scenarioId: 'heat',
    _description:
      'Peak summer heat scenario: 43.2°C feels-like, 88% humidity. Tests heat-sensitive route preference.',
    _expectedOutcome: {
      hasConfidentRecommendation: true,
      prefersShadedRoute: true,
      heatLevelShouldBe: 'high',
    },
    origin: { lat: 19.1245, lon: 72.8354 },
    destination: { lat: 19.138, lon: 72.828 },
    mode: 'walking',
    departureTime: '2026-07-18T08:00:00Z',
    heatSensitive: true,
    isReplay: true,
    _weatherOverride: {
      apparentTemperatureC: 43.2,
      relativeHumidityPct: 88,
      precipitationMm: 0,
      forecastHourUtc: '2026-07-18T08:00:00Z',
    },
    _incidentOverrides: [
      {
        incidentId: 'heat-hotspot-1',
        latitude: 19.132,
        longitude: 72.831,
        type: 'extreme_heat',
        depthCategory: 'none',
        status: 'verified',
        sourceType: 'trusted_sensor',
        observedAt: '2026-07-18T07:45:00Z',
        isDemo: true,
      },
    ],
  },
  flood: {
    scenarioId: 'flood',
    _description:
      'Heavy monsoon flooding: 32.5mm/hr rain, verified waterlogging closures near Andheri subway.',
    _expectedOutcome: {
      hasConfidentRecommendation: true,
      blockedRouteCount: 1,
      recommendedRouteShouldAvoid: 'underpass',
    },
    origin: { lat: 19.112, lon: 72.832 },
    destination: { lat: 19.138, lon: 72.855 },
    mode: 'walking',
    departureTime: '2026-07-18T04:30:00Z',
    heatSensitive: false,
    isReplay: true,
    _weatherOverride: {
      apparentTemperatureC: 28.4,
      relativeHumidityPct: 98,
      precipitationMm: 32.5,
      forecastHourUtc: '2026-07-18T04:00:00Z',
    },
    _incidentOverrides: [
      {
        incidentId: 'demo-flood-subway',
        latitude: 19.118,
        longitude: 72.845,
        type: 'underpass_flooded',
        depthCategory: 'vehicle_impassable',
        status: 'verified',
        sourceType: 'official_closure',
        observedAt: '2026-07-18T04:15:00Z',
        isDemo: true,
      },
    ],
  },
  compound: {
    scenarioId: 'compound',
    _description:
      'Compound disaster: coastal high-tide surge fused with 38.5°C heat. All ground routes impassable.',
    _expectedOutcome: {
      hasConfidentRecommendation: false,
      noConfidentRouteReasonContains: 'flooded',
    },
    origin: { lat: 19.1315, lon: 72.815 },
    destination: { lat: 19.131, lon: 72.825 },
    mode: 'walking',
    departureTime: '2026-07-18T06:30:00Z',
    heatSensitive: true,
    isReplay: true,
    _weatherOverride: {
      apparentTemperatureC: 38.5,
      relativeHumidityPct: 92,
      precipitationMm: 24.0,
      forecastHourUtc: '2026-07-18T06:00:00Z',
    },
    _incidentOverrides: [
      {
        incidentId: 'demo-compound-1',
        latitude: 19.1312,
        longitude: 72.819,
        type: 'road_blocked',
        depthCategory: 'vehicle_impassable',
        status: 'verified',
        sourceType: 'official_closure',
        observedAt: '2026-07-18T06:00:00Z',
        isDemo: true,
      },
    ],
  },
};

export function getOfflineHealth(): HealthResponse {
  return {
    status: 'ok',
    service: 'heatflood-backend',
    version: '0.1.0',
    region: 'ap-south-1',
    sagemakerEnabled: true,
    timestamp: new Date().toISOString(),
  };
}

export function generateOfflineDemoFixture(scenarioId: 'heat' | 'flood' | 'compound'): DemoFixture {
  return DEMO_SCENARIO_FIXTURES[scenarioId] ?? DEMO_SCENARIO_FIXTURES.flood;
}

export function generateOfflineAnalyseResponse(req: AnalyseRoutesRequest): AnalyseResponse {
  const isFloodScenario = req.isReplay && req.scenarioId === 'flood';
  const isHeatScenario = (req.isReplay && req.scenarioId === 'heat') || req.heatSensitive;
  const isCompoundScenario = req.isReplay && req.scenarioId === 'compound';

  const origLat = req.origin.lat;
  const origLon = req.origin.lon;
  const destLat = req.destination.lat;
  const destLon = req.destination.lon;

  // Approximate distance in meters
  const dLat = (destLat - origLat) * 111320;
  const dLon = (destLon - origLon) * 111320 * Math.cos((origLat * Math.PI) / 180);
  const straightDistM = Math.max(500, Math.round(Math.sqrt(dLat * dLat + dLon * dLon)));
  const routeDistM = Math.round(straightDistM * 1.35);
  const walkingSec = Math.round(routeDistM / 1.3);
  const drivingSec = Math.round(routeDistM / 7.5);
  const durationSec = req.mode === 'walking' ? walkingSec : drivingSec;

  const steps = 6;
  const coordsRoute1: [number, number][] = [];
  const coordsRoute2: [number, number][] = [];

  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const arc1 = Math.sin(t * Math.PI) * 0.0035;
    coordsRoute1.push([
      Number((origLon + (destLon - origLon) * t - arc1).toFixed(6)),
      Number((origLat + (destLat - origLat) * t + arc1).toFixed(6)),
    ]);

    const arc2 = Math.sin(t * Math.PI) * 0.0045;
    coordsRoute2.push([
      Number((origLon + (destLon - origLon) * t + arc2).toFixed(6)),
      Number((origLat + (destLat - origLat) * t + arc2).toFixed(6)),
    ]);
  }

  const nowIso = new Date().toISOString();

  // Generate segments for Route 1 (Safe Corridor)
  const segmentsRoute1: Segment[] = [];
  const segDist1 = Math.round(routeDistM / steps);
  const segDur1 = Math.round(durationSec / steps);

  for (let i = 0; i < steps; i++) {
    const fScore = isFloodScenario
      ? Math.round(10 + Math.random() * 15)
      : isCompoundScenario
      ? Math.round(65 + Math.random() * 20)
      : Math.round(12 + Math.random() * 10);

    const hScore = isHeatScenario
      ? Math.round(35 + Math.random() * 15)
      : isCompoundScenario
      ? Math.round(75 + Math.random() * 15)
      : Math.round(25 + Math.random() * 15);

    const fLevel: RiskLevel = fScore > 60 ? 'high' : fScore > 30 ? 'moderate' : 'low';
    const hLevel: RiskLevel = hScore > 60 ? 'high' : hScore > 30 ? 'moderate' : 'low';
    const cLevel: ConfidenceLevel = 'good';

    const evidence: EvidenceItem[] = [
      {
        sourceType: isFloodScenario ? 'official_closure' : 'trusted_sensor',
        description: isFloodScenario
          ? 'Elevated arterial flyover above 8.5m flood zone'
          : 'Tree-canopy shaded residential walkway',
        observedAt: nowIso,
        fetchedAt: nowIso,
        distanceM: 350,
        verificationStatus: 'verified',
        isVerified: true,
        isDemo: true,
      },
    ];

    segmentsRoute1.push({
      segmentIndex: i,
      startCoord: { lat: coordsRoute1[i][1], lon: coordsRoute1[i][0] },
      endCoord: { lat: coordsRoute1[i + 1][1], lon: coordsRoute1[i + 1][0] },
      estimatedArrivalUtc: new Date(Date.now() + i * segDur1 * 1000).toISOString(),
      segmentLengthM: segDist1,
      floodRisk: fScore,
      heatRisk: hScore,
      confidence: 88,
      hardBlock: false,
      hardBlockReason: null,
      floodRiskLevel: fLevel,
      heatRiskLevel: hLevel,
      confidenceLevel: cLevel,
      evidence,
      reasons: isFloodScenario
        ? ['Safe elevated bypass grade', 'Operational stormwater drains']
        : isHeatScenario
        ? ['Leafy residential shade canopy', 'Lower radiant heat load']
        : ['Clear pathway with standard exposure'],
    });
  }

  // Generate segments for Route 2 (Alternative / Submerged Underpass)
  const segmentsRoute2: Segment[] = [];
  const segDist2 = Math.round((routeDistM * 1.08) / steps);
  const segDur2 = Math.round((durationSec * 1.1) / steps);

  for (let i = 0; i < steps; i++) {
    const isSubwayPoint = Boolean(i === 3 && (isFloodScenario || isCompoundScenario));
    const fScore = isSubwayPoint ? 96 : isFloodScenario ? 75 : 28;
    const hScore = isHeatScenario ? 88 : 35;

    const fLevel: RiskLevel = isSubwayPoint ? 'blocked' : fScore > 60 ? 'high' : 'moderate';
    const hLevel: RiskLevel = hScore > 60 ? 'high' : 'moderate';
    const cLevel: ConfidenceLevel = 'good';

    const evidence: EvidenceItem[] = [
      {
        sourceType: isSubwayPoint ? 'official_closure' : 'community_report',
        description: isSubwayPoint
          ? 'Andheri Subway low underpass submerged (1.2m water depth)'
          : 'Unshaded concrete surface exposure',
        observedAt: nowIso,
        fetchedAt: nowIso,
        distanceM: isSubwayPoint ? 15 : 200,
        verificationStatus: 'verified',
        isVerified: true,
        isDemo: true,
      },
    ];

    segmentsRoute2.push({
      segmentIndex: i,
      startCoord: { lat: coordsRoute2[i][1], lon: coordsRoute2[i][0] },
      endCoord: { lat: coordsRoute2[i + 1][1], lon: coordsRoute2[i + 1][0] },
      estimatedArrivalUtc: new Date(Date.now() + i * segDur2 * 1000).toISOString(),
      segmentLengthM: segDist2,
      floodRisk: fScore,
      heatRisk: hScore,
      confidence: 84,
      hardBlock: isSubwayPoint,
      hardBlockReason: isSubwayPoint ? 'Underpass submerged (1.2m depth) - impassable' : null,
      floodRiskLevel: fLevel,
      heatRiskLevel: hLevel,
      confidenceLevel: cLevel,
      evidence,
      reasons: isSubwayPoint
        ? ['Submerged underpass closure verified by traffic authorities']
        : ['High solar asphalt temperature penalty'],
    });
  }

  const route1: Route = {
    routeId: 'route-optimal-1',
    rank: 1,
    distanceM: routeDistM,
    durationSec,
    geometry: {
      type: 'LineString',
      coordinates: coordsRoute1,
    },
    segments: segmentsRoute1,
    maxFloodRisk: isCompoundScenario ? 82 : isFloodScenario ? 24 : 18,
    weightedFloodExposure: isCompoundScenario ? 72 : isFloodScenario ? 19 : 14,
    weightedHeatExposure: isCompoundScenario ? 78 : isHeatScenario ? 42 : 28,
    overallFloodLevel: isCompoundScenario ? 'high' : 'low',
    overallHeatLevel: isCompoundScenario ? 'high' : isHeatScenario ? 'moderate' : 'low',
    overallConfidenceLevel: 'good',
    isHardBlocked: false,
    blockReason: null,
    topReasons: isFloodScenario
      ? [
          'Bypasses submerged Andheri Subway via elevated Western Express flyover',
          'Elevated road grade (+8.5m elevation above sea level)',
          'High stormwater drainage capacity along arterial segment',
        ]
      : isHeatScenario
      ? [
          'Favors residential canopy streets with 48% shade coverage',
          'Reduces mean radiant asphalt temperature by 8.2°C',
          'Avoids unshaded mid-day Link Road solar corridor',
        ]
      : isCompoundScenario
      ? [
          'Emergency transit corridor — high residual risks present',
          'Ground waterlogging and severe heat overload active',
        ]
      : [
          'Direct route with minimal environmental hazard exposure',
          'Verified drainage capacity and normal surface temperatures',
        ],
    disclaimer:
      'HeatFlood Guardian routes balance real-time weather, crowdsourced hazard reports, and AI risk scoring. Exercise caution in extreme events.',
  };

  const route2: Route = {
    routeId: 'route-congested-2',
    rank: 2,
    distanceM: Math.round(routeDistM * 1.08),
    durationSec: Math.round(durationSec * 1.1),
    geometry: {
      type: 'LineString',
      coordinates: coordsRoute2,
    },
    segments: segmentsRoute2,
    maxFloodRisk: isFloodScenario || isCompoundScenario ? 96 : 35,
    weightedFloodExposure: isFloodScenario ? 78 : 32,
    weightedHeatExposure: isHeatScenario ? 84 : 45,
    overallFloodLevel: isFloodScenario || isCompoundScenario ? 'blocked' : 'moderate',
    overallHeatLevel: isHeatScenario ? 'high' : 'moderate',
    overallConfidenceLevel: 'good',
    isHardBlocked: isFloodScenario || isCompoundScenario ? true : false,
    blockReason:
      isFloodScenario || isCompoundScenario
        ? 'Underpass submerged (1.2m depth) - impassable'
        : null,
    topReasons: isFloodScenario
      ? [
          'HARD BLOCKED: Underpass closure verified by official report',
          'Low elevation bowl topography (1.8m above sea level)',
          'Storm drainage surcharge at 100% capacity',
        ]
      : isHeatScenario
      ? [
          'Severe heat exposure along unshaded asphalt thoroughfare',
          'Direct solar UV index 11+ with minimal canopy cover',
          'Surface temperatures exceeding 51°C',
        ]
      : ['Alternative route with moderate traffic and surface water risk'],
    disclaimer:
      'HeatFlood Guardian routes balance real-time weather, crowdsourced hazard reports, and AI risk scoring. Exercise caution in extreme events.',
  };

  const weather = isFloodScenario
    ? {
        apparentTemperatureC: 28.4,
        relativeHumidityPct: 98,
        precipitationMm: 32.5,
        observedAt: nowIso,
        fetchedAt: nowIso,
        isStale: false,
        staleThresholdMinutes: 30,
      }
    : isHeatScenario
    ? {
        apparentTemperatureC: 43.2,
        relativeHumidityPct: 88,
        precipitationMm: 0,
        observedAt: nowIso,
        fetchedAt: nowIso,
        isStale: false,
        staleThresholdMinutes: 30,
      }
    : isCompoundScenario
    ? {
        apparentTemperatureC: 38.5,
        relativeHumidityPct: 92,
        precipitationMm: 24.0,
        observedAt: nowIso,
        fetchedAt: nowIso,
        isStale: false,
        staleThresholdMinutes: 30,
      }
    : {
        apparentTemperatureC: 34.0,
        relativeHumidityPct: 76,
        precipitationMm: 1.2,
        observedAt: nowIso,
        fetchedAt: nowIso,
        isStale: false,
        staleThresholdMinutes: 30,
      };

  return {
    requestId: `offline-sim-${Date.now()}`,
    processedAt: nowIso,
    isReplay: req.isReplay === true,
    scenarioId: req.scenarioId ?? null,
    routes: [route1, route2],
    hasConfidentRecommendation: !isCompoundScenario,
    noConfidentRouteReason: isCompoundScenario
      ? 'Extreme compound disaster: high-tide coastal surge fused with 38.5°C heat has rendered ground roads impassable. Recommended action: use elevated Metro Line 2A or official emergency transit guidance.'
      : null,
    weather,
    dataFreshness: {
      weatherAgeMinutes: 2,
      oldestIncidentAgeMinutes: 14,
      hotspotsLoadedAt: nowIso,
    },
    mlAvailable: true,
    alternativesAvailable: true,
  };
}

export function getOfflineIncidents(b: Bbox): IncidentsResponse {
  const midLat = (b.latMin + b.latMax) / 2;
  const midLon = (b.lngMin + b.lngMax) / 2;
  const nowIso = new Date().toISOString();

  const demoIncidents: Incident[] = [
    {
      incidentId: 'inc-subway-flood',
      latitude: Number((midLat - 0.004).toFixed(6)),
      longitude: Number((midLon + 0.005).toFixed(6)),
      type: 'underpass_flooded',
      depthCategory: 'vehicle_impassable',
      status: 'verified',
      sourceType: 'official_closure',
      observedAt: new Date(Date.now() - 900000).toISOString(),
      expiresAt: new Date(Date.now() + 3600000).toISOString(),
    },
    {
      incidentId: 'inc-waterlogging-junction',
      latitude: Number((midLat + 0.006).toFixed(6)),
      longitude: Number((midLon - 0.004).toFixed(6)),
      type: 'waterlogging',
      depthCategory: 'knee',
      status: 'corroborated',
      sourceType: 'community_report',
      observedAt: new Date(Date.now() - 1500000).toISOString(),
      expiresAt: new Date(Date.now() + 3600000).toISOString(),
    },
  ];

  return {
    incidents: demoIncidents,
    count: demoIncidents.length,
    fetchedAt: nowIso,
    bbox: b,
  };
}

export function getOfflineStatus(lat: number, lon: number) {
  return {
    lat,
    lon,
    fetchedAt: new Date().toISOString(),
    weather: {
      apparentTemperatureC: 34.0,
      relativeHumidityPct: 76,
      precipitationMm: 1.2,
      forecastHour: new Date().toISOString().slice(0, 13) + ':00:00Z',
      isStale: false,
    },
    activeIncidentCount: 2,
    hotspotCount: 4,
    pilotZoneStatus: 'inside' as const,
  };
}
