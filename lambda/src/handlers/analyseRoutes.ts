/**
 * POST /routes/analyse — Day 4: adds replay mode injection
 *
 * When isReplay=true the handler:
 *   - Skips Open-Meteo call → uses _weatherOverride from body
 *   - Skips DynamoDB incidents → uses _incidentOverrides from body
 *   - Still calls Mapbox for real route geometry
 *   - Still calls DynamoDB for hotspots (static reference data)
 *   - Adds DEMO_SCENARIO banner info to response
 */
import { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import { ZodError } from 'zod';
import {
  AnalyseRoutesRequestSchema,
  AnalyseRoutesResponse,
  splitRouteIntoSegments,
  haversineDistanceM,
  SEGMENT_PARAMS,
  PILOT_BBOX,
  isInsidePilotZone,
  ROUTE_DISCLAIMER,
} from '@heatflood/shared';
import { fetchMapboxRoutes, MapboxRoute } from '../adapters/mapbox';
import { fetchWeather, WeatherSnapshot } from '../adapters/openMeteo';
import { fetchNearbyIncidents, fetchAllHotspots } from '../adapters/dynamodb';
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
    const body = JSON.parse(event.body ?? '{}');
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

    if (isReplay && body._weatherOverride) {
      // Inject fixture data
      weather = buildReplayWeather(body._weatherOverride as Record<string, unknown>);
      incidents = (body._incidentOverrides ?? []) as ActiveIncident[];
      hotspots = await getHotspots(); // hotspots are static — real data always
      logger.info('analyseRoutes: replay mode active', { scenarioId });
    } else {
      // Live data
      [weather, incidents, hotspots] = await Promise.all([
        fetchWeather(midLat, midLon, departureTime),
        fetchNearbyIncidents(midLat, midLon),
        getHotspots(),
      ]);
    }

    // ---- Score each route ----
    const rawRoutes: RawRoute[] = await Promise.all(
      mapboxResult.routes.map(async (route) => {
        const coords = route.geometry.coordinates;
        const segs = splitRouteIntoSegments(coords, SEGMENT_PARAMS.maxSegmentLengthM);

        let cumulativeSec = 0;
        const segmentAssessments = await Promise.all(
          segs.map(async (seg, idx) => {
            const [sLon, sLat] = seg.startCoord;
            const [eLon, eLat] = seg.endCoord;
            const segMidLat = (sLat + eLat) / 2;
            const segMidLon = (sLon + eLon) / 2;

            const arrivalUtc = new Date(departureTime.getTime() + cumulativeSec * 1000);
            cumulativeSec += seg.lengthM / 1.2;

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
              estimatedArrivalUtc: arrivalUtc,
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

    const oldestIncidentAge = incidents.length > 0
      ? Math.max(...incidents.map(i =>
          (now.getTime() - new Date(i.observedAt).getTime()) / 60_000
        ))
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'VALIDATION_ERROR', details: err.errors }),
      };
    }
    logger.error('analyseRoutes unhandled error', { requestId, err });
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'INTERNAL_ERROR', requestId }),
    };
  }
};
