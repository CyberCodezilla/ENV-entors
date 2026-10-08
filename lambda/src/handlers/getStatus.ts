/**
 * GET /status?lat=&lon=
 *
 * Returns live weather snapshot + incident count for the area.
 *
 * Fix notes (optimised):
 *   - Merged two separate import statements from the same module
 *     (fetchNearbyIncidents + fetchAllHotspots were split imports)
 *   - fetchAllHotspots() replaced with getHotspots() from hotspotCache;
 *     the old call bypassed the 15-min in-memory cache and issued a
 *     fresh DynamoDB ScanCommand on every /status request
 */
import { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import { AreaStatusResponse, isInsidePilotZone, PILOT_BBOX } from '@heatflood/shared';
import { fetchWeather } from '../adapters/openMeteo';
import { fetchNearbyIncidents } from '../adapters/dynamodb';
import { getHotspots } from '../utils/hotspotCache';
import { logger } from '../utils/logger';

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  const lat = parseFloat(event.queryStringParameters?.lat ?? '');
  const lon = parseFloat(event.queryStringParameters?.lon ?? '');

  if (isNaN(lat) || isNaN(lon)) {
    return { statusCode: 400, body: JSON.stringify({ error: 'MISSING_COORDINATES' }) };
  }

  const inside = isInsidePilotZone(lat, lon, PILOT_BBOX);
  logger.info('getStatus called', { lat: lat.toFixed(4), lon: lon.toFixed(4), inside });

  const [weather, incidents, hotspots] = await Promise.all([
    fetchWeather(lat, lon, new Date()),
    fetchNearbyIncidents(lat, lon),
    getHotspots(), // uses 15-min in-memory cache
  ]);

  const response: AreaStatusResponse = {
    lat,
    lon,
    fetchedAt: new Date().toISOString(),
    weather: {
      apparentTemperatureC: weather.apparentTemperatureC,
      relativeHumidityPct: weather.relativeHumidityPct,
      precipitationMm: weather.precipitationMm,
      forecastHour: weather.forecastHourUtc,
      isStale: weather.isStale,
    },
    activeIncidentCount: incidents.length,
    hotspotCount: hotspots.length,
    pilotZoneStatus: inside ? 'inside' : 'outside',
  };

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(response),
  };
};
