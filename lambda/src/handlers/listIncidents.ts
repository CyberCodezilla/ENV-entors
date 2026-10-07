/**
 * GET /incidents?bbox=lng_min,lat_min,lng_max,lat_max
 *
 * Returns active (non-expired) incidents in the map viewport.
 * Day 1: returns empty array stub.
 * Day 3: add DynamoDB scan + geohash filter.
 */
import { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import { logger } from '../utils/logger';

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  const bbox = event.queryStringParameters?.bbox;
  logger.info('listIncidents called', { bbox });

  // TODO Day 3: parse bbox, query DynamoDB incidents table, filter by status and expiresAt

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      incidents: [],
      fetchedAt: new Date().toISOString(),
      note: 'Day 1 stub — real DynamoDB integration arrives on Day 3.',
    }),
  };
};
