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
  encodeGeohash,
  SEGMENT_PARAMS,
  SAGEMAKER_ENABLED,
  ML_FEATURE_VERSION,
  calculateOldestIncidentAge,
} from '@heatflood/shared';
import { fetchMapboxRoutes } from '../adapters/mapbox';
import { fetchWeather, WeatherSnapshot } from '../adapters/openMeteo';
import { fetchIncidentsForPoints, getGeohashNeighbors6 } from '../adapters/dynamodb';
import { SageMakerMlRiskProvider } from '../adapters/sagemaker';
import { getHotspots } from '../utils/hotspotCache';
import { scoreSegment } from '../engine/segmentScorer';
import { rankRoutes, RawRoute } from '../engine/routeRanker';
import { logger } from '../utils/logger';
import type { ActiveIncident, FloodHotspot } from '../engine/floodRisk';

const MAPBOX_TOKEN = process.env.MAPBOX_TOKEN ?? '';
const mlProvider = SAGEMAKER_ENABLED ? new SageMakerMlRiskProvider() : undefined;

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

      const [weatherRes, incidentsRes, hotspotsRes] = await Promise.all([
        fetchWeather(midLat, midLon, departureTime),
        fetchIncidentsForPoints(samplePoints),
        getHotspots(),
      ]);

      weather = weatherRes;
      incidents = incidentsRes;
      hotspots = hotspotsRes;
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

        // Batch SageMaker inference per route: aggregate all route segment features into a single payload
        let precomputedMlSignals: import('@heatflood/shared').MlRiskSignal[] | undefined;
        if (mlProvider?.predictBatch) {
          const featureList = segs.map((seg, idx) => {
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

            const verifiedIncidents = nearbyIncidents.filter(i => i.status === 'verified' || i.status === 'corroborated');
            const newestIncidentAgeMin = nearbyIncidents.length > 0
              ? nearbyIncidents.reduce((min, i) => {
                  const age = (now.getTime() - new Date(i.observedAt).getTime()) / 60_000;
                  return age < min ? age : min;
                }, Infinity)
              : null;

            let hotspotDistanceM: number | null = null;
            let hotspotOverlap = false;
            for (const hs of nearbyHotspots) {
              const d = haversineDistanceM(segMidLat, segMidLon, hs.lat, hs.lon);
              if (d <= hs.radiusM) hotspotOverlap = true;
              if (hotspotDistanceM === null || d < hotspotDistanceM) hotspotDistanceM = d;
            }

            const arrivalDate = arrivalTimes[idx];

            return {
              featureVersion: ML_FEATURE_VERSION,
              predictionTimeUtc: arrivalDate.toISOString(),
              segmentId: `seg-${idx}`,
              rainfall_recent_1h_mm: weather.precipitationMm,
              rainfall_recent_3h_mm: null,
              rainfall_forecast_1h_mm: null,
              relative_humidity_pct: weather.relativeHumidityPct,
              apparent_temperature_c: weather.apparentTemperatureC,
              hotspot_distance_m: hotspotDistanceM,
              hotspot_overlap: hotspotOverlap ? (1 as const) : (0 as const),
              recent_report_count: nearbyIncidents.length,
              verified_report_count: verifiedIncidents.length,
              newest_report_age_min: newestIncidentAgeMin,
              hour_of_day: arrivalDate.getUTCHours(),
              day_of_week: arrivalDate.getUTCDay(),
              month: arrivalDate.getUTCMonth() + 1,
              location_geohash5: encodeGeohash(segMidLat, segMidLon, 5),
            };
          });

          try {
            precomputedMlSignals = await mlProvider.predictBatch(featureList);
          } catch {
            // Fall back to per-segment evaluation if batch call fails
          }
        }

        // Spatial pre-bucketing by geohash-6 (O(I + H)) to eliminate O(S * (I + H)) trigonometric distance checks
        const incidentSpatialMap = new Map<string, ActiveIncident[]>();
        for (const inc of incidents) {
          const gh6 = encodeGeohash(inc.latitude, inc.longitude, 6);
          const arr = incidentSpatialMap.get(gh6);
          if (arr) arr.push(inc);
          else incidentSpatialMap.set(gh6, [inc]);
        }

        const hotspotSpatialMap = new Map<string, FloodHotspot[]>();
        for (const hs of hotspots) {
          const gh6 = encodeGeohash(hs.lat, hs.lon, 6);
          const arr = hotspotSpatialMap.get(gh6);
          if (arr) arr.push(hs);
          else hotspotSpatialMap.set(gh6, [hs]);
        }

        const segmentAssessments = await Promise.all(
          segs.map(async (seg, idx) => {
            const [sLonRaw, sLatRaw] = seg.startCoord;
            const [eLonRaw, eLatRaw] = seg.endCoord;
            const sLat = Number(sLatRaw.toFixed(5));
            const sLon = Number(sLonRaw.toFixed(5));
            const eLat = Number(eLatRaw.toFixed(5));
            const eLon = Number(eLonRaw.toFixed(5));
            const segMidLat = (sLat + eLat) / 2;
            const segMidLon = (sLon + eLon) / 2;

            const cellHashes = getGeohashNeighbors6(segMidLat, segMidLon);

            const candidateIncidents: ActiveIncident[] = [];
            const seenInc = new Set<string>();
            for (const gh of cellHashes) {
              const cellItems = incidentSpatialMap.get(gh);
              if (cellItems) {
                for (const inc of cellItems) {
                  if (!seenInc.has(inc.incidentId)) {
                    seenInc.add(inc.incidentId);
                    candidateIncidents.push(inc);
                  }
                }
              }
            }

            const candidateHotspots: FloodHotspot[] = [];
            const seenHs = new Set<string>();
            for (const gh of cellHashes) {
              const cellItems = hotspotSpatialMap.get(gh);
              if (cellItems) {
                for (const hs of cellItems) {
                  if (!seenHs.has(hs.hotspotId)) {
                    seenHs.add(hs.hotspotId);
                    candidateHotspots.push(hs);
                  }
                }
              }
            }

            const nearbyIncidents = candidateIncidents.filter(inc =>
              haversineDistanceM(segMidLat, segMidLon, inc.latitude, inc.longitude)
              <= SEGMENT_PARAMS.hazardMatchRadiusM
            );

            const nearbyHotspots = candidateHotspots.filter(hs =>
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
              mlProvider,
              precomputedMlSignal: precomputedMlSignals ? precomputedMlSignals[idx] : undefined,
            });
          }),
        );

        // Compact route line geometry coordinates to 5 decimal places for transport optimization
        const compactGeometry = {
          type: route.geometry.type,
          coordinates: route.geometry.coordinates.map(
            ([lon, lat]) => [Number(lon.toFixed(5)), Number(lat.toFixed(5))] as [number, number]
          ),
        };

        return {
          routeId: route.routeId,
          distanceM: route.distanceM,
          durationSec: route.durationSec,
          geometry: compactGeometry,
          segments: segmentAssessments,
        } satisfies RawRoute;
      }),
    );

    const { routes, hasConfidentRecommendation, noConfidentRouteReason } = rankRoutes(rawRoutes);

    const oldestIncidentAge = calculateOldestIncidentAge(incidents, now);

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

      mlAvailable: rawRoutes.some(r => r.segments.some(s => s.mlSignal?.available === true)),
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
