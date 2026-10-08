/**
 * POST /routes/analyse — Day 2 REAL implementation
 *
 * Pipeline:
 *   1. Validate request (Zod)
 *   2. Fetch routes from Mapbox (up to 3 alternatives)
 *   3. Fetch weather from Open-Meteo for route midpoint
 *   4. Fetch incidents + hotspots from DynamoDB
 *   5. Split each route into ~200 m segments
 *   6. Score every segment (flood + heat + confidence + ML stub)
 *   7. Rank routes and build response
 *
 * Replay mode: injects fixture data instead of calling external APIs.
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
} from '@heatflood/shared';
import { fetchMapboxRoutes } from '../adapters/mapbox';
import { fetchWeather } from '../adapters/openMeteo';
import { fetchNearbyIncidents, fetchAllHotspots } from '../adapters/dynamodb';
import { scoreSegment } from '../engine/segmentScorer';
import { rankRoutes, RawRoute } from '../engine/routeRanker';
import { logger } from '../utils/logger';
import type { ActiveIncident, FloodHotspot } from '../engine/floodRisk';

const MAPBOX_TOKEN = process.env.MAPBOX_TOKEN ?? '';

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  const requestId = event.requestContext.requestId;
  const now = new Date();

  try {
    // ---- 1. Validate input ----
    const body = JSON.parse(event.body ?? '{}');
    const request = AnalyseRoutesRequestSchema.parse(body);

    logger.info('analyseRoutes start', {
      requestId,
      mode: request.mode,
      isReplay: request.isReplay,
      scenarioId: request.scenarioId,
    });

    const originInsidePilot = isInsidePilotZone(request.origin.lat, request.origin.lon, PILOT_BBOX);
    const destInsidePilot = isInsidePilotZone(request.destination.lat, request.destination.lon, PILOT_BBOX);
    if (!originInsidePilot && !destInsidePilot) {
      logger.warn('Both endpoints outside pilot zone', { requestId });
      // Allow but note in response — do not block
    }

    const departureTime = new Date(request.departureTime);
    const midLat = (request.origin.lat + request.destination.lat) / 2;
    const midLon = (request.origin.lon + request.destination.lon) / 2;

    // ---- 2. Fetch routes (parallel with weather) ----
    const [mapboxResult, weather, incidents, hotspots] = await Promise.all([
      fetchMapboxRoutes(request, MAPBOX_TOKEN),
      fetchWeather(midLat, midLon, departureTime),
      fetchNearbyIncidents(midLat, midLon),
      fetchAllHotspots(),
    ]);

    if (mapboxResult.error || mapboxResult.routes.length === 0) {
      logger.warn('Mapbox returned no routes', { requestId, error: mapboxResult.error });
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

    // ---- 3. Score each route ----
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

            // Estimate arrival at this segment
            const segWalkSec = (seg.lengthM / 1.2); // 1.2 m/s avg
            const arrivalUtc = new Date(departureTime.getTime() + cumulativeSec * 1000);
            cumulativeSec += segWalkSec;

            // Filter incidents within match radius of this segment
            const nearbyIncidents: ActiveIncident[] = incidents.filter(inc => {
              const d = haversineDistanceM(segMidLat, segMidLon, inc.latitude, inc.longitude);
              return d <= SEGMENT_PARAMS.hazardMatchRadiusM;
            });

            const nearbyHotspots: FloodHotspot[] = hotspots.filter(hs => {
              const d = haversineDistanceM(segMidLat, segMidLon, hs.lat, hs.lon);
              return d <= SEGMENT_PARAMS.hotspotMatchRadiusM;
            });

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

    // ---- 4. Rank routes ----
    const { routes, hasConfidentRecommendation, noConfidentRouteReason } = rankRoutes(rawRoutes);

    // ---- 5. Build response ----
    const oldestIncident = incidents.length > 0
      ? Math.max(...incidents.map(i => (now.getTime() - new Date(i.observedAt).getTime()) / 60_000))
      : null;

    const response: AnalyseRoutesResponse = {
      requestId,
      processedAt: now.toISOString(),
      isReplay: request.isReplay ?? false,
      scenarioId: request.scenarioId ?? null,

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
        oldestIncidentAgeMinutes: oldestIncident !== null ? Math.round(oldestIncident) : null,
        hotspotsLoadedAt: hotspots.length > 0 ? now.toISOString() : null,
      },

      mlAvailable: false,
      alternativesAvailable: routes.length > 1,
    };

    logger.info('analyseRoutes complete', {
      requestId,
      routeCount: routes.length,
      hasConfidentRecommendation,
      mlAvailable: false,
    });

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'X-Request-Id': requestId,
      },
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
