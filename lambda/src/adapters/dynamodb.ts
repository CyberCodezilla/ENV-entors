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

export const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION ?? 'ap-south-1' });
const client = dynamoClient;
const INCIDENTS_TABLE = process.env.INCIDENTS_TABLE ?? 'heatflood-incidents';
const HOTSPOTS_TABLE = process.env.HOTSPOTS_TABLE ?? 'heatflood-hotspots';

export function getGeohashNeighbors5(lat: number, lon: number): string[] {
  const dLat = 0.035;
  const dLon = 0.035;
  const hashes = new Set<string>();
  for (const latOffset of [-dLat, 0, dLat]) {
    for (const lonOffset of [-dLon, 0, dLon]) {
      const targetLat = Math.max(-90, Math.min(90, lat + latOffset));
      const targetLon = Math.max(-180, Math.min(180, lon + lonOffset));
      hashes.add(encodeGeohash(targetLat, targetLon, 5));
    }
  }
  return Array.from(hashes);
}

/**
 * Fetch active incidents within geohash cells covering the area around a point.
 * Precision 5 geohash = ~5 km² cells. We query the centre cell + 8 neighbours.
 */
export async function fetchNearbyIncidents(
  lat: number,
  lon: number,
): Promise<ActiveIncident[]> {
  const geohashes = getGeohashNeighbors5(lat, lon);
  const now = new Date().toISOString();
  const incidentMap = new Map<string, ActiveIncident>();

  try {
    const results = await Promise.all(
      geohashes.map(gh =>
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

    for (const res of results) {
      for (const item of res.Items ?? []) {
        const inc = unmarshall(item) as ActiveIncident;
        incidentMap.set(inc.incidentId, inc);
      }
    }
  } catch (err) {
    logger.warn('DynamoDB fetchNearbyIncidents failed', { err, lat, lon });
  }

  return Array.from(incidentMap.values());
}

/**
 * Fetch active incidents across multiple sample points, deduplicating geohashes
 * to minimize DynamoDB QueryCommand calls.
 */
export async function fetchIncidentsForPoints(
  points: Array<{ lat: number; lon: number }>,
): Promise<ActiveIncident[]> {
  const geohashSet = new Set<string>();
  for (const p of points) {
    const neighbors = getGeohashNeighbors5(p.lat, p.lon);
    for (const gh of neighbors) {
      geohashSet.add(gh);
    }
  }

  const now = new Date().toISOString();
  const incidentMap = new Map<string, ActiveIncident>();

  try {
    const results = await Promise.all(
      Array.from(geohashSet).map(gh =>
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

    for (const res of results) {
      for (const item of res.Items ?? []) {
        const inc = unmarshall(item) as ActiveIncident;
        incidentMap.set(inc.incidentId, inc);
      }
    }
  } catch (err) {
    logger.warn('DynamoDB fetchIncidentsForPoints failed', { err });
  }

  return Array.from(incidentMap.values());
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
