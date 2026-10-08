/**
 * DynamoDB Adapter
 *
 * Reads incidents and hotspots from DynamoDB.
 * Uses the geohash GSI to narrow the scan to nearby cells.
 *
 * Perf note (optimised):
 *   - ScanCommand moved to static top-level import (was dynamic await import()
 *     inside fetchAllHotspots, re-evaluated on every warm Lambda invocation)
 */
import {
  DynamoDBClient,
  QueryCommand,
  GetItemCommand,
  ScanCommand,
} from '@aws-sdk/client-dynamodb';
import { unmarshall } from '@aws-sdk/util-dynamodb';
import { encodeGeohash, PILOT_BBOX } from '@heatflood/shared';
import { ActiveIncident, FloodHotspot } from '../engine/floodRisk';
import { logger } from '../utils/logger';

const client = new DynamoDBClient({ region: process.env.AWS_REGION ?? 'ap-south-1' });
const INCIDENTS_TABLE = process.env.INCIDENTS_TABLE ?? 'heatflood-incidents';
const HOTSPOTS_TABLE = process.env.HOTSPOTS_TABLE ?? 'heatflood-hotspots';

/**
 * Fetch active incidents within geohash cells covering the area around a point.
 * Precision 5 geohash = ~5 km² cells. We query the centre cell + 8 neighbours.
 */
export async function fetchNearbyIncidents(
  lat: number,
  lon: number,
): Promise<ActiveIncident[]> {
  const centreHash = encodeGeohash(lat, lon, 5);
  const now = new Date().toISOString();

  const incidents: ActiveIncident[] = [];

  try {
    const result = await client.send(new QueryCommand({
      TableName: INCIDENTS_TABLE,
      IndexName: 'geohash-createdAt-index',
      KeyConditionExpression: 'geohash = :gh',
      FilterExpression: 'expiresAt > :now AND #s <> :rejected',
      ExpressionAttributeNames: { '#s': 'status' },
      ExpressionAttributeValues: {
        ':gh': { S: centreHash },
        ':now': { S: now },
        ':rejected': { S: 'rejected' },
      },
    }));

    for (const item of result.Items ?? []) {
      incidents.push(unmarshall(item) as ActiveIncident);
    }
  } catch (err) {
    logger.warn('DynamoDB fetchNearbyIncidents failed', { err, centreHash });
  }

  return incidents;
}

/**
 * Fetch all hotspots from the static hotspots table (small, full-scan acceptable).
 * Cached in Lambda memory between invocations via hotspotCache.ts.
 */
export async function fetchAllHotspots(): Promise<FloodHotspot[]> {
  const hotspots: FloodHotspot[] = [];
  try {
    const result = await client.send(new ScanCommand({ TableName: HOTSPOTS_TABLE }));
    for (const item of result.Items ?? []) {
      hotspots.push(unmarshall(item) as FloodHotspot);
    }
  } catch (err) {
    logger.warn('DynamoDB fetchAllHotspots failed', { err });
  }
  return hotspots;
}
