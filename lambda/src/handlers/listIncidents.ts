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
import { ScanCommand, QueryCommand, ScanCommandInput } from '@aws-sdk/client-dynamodb';
import { unmarshall } from '@aws-sdk/util-dynamodb';
import { encodeGeohash } from '@heatflood/shared';
import { dynamoClient } from '../adapters/dynamodb';
import { logger } from '../utils/logger';

const client = dynamoClient;
const INCIDENTS_TABLE = process.env.INCIDENTS_TABLE ?? 'heatflood-incidents';

const MAX_BBOX_SPAN = 0.25;
const MAX_GEOHASHES = 25;

export function getGeohashesForBbox(
  lngMin: number,
  latMin: number,
  lngMax: number,
  latMax: number,
  maxGeohashes: number = MAX_GEOHASHES
): string[] {
  // Precision 5 geohash grid dimensions at ~19°N latitude: ~0.044° lon x ~0.044° lat.
  // Step by 0.04° to sample each cell deterministically without redundant sub-stepping (O(1)).
  const step = 0.04;
  const set = new Set<string>();

  for (let lat = latMin; lat <= latMax + step / 2; lat += step) {
    const sampleLat = Math.min(latMax, lat);
    for (let lon = lngMin; lon <= lngMax + step / 2; lon += step) {
      const sampleLon = Math.min(lngMax, lon);
      set.add(encodeGeohash(sampleLat, sampleLon, 5));
      if (set.size >= maxGeohashes) return Array.from(set);
    }
  }

  return Array.from(set).slice(0, maxGeohashes);
}

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  const bboxParam = event.queryStringParameters?.bbox;
  const now = new Date().toISOString();

  let lngMin = -180, latMin = -90, lngMax = 180, latMax = 90;
  let isFilteredBbox = false;

  if (bboxParam) {
    const parts = bboxParam.split(',').map(Number);
    if (parts.length === 4 && parts.every(n => Number.isFinite(n))) {
      [lngMin, latMin, lngMax, latMax] = parts;
      if (latMin > latMax || lngMin > lngMax || latMin < -90 || latMax > 90 || lngMin < -180 || lngMax > 180) {
        return {
          statusCode: 400,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: 'INVALID_BBOX', detail: 'bbox coordinates out of valid range' }),
        };
      }
      if (latMax - latMin > MAX_BBOX_SPAN || lngMax - lngMin > MAX_BBOX_SPAN) {
        return {
          statusCode: 400,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: 'INVALID_BBOX', detail: `bbox span exceeds maximum allowed limit of ${MAX_BBOX_SPAN} degrees` }),
        };
      }
      isFilteredBbox = true;
    } else {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'INVALID_BBOX', detail: 'bbox must be 4 comma-separated numbers: lng_min,lat_min,lng_max,lat_max' }),
      };
    }
  }

  logger.info('listIncidents called', { bbox: bboxParam });

  try {
    const rawItems: Record<string, import('@aws-sdk/client-dynamodb').AttributeValue>[] = [];

    if (isFilteredBbox) {
      // Targeted GSI lookup over visible viewport geohashes — avoids O(N) full table scan
      const targetGeohashes = getGeohashesForBbox(lngMin, latMin, lngMax, latMax, MAX_GEOHASHES);
      const queryResults = await Promise.all(
        targetGeohashes.map(gh =>
          client.send(new QueryCommand({
            TableName: INCIDENTS_TABLE,
            IndexName: 'geohash-createdAt-index',
            KeyConditionExpression: 'geohash = :gh',
            FilterExpression: 'expiresAt > :now AND #s <> :rejected',
            ExpressionAttributeNames: { '#s': 'status' },
            ExpressionAttributeValues: {
              ':gh': { S: gh },
              ':now': { S: now },
              ':rejected': { S: 'rejected' },
            },
          }))
        )
      );

      for (const res of queryResults) {
        if (res.Items?.length) {
          rawItems.push(...res.Items);
        }
      }
    } else {
      // Fallback for unbounded requests
      let lastEvaluatedKey: Record<string, import('@aws-sdk/client-dynamodb').AttributeValue> | undefined = undefined;
      do {
        const scanParams: ScanCommandInput = {
          TableName: INCIDENTS_TABLE,
          FilterExpression: 'expiresAt > :now AND #s <> :rejected',
          ExpressionAttributeNames: { '#s': 'status' },
          ExpressionAttributeValues: {
            ':now': { S: now },
            ':rejected': { S: 'rejected' },
          },
          ExclusiveStartKey: lastEvaluatedKey,
        };
        const scanOutput = await client.send(new ScanCommand(scanParams));

        if (scanOutput.Items?.length) {
          rawItems.push(...scanOutput.Items);
        }
        lastEvaluatedKey = scanOutput.LastEvaluatedKey;
      } while (lastEvaluatedKey);
    }

    // Single O(n) pass: unmarshall + type-guard + bbox-filter + field-strip
    const incidents: Record<string, unknown>[] = [];
    for (const raw of rawItems) {
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
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'INTERNAL_ERROR' }),
    };
  }
};
