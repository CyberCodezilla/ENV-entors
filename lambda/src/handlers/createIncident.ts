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
  QueryCommand,
  ConditionalCheckFailedException,
} from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { v4 as uuidv4 } from 'uuid';
import { dynamoClient } from '../adapters/dynamodb';
import { logger } from '../utils/logger';

const client = dynamoClient;
const INCIDENTS_TABLE = process.env.INCIDENTS_TABLE ?? 'heatflood-incidents';
const RATE_LIMIT_PER_HOUR = 5;

/**
 * Per-IP hourly rate limiter.
 *
 * Rate-limit records live in the same incidents table under:
 *   geohash  = 'ratelimit'           (GSI partition key)
 *   incidentId = 'ratelimit#<IP>#<YYYY-MM-DDTHH>#<uuid>'  (table PK)
 *
 * We query the GSI for all records whose incidentId begins_with
 * 'ratelimit#<IP>#<bucket>' to count how many exist for this IP+hour.
 */
async function checkRateLimit(clientIp: string, now: Date): Promise<boolean> {
  const hourBucket = now.toISOString().slice(0, 13); // "2026-07-18T09"
  const prefix = `ratelimit#${clientIp}#${hourBucket}`;
  const windowExpiry = Math.floor(now.getTime() / 1000) + 3600;
  const partitionKey = `ratelimit#${clientIp}`;

  try {
    // Query via geohash GSI — partitioned by IP to avoid global hot partition
    const result = await client.send(new QueryCommand({
      TableName: INCIDENTS_TABLE,
      IndexName: 'geohash-createdAt-index',
      KeyConditionExpression: 'geohash = :gh',
      FilterExpression: 'begins_with(incidentId, :prefix)',
      ExpressionAttributeValues: {
        ':gh': { S: partitionKey },
        ':prefix': { S: prefix },
      },
    }));

    const count = result.Items?.length ?? 0;
    if (count >= RATE_LIMIT_PER_HOUR) return false;

    // Write a new counter record (TTL = end of hour window)
    await client.send(new PutItemCommand({
      TableName: INCIDENTS_TABLE,
      Item: marshall({
        incidentId: `${prefix}#${uuidv4()}`,
        geohash: partitionKey,
        createdAt: now.toISOString(),
        expiresAt: new Date(windowExpiry * 1000).toISOString(),
        ttlEpoch: windowExpiry,
        type: '_ratelimit',
        status: '_internal',
        sourceType: '_internal',
        isDemo: false,
        version: 1,
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
  const geohash = encodeGeohash(lat, lon, 5); // explicit precision
  const windowStart = new Date(now.getTime() - SEGMENT_PARAMS.corroborationWindowMinutes * 60_000).toISOString();

  try {
    const result = await client.send(new QueryCommand({
      TableName: INCIDENTS_TABLE,
      IndexName: 'geohash-createdAt-index',
      KeyConditionExpression: 'geohash = :gh AND createdAt >= :ws',
      FilterExpression: '#t = :type AND #s <> :rejected AND expiresAt > :now',
      ExpressionAttributeNames: { '#t': 'type', '#s': 'status' },
      ExpressionAttributeValues: {
        ':gh': { S: geohash },
        ':ws': { S: windowStart },
        ':type': { S: type },
        ':rejected': { S: 'rejected' },
        ':now': { S: now.toISOString() },
      },
    }));

    const nearby = (result.Items ?? []).map((i: Record<string, unknown>) => unmarshall(i as Record<string, import('@aws-sdk/client-dynamodb').AttributeValue>) as Incident);
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
