/**
 * POST /incidents
 *
 * Pipeline:
 *   1. Validate request (Zod)
 *   2. Per-IP rate limiting (DynamoDB GSI counter)
 *   3. Persist incident with TTL epoch
 *   4. Check corroboration with nearby recent reports
 *   5. Return typed response
 *
 * Fix notes (optimised):
 *   - checkRateLimit previously queried incidentId (PK) with a prefix string
 *     — PK equality never matches a prefix, count was always 0, rate limit
 *     never fired. Fixed: use geohash GSI (geohash='ratelimit') and filter
 *     on incidentId begins_with the IP+bucket prefix.
 *   - encodeGeohash now always called with explicit precision=5 (consistent
 *     with dynamodb.ts; guards against default changing).
 */
import { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import { ZodError } from 'zod';
import {
  CreateIncidentRequestSchema,
  Incident,
  encodeGeohash,
  TTL_MINUTES,
  SEGMENT_PARAMS,
  haversineDistanceM,
} from '@heatflood/shared';
import {
  DynamoDBClient,
  PutItemCommand,
  GetItemCommand,
  QueryCommand,
  ConditionalCheckFailedException,
} from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { v4 as uuidv4 } from 'uuid';
import { dynamoClient, getGeohashNeighbors5 } from '../adapters/dynamodb';
import { logger } from '../utils/logger';

const client = dynamoClient;
const INCIDENTS_TABLE = process.env.INCIDENTS_TABLE ?? 'heatflood-incidents';
const RATE_LIMIT_PER_HOUR = 5;

/**
 * Per-IP hourly rate limiter.
 *
 * Rate-limit records live in a dedicated rate-limit table (`process.env.RATE_LIMIT_TABLE`).
 * Item schema:
 *   key: 'ratelimit#<IP>#<YYYY-MM-DDTHH>' (HASH PK)
 *   count: number
 *   ttlEpoch: number
 */
async function checkRateLimit(clientIp: string, now: Date): Promise<boolean> {
  const rateLimitTable = process.env.RATE_LIMIT_TABLE;
  if (!rateLimitTable) {
    // Fail open if no rate limit table is configured
    return true;
  }

  const hourBucket = now.toISOString().slice(0, 13); // "2026-07-18T09"
  const rateLimitKey = `ratelimit#${clientIp}#${hourBucket}`;
  const windowExpiry = Math.floor(now.getTime() / 1000) + 3600;

  try {
    const getResult = await client.send(new GetItemCommand({
      TableName: rateLimitTable,
      Key: marshall({ key: rateLimitKey }),
    }));

    const currentCount = getResult.Item ? (unmarshall(getResult.Item).count as number) : 0;
    if (currentCount >= RATE_LIMIT_PER_HOUR) return false;

    await client.send(new PutItemCommand({
      TableName: rateLimitTable,
      Item: marshall({
        key: rateLimitKey,
        count: currentCount + 1,
        ttlEpoch: windowExpiry,
        createdAt: now.toISOString(),
      }),
    }));
    return true;
  } catch {
    return true; // fail open — don’t block legitimate reports on DynamoDB hiccup
  }
}

async function findCorroborating(
  lat: number, lon: number, type: string, now: Date
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
  } catch {
    return 0;
  }
}

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  const requestId = event.requestContext.requestId;
  const clientIp = event.requestContext.http?.sourceIp ?? 'unknown';
  const now = new Date();

  try {
    let body: unknown;
    try {
      body = JSON.parse(event.body ?? '{}');
    } catch {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'INVALID_JSON', detail: 'Malformed JSON request body' }),
      };
    }

    const req = CreateIncidentRequestSchema.parse(body);

    const allowed = await checkRateLimit(clientIp, now);
    if (!allowed) {
      return {
        statusCode: 429,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          error: 'RATE_LIMITED',
          detail: `Maximum ${RATE_LIMIT_PER_HOUR} reports per hour per source`,
        }),
      };
    }

    const queueUrl = process.env.INCIDENT_QUEUE_URL;
    if (queueUrl) {
      const incidentId = req.idempotencyKey || uuidv4();
      const { SQSClient, SendMessageCommand } = await import('@aws-sdk/client-sqs');
      const sqs = new SQSClient({ region: process.env.AWS_REGION ?? 'ap-south-1' });

      await sqs.send(new SendMessageCommand({
        QueueUrl: queueUrl,
        MessageBody: JSON.stringify({
          req,
          clientIp,
          requestedAt: now.toISOString(),
        }),
      }));

      logger.info('createIncident queued asynchronously via SQS', { requestId, incidentId, clientIp });

      return {
        statusCode: 202,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          incidentId,
          status: 'queued',
          message: 'Report received and queued for asynchronous spatial processing',
        }),
      };
    }

    if (req.idempotencyKey) {
      try {
        const existing = await client.send(new GetItemCommand({
          TableName: INCIDENTS_TABLE,
          Key: marshall({ incidentId: req.idempotencyKey }),
        }));
        if (existing.Item) {
          const item = unmarshall(existing.Item) as Incident;
          return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              incidentId: item.incidentId,
              status: item.status,
              expiresAt: item.expiresAt,
              duplicate: true,
            }),
          };
        }
      } catch {
        // fail open to standard creation pipeline on transient query error
      }
    }

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
      geohash: encodeGeohash(req.latitude, req.longitude, 5), // explicit precision
      type: req.type,
      depthCategory: req.depthCategory ?? 'unknown',
      observedAt: req.observedAt,
      createdAt: now.toISOString(),
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
    } catch (err) {
      const isDuplicate = err instanceof ConditionalCheckFailedException ||
        (err as { name?: string })?.name === 'ConditionalCheckFailedException';

      if (isDuplicate) {
        return {
          statusCode: 200,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            incidentId: incident.incidentId,
            status: incident.status,
            expiresAt: incident.expiresAt,
            duplicate: true,
          }),
        };
      }
      throw err;
    }

    logger.info('createIncident persisted', {
      requestId,
      incidentId: incident.incidentId,
      status,
      corroborating,
      type: req.type,
    });

    return {
      statusCode: 201,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        incidentId: incident.incidentId,
        status,
        expiresAt: incident.expiresAt,
        corroboratingCount: corroborating,
        note: status === 'corroborated'
          ? 'Report corroborated by nearby recent reports — elevated weight in route scoring.'
          : 'Report received as unverified. A single report does not block any route.',
      }),
    };
  } catch (err) {
    if (err instanceof ZodError) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'VALIDATION_ERROR', details: err.errors }),
      };
    }
    logger.error('createIncident error', { requestId, err });
    return { statusCode: 500, body: JSON.stringify({ error: 'INTERNAL_ERROR', requestId }) };
  }
};
