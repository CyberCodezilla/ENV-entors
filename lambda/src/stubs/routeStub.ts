/**
 * Day 1 stub for POST /routes/analyse
 *
 * Returns a structurally valid AnalyseRoutesResponse.
 * Replace the internals on Day 2 with real Mapbox + Open-Meteo + DynamoDB data.
 */
import {
  AnalyseRoutesRequest,
  AnalyseRoutesResponse,
  ROUTE_DISCLAIMER,
} from '@heatflood/shared';

export function buildStubRouteResponse(
  request: AnalyseRoutesRequest,
  requestId: string,
): AnalyseRoutesResponse {
  const now = new Date().toISOString();
  const isReplay = request.isReplay ?? false;

  return {
    requestId,
    processedAt: now,
    isReplay,
    scenarioId: request.scenarioId ?? null,

    hasConfidentRecommendation: true,
    noConfidentRouteReason: null,

    routes: [
      {
        routeId: 'stub-route-a',
        rank: 1,
        distanceM: 2100,
        durationSec: 1560,
        geometry: {
          type: 'LineString',
          coordinates: [
            [request.origin.lon, request.origin.lat],
            [request.destination.lon, request.destination.lat],
          ],
        },
        segments: [
          {
            segmentIndex: 0,
            startCoord: request.origin,
            endCoord: request.destination,
            estimatedArrivalUtc: now,
            floodRisk: 20,
            heatRisk: 35,
            confidence: 55,
            hardBlock: false,
            hardBlockReason: null,
            floodRiskLevel: 'low',
            heatRiskLevel: 'moderate',
            confidenceLevel: 'moderate',
            evidence: [
              {
                sourceType: 'historical_hotspot',
                description: 'Stub evidence — historical hotspot within 200 m',
                observedAt: null,
                fetchedAt: now,
                distanceM: 180,
                verificationStatus: null,
                isVerified: false,
                isDemo: true,
              },
            ],
            reasons: [
              'STUB: Lower estimated flood exposure based on hotspot distance.',
              'STUB: Moderate heat concern for departure hour.',
            ],
          },
        ],
        maxFloodRisk: 20,
        weightedFloodExposure: 18,
        weightedHeatExposure: 35,
        overallFloodLevel: 'low',
        overallHeatLevel: 'moderate',
        overallConfidenceLevel: 'moderate',
        isHardBlocked: false,
        blockReason: null,
        topReasons: [
          'STUB: Lower estimated flood exposure.',
          'STUB: Moderate heat concern.',
        ],
        disclaimer: ROUTE_DISCLAIMER,
      },
    ],

    weather: {
      apparentTemperatureC: null,
      relativeHumidityPct: null,
      precipitationMm: null,
      observedAt: null,
      fetchedAt: now,
      isStale: false,
      staleThresholdMinutes: 30,
    },

    dataFreshness: {
      weatherAgeMinutes: null,
      oldestIncidentAgeMinutes: null,
      hotspotsLoadedAt: null,
    },

    mlAvailable: false,
    alternativesAvailable: false,
  };
}
