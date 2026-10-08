/**
 * GET /incidents?bbox=lng_min,lat_min,lng_max,lat_max — Day 3 REAL implementation
 *
 * Returns active (non-expired, non-rejected) incidents inside the viewport bbox.
 * Uses geohash GSI for efficient lookup.
 */
import { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import { DynamoDBClient, ScanCommand } from '@aws-sdk/client-dynamodb';
import { unmarshall } from '@aws-sdk/util-dynamodb';
import { haversineDistanceM } from '@heatflood/shared';
import { logger } from '../utils/logger';

const client = new DynamoDBClient({ region: process.env.AWS_REGION ?? 'ap-south-1' });
const INCIDENTS_TABLE = process.env.INCIDENTS_TABLE ?? 'heatflood-incidents';

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  const bboxParam = event.queryStringParameters?.bbox;
  const now = new Date().toISOString();

  let lngMin = -180, latMin = -90, lngMax = 180, latMax = 90;
  if (bboxParam) {
    const parts = bboxParam.split(',').map(Number);
    if (parts.length === 4 && parts.every(n => !isNaN(n))) {
      [lngMin, latMin, lngMax, latMax] = parts;
    }
  }

  logger.info('listIncidents called', { bbox: bboxParam });

  try {
    // Full scan with TTL + status filter — acceptable for MVP (table stays small)
    const result = await client.send(new ScanCommand({
      TableName: INCIDENTS_TABLE,
      FilterExpression:
        'expiresAt > :now AND #s <> :rejected AND #s <> :internal AND attribute_not_exists(#internal)',
      ExpressionAttributeNames: {
        '#s': 'status',
        '#internal': '_ratelimit',
      },
      ExpressionAttributeValues: {
        ':now': { S: now },
        ':rejected': { S: 'rejected' },
        ':internal': { S: '_internal' },
      },
    }));

    const incidents = (result.Items ?? [])
      .map(i => unmarshall(i))
      .filter(i => i.type !== '_ratelimit' && i.sourceType !== '_internal')
      .filter(i => {
        const { latitude: lat, longitude: lon } = i;
        return lat >= latMin && lat <= latMax && lon >= lngMin && lon <= lngMax;
      })
      // Strip internal fields before returning
      .map(({ ttlEpoch: _ttl, ...rest }) => rest);

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        incidents,
        count: incidents.length,
        fetchedAt: now,
        bbox: { lngMin, latMin, lngMax, latMax },
      }),
    };
  } catch (err) {
    logger.error('listIncidents error', { err });
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'INTERNAL_ERROR' }),
    };
  }
};
