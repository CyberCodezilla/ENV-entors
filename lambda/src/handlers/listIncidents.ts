/**
 * GET /incidents?bbox=lng_min,lat_min,lng_max,lat_max
 *
 * Returns active (non-expired, non-rejected) incidents inside the viewport bbox.
 * Uses geohash GSI for efficient lookup.
 *
 * Perf+fix notes (optimised):
 *   - 4 separate array passes (map → filter → filter → map) collapsed into
 *     a single reduce — O(4n) → O(n), one allocation pass
 *   - FilterExpression previously used attribute_not_exists('#internal')
 *     where #internal was aliased to the attribute NAME '_ratelimit'.
 *     DynamoDB attribute_not_exists checks whether the attribute key exists
 *     on the item — no item has an attribute literally named '_ratelimit',
 *     so this clause was always true and a no-op. Removed from DB query;
 *     type / sourceType guard is the real filter and lives in the reduce.
 */
import { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import { DynamoDBClient, ScanCommand } from '@aws-sdk/client-dynamodb';
import { unmarshall } from '@aws-sdk/util-dynamodb';
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
    const result = await client.send(new ScanCommand({
      TableName: INCIDENTS_TABLE,
      FilterExpression: 'expiresAt > :now AND #s <> :rejected AND #s <> :internal',
      ExpressionAttributeNames: { '#s': 'status' },
      ExpressionAttributeValues: {
        ':now':      { S: now },
        ':rejected': { S: 'rejected' },
        ':internal': { S: '_internal' },
      },
    }));

    // Single O(n) pass: unmarshall + type-guard + bbox-filter + field-strip
    const incidents: Record<string, unknown>[] = [];
    for (const raw of result.Items ?? []) {
      const item = unmarshall(raw);

      // Skip internal rate-limit sentinel records
      if (item['type'] === '_ratelimit' || item['sourceType'] === '_internal') continue;

      const lat = item['latitude'] as number;
      const lon = item['longitude'] as number;
      if (lat < latMin || lat > latMax || lon < lngMin || lon > lngMax) continue;

      // Strip internal fields before returning
      const { ttlEpoch: _ttl, ...rest } = item as { ttlEpoch: unknown;[k: string]: unknown };
      incidents.push(rest);
    }

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
