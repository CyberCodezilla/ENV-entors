/**
 * POST /routes/analyse
 *
 * When isReplay=true the handler:
 *   - Skips Open-Meteo call → uses _weatherOverride from body
 *   - Skips DynamoDB incidents → uses _incidentOverrides from body
 *   - Still calls Mapbox for real route geometry
 *   - Still calls DynamoDB for hotspots (static reference data)
 *   - Adds DEMO_SCENARIO banner info to response
 *
 * Perf notes (optimised):
 *   - Math.max(...spread) replaced with reduce to prevent stack overflow
 *     on large incident arrays (spread pushes all elements onto call stack)
 *   - Segment arrival times pre-computed sequentially before Promise.all
 *     fan-out, eliminating the shared mutable cumulativeSec race condition
 */
import { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import { ZodError } from 'zod';
import {
  AnalyseRoutesRequestSchema,
  AnalyseRoutesResponse,
  splitRouteIntoSegments,
  haversineDistanceM,
  SEGMENT_PARAMS,
} from '@heatflood/shared';
import { fetchMapboxRoutes } from '../adapters/mapbox';
import { fetchWeather, WeatherSnapshot } from '../adapters/openMeteo';
import { fetchNearbyIncidents } from '../adapters/dynamodb';
import { getHotspots } from '../utils/hotspotCache';
import { scoreSegment } from '../engine/segmentScorer';
import { rankRoutes, RawRoute } from '../engine/routeRanker';
import { logger } from '../utils/logger';
import type { ActiveIncident, FloodHotspot } from '../engine/floodRisk';

const MAPBOX_TOKEN = process.env.MAPBOX_TOKEN ?? '';

function buildReplayWeather(override: Record<string, unknown>): WeatherSnapshot {
  return {
    apparentTemperatureC: (override.apparentTemperatureC as number) ?? null,
    relativeHumidityPct: (override.relativeHumidityPct as number) ?? null,
    precipitationMm: (override.precipitationMm as number) ?? null,
    forecastHourUtc: (override.forecastHourUtc as string) ?? null,
    fetchedAt: new Date().toISOString(),
    isStale: false,
    staleThresholdMinutes: 30,
    ageMinutes: 0,
    error: null,
  };
}

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  const requestId = event.requestContext.requestId;
  const now = new Date();

  try {
    let body: unknown;
    try {
      body = JSON.parse(event.body ?? '{}');
    } catch {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json', 'X-Request-Id': requestId },
        body: JSON.stringify({ error: 'INVALID_JSON', detail: 'Malformed JSON request body', requestId }),
      };
    }

    const request = AnalyseRoutesRequestSchema.parse(body);

    const isReplay = request.isReplay === true;
    const scenarioId = request.scenarioId ?? null;

    logger.info('analyseRoutes start', { requestId, isReplay, scenarioId, mode: request.mode });

    const departureTime = new Date(request.departureTime);
    const midLat = (request.origin.lat + request.destination.lat) / 2;
    const midLon = (request.origin.lon + request.destination.lon) / 2;

    // ---- Fetch routes (always real Mapbox) ----
    const mapboxResult = await fetchMapboxRoutes(request, MAPBOX_TOKEN);
    if (mapboxResult.error || mapboxResult.routes.length === 0) {
      return {
        statusCode: 503,
        headers: { 'Content-Type': 'application/json', 'X-Request-Id': requestId },
        body: JSON.stringify({
          error: 'ROUTING_UNAVAILABLE',
          detail: mapboxResult.error ?? 'No routes found',
          requestId,
        }),
      };
    }

    // ---- Replay vs Live data injection ----
    let weather: WeatherSnapshot;
    let incidents: ActiveIncident[];
    let hotspots: FloodHotspot[];

    if (isReplay && request._weatherOverride) {
      weather = buildReplayWeather(request._weatherOverride as Record<string, unknown>);
      incidents = (request._incidentOverrides ?? []) as unknown as ActiveIncident[];
      hotspots = await getHotspots();
      logger.info('analyseRoutes: replay mode active', { scenarioId });
    } else {
      // Multi-point hazard sample: origin, destination, and midpoint to ensure full route coverage
      const samplePoints = [
        { lat: request.origin.lat, lon: request.origin.lon },
        { lat: request.destination.lat, lon: request.destination.lon },
        { lat: midLat, lon: midLon },
      ];

      const [weatherRes, incidentsLists, hotspotsRes] = await Promise.all([
        fetchWeather(midLat, midLon, departureTime),
        Promise.all(samplePoints.map(p => fetchNearbyIncidents(p.lat, p.lon))),
        getHotspots(),
      ]);

      weather = weatherRes;
      hotspots = hotspotsRes;

      // Merge and deduplicate incidents across all sampled points
      const incidentMap = new Map<string, ActiveIncident>();
      for (const list of incidentsLists) {
        for (const inc of list) {
          incidentMap.set(inc.incidentId, inc);
        }
      }
      incidents = Array.from(incidentMap.values());
    }

    // ---- Score each route ----
    const rawRoutes: RawRoute[] = await Promise.all(
      mapboxResult.routes.map(async (route) => {
        const coords = route.geometry.coordinates;
        const segs = splitRouteIntoSegments(coords, SEGMENT_PARAMS.maxSegmentLengthM);

        // Pre-compute arrival time per segment based on mode-appropriate travel speed
        const speedMps = request.mode === 'walking'
          ? 1.2
          : Math.max(3.0, route.distanceM / Math.max(1, route.durationSec));

        let cumulativeSec = 0;
        const arrivalTimes: Date[] = segs.map((seg) => {
          const arrival = new Date(departureTime.getTime() + cumulativeSec * 1000);
          cumulativeSec += seg.lengthM / speedMps;
          return arrival;
        });

        const segmentAssessments = await Promise.all(
          segs.map(async (seg, idx) => {
            const [sLon, sLat] = seg.startCoord;
            const [eLon, eLat] = seg.endCoord;
            const segMidLat = (sLat + eLat) / 2;
            const segMidLon = (sLon + eLon) / 2;

            const nearbyIncidents = incidents.filter(inc =>
              haversineDistanceM(segMidLat, segMidLon, inc.latitude, inc.longitude)
              <= SEGMENT_PARAMS.hazardMatchRadiusM
            );

            const nearbyHotspots = hotspots.filter(hs =>
              haversineDistanceM(segMidLat, segMidLon, hs.lat, hs.lon)
              <= SEGMENT_PARAMS.hotspotMatchRadiusM
            );

            return scoreSegment({
              segmentIndex: idx,
              startCoord: { lat: sLat, lon: sLon },
              endCoord: { lat: eLat, lon: eLon },
              estimatedArrivalUtc: arrivalTimes[idx],
              segmentLengthM: seg.lengthM,
              precipitationMmPerHour: weather.precipitationMm,
              minutesSinceRainStop: null,
              apparentTemperatureC: weather.apparentTemperatureC,
              relativeHumidityPct: weather.relativeHumidityPct,
              weatherAgeMinutes: weather.ageMinutes,
              nearbyIncidents,
              nearbyHotspots,
              heatSensitive: request.heatSensitive ?? false,
              mode: request.mode,
              now,
            });
          }),
        );

        return {
          routeId: route.routeId,
          distanceM: route.distanceM,
          durationSec: route.durationSec,
          geometry: route.geometry,
          segments: segmentAssessments,
        } satisfies RawRoute;
      }),
    );

    const { routes, hasConfidentRecommendation, noConfidentRouteReason } = rankRoutes(rawRoutes);

    // Use reduce instead of Math.max(...spread) to avoid stack overflow
    // when incidents array is large (spread pushes all elements onto the call stack)
    const oldestIncidentAge = incidents.length > 0
      ? incidents.reduce((max, i) => {
          const age = (now.getTime() - new Date(i.observedAt).getTime()) / 60_000;
          return age > max ? age : max;
        }, 0)
      : null;

    const response: AnalyseRoutesResponse = {
      requestId,
      processedAt: now.toISOString(),
      isReplay,
      scenarioId,

      routes,
      hasConfidentRecommendation,
      noConfidentRouteReason,

      weather: {
        apparentTemperatureC: weather.apparentTemperatureC,
        relativeHumidityPct: weather.relativeHumidityPct,
        precipitationMm: weather.precipitationMm,
        observedAt: weather.forecastHourUtc,
        fetchedAt: weather.fetchedAt,
        isStale: weather.isStale,
        staleThresholdMinutes: weather.staleThresholdMinutes,
      },

      dataFreshness: {
        weatherAgeMinutes: weather.ageMinutes,
        oldestIncidentAgeMinutes: oldestIncidentAge !== null ? Math.round(oldestIncidentAge) : null,
        hotspotsLoadedAt: now.toISOString(),
      },

      mlAvailable: false,
      alternativesAvailable: routes.length > 1,
    };

    logger.info('analyseRoutes complete', {
      requestId, routeCount: routes.length,
      hasConfidentRecommendation, isReplay, scenarioId,
    });

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'X-Request-Id': requestId },
      body: JSON.stringify(response),
    };

  } catch (err) {
    if (err instanceof ZodError) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json', 'X-Request-Id': requestId },
        body: JSON.stringify({ error: 'VALIDATION_ERROR', details: err.errors }),
      };
    }
    logger.error('analyseRoutes unhandled error', { requestId, err });
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json', 'X-Request-Id': requestId },
      body: JSON.stringify({ error: 'INTERNAL_ERROR', requestId }),
    };
  }
};
