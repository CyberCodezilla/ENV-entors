/**
 * Dedicated SQS Worker Lambda for Asynchronous Hazard Reporting
 *
 * Processes queued hazard report payloads from Amazon SQS:
 *   - Spatial corroboration across 9-cell geohash radius
 *   - Deduplication via DynamoDB conditional put
 *   - Anomaly detection & TTL assignment
 */
import { SQSEvent, SQSHandler } from 'aws-lambda';
import {
  CreateIncidentRequest,
  Incident,
  encodeGeohash,
  TTL_MINUTES,
  SEGMENT_PARAMS,
  haversineDistanceM,
} from '@heatflood/shared';
import { PutItemCommand, QueryCommand, ConditionalCheckFailedException } from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { v4 as uuidv4 } from 'uuid';
import { dynamoClient, getGeohashNeighbors5 } from '../adapters/dynamodb';
import { logger } from '../utils/logger';

const client = dynamoClient;
const INCIDENTS_TABLE = process.env.INCIDENTS_TABLE ?? 'heatflood-incidents';

export interface QueuedReportPayload {
  req: CreateIncidentRequest;
  clientIp?: string;
  requestedAt: string;
}

async function findCorroborating(
  lat: number,
  lon: number,
  type: string,
  now: Date
): Promise<number> {
  const geohashes = getGeohashNeighbors5(lat, lon);
  const windowStart = new Date(now.getTime() - SEGMENT_PARAMS.corroborationWindowMinutes * 60_000).toISOString();

  try {
    const results = await Promise.all(
      geohashes.map(gh =>
        client.send(new QueryCommand({
          TableName: INCIDENTS_TABLE,
          IndexName: 'geohash-createdAt-index',
          KeyConditionExpression: 'geohash = :gh AND createdAt >= :ws',
          FilterExpression: '#t = :type AND #s <> :rejected AND expiresAt > :now',
          ExpressionAttributeNames: { '#t': 'type', '#s': 'status' },
          ExpressionAttributeValues: {
            ':gh': { S: gh },
            ':ws': { S: windowStart },
            ':type': { S: type },
            ':rejected': { S: 'rejected' },
            ':now': { S: now.toISOString() },
          },
        }))
      )
    );

    const incidentMap = new Map<string, Incident>();
    for (const res of results) {
      for (const item of res.Items ?? []) {
        const inc = unmarshall(item) as Incident;
        incidentMap.set(inc.incidentId, inc);
      }
    }

    const nearby = Array.from(incidentMap.values());
    return nearby.filter((inc: Incident) =>
      haversineDistanceM(lat, lon, inc.latitude, inc.longitude)
      <= SEGMENT_PARAMS.corroborationRadius
    ).length;
  } catch (err) {
    logger.warn('Worker corroboration lookup failed', { err });
    return 0;
  }
}

export const handler: SQSHandler = async (event: SQSEvent) => {
  logger.info('incidentWorker batch start', { recordCount: event.Records.length });

  for (const record of event.Records) {
    try {
      const payload = JSON.parse(record.body) as QueuedReportPayload;
      const req = payload.req;
      const now = new Date();

      const unverifiedExpiry = new Date(now.getTime() + TTL_MINUTES.unverifiedReport * 60_000);
      const corroborating = await findCorroborating(req.latitude, req.longitude, req.type, now);
      const status = corroborating >= 2 ? 'corroborated' : 'pending';
      const effectiveExpiry = status === 'corroborated'
        ? new Date(now.getTime() + TTL_MINUTES.corroboratedReport * 60_000)
        : unverifiedExpiry;
      const ttlEpoch = Math.floor(effectiveExpiry.getTime() / 1000);

      const incidentId = req.idempotencyKey || uuidv4();

      const incident: Incident & { ttlEpoch: number } = {
        incidentId,
        latitude: req.latitude,
        longitude: req.longitude,
        geohash: encodeGeohash(req.latitude, req.longitude, 5),
        type: req.type,
        depthCategory: req.depthCategory ?? 'unknown',
        observedAt: req.observedAt,
        createdAt: payload.requestedAt || now.toISOString(),
        expiresAt: effectiveExpiry.toISOString(),
        status,
        sourceType: 'community_report',
        isDemo: false,
        version: 1,
        notes: req.notes ?? null,
        mode: req.mode ?? null,
        ttlEpoch,
      };

      try {
        await client.send(new PutItemCommand({
          TableName: INCIDENTS_TABLE,
          Item: marshall(incident),
          ConditionExpression: 'attribute_not_exists(incidentId)',
        }));
        logger.info('incidentWorker processed report', { incidentId, status, corroborating });
      } catch (err) {
        const isDuplicate = err instanceof ConditionalCheckFailedException ||
          (err as { name?: string })?.name === 'ConditionalCheckFailedException';

        if (isDuplicate) {
          logger.info('incidentWorker skipped duplicate report', { incidentId });
        } else {
          throw err;
        }
      }
    } catch (err) {
      logger.error('incidentWorker failed record', { messageId: record.messageId, err });
      throw err;
    }
  }
};
