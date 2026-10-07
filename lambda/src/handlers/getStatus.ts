/**
 * GET /status?lat=&lon=
 *
 * Returns area-level weather and incident summary.
 * Day 1: stub. Day 2: live Open-Meteo and DynamoDB reads.
 */
import { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import { AreaStatusResponse, isInsidePilotZone, PILOT_BBOX } from '@heatflood/shared';
import { logger } from '../utils/logger';

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  const lat = parseFloat(event.queryStringParameters?.lat ?? '');
  const lon = parseFloat(event.queryStringParameters?.lon ?? '');

  if (isNaN(lat) || isNaN(lon)) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'MISSING_COORDINATES' }),
    };
  }

  const inside = isInsidePilotZone(lat, lon, PILOT_BBOX);
  logger.info('getStatus called', { lat, lon, inside });

  const response: AreaStatusResponse = {
    lat,
    lon,
    fetchedAt: new Date().toISOString(),
    weather: {
      apparentTemperatureC: null,
      relativeHumidityPct: null,
      precipitationMm: null,
      forecastHour: null,
      isStale: false,
    },
    activeIncidentCount: 0,
    hotspotCount: 0,
    pilotZoneStatus: inside ? 'inside' : 'outside',
  };

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(response),
  };
};
