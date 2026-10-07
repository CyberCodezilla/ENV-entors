/**
 * POST /incidents
 *
 * Accepts a new community report.
 * Status starts as 'pending' and is never automatically verified.
 * Day 1: validates and returns a typed stub (no DynamoDB write yet).
 * Day 3: add real DynamoDB write, idempotency, rate limiting and expiry.
 */
import { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import { ZodError } from 'zod';
import {
  CreateIncidentRequestSchema,
  Incident,
  encodeGeohash,
  TTL_MINUTES,
} from '@heatflood/shared';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger';

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  const requestId = event.requestContext.requestId;

  try {
    const body = JSON.parse(event.body ?? '{}');
    const req = CreateIncidentRequestSchema.parse(body);

    const now = new Date();
    const expiresAt = new Date(now.getTime() + TTL_MINUTES.unverifiedReport * 60 * 1000);

    const incident: Incident = {
      incidentId: uuidv4(),
      latitude: req.latitude,
      longitude: req.longitude,
      geohash: encodeGeohash(req.latitude, req.longitude),
      type: req.type,
      depthCategory: req.depthCategory ?? 'unknown',
      observedAt: req.observedAt,
      createdAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      status: 'pending',
      sourceType: 'community_report',
      isDemo: false,
      version: 1,
    };

    logger.info('createIncident stub', { requestId, incidentId: incident.incidentId });

    // TODO Day 3: persist to DynamoDB; check idempotencyKey; apply rate limiting

    return {
      statusCode: 201,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        incidentId: incident.incidentId,
        status: incident.status,
        expiresAt: incident.expiresAt,
        note: 'Report received as unverified. A single report does not block any route.',
      }),
    };
  } catch (err) {
    if (err instanceof ZodError) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'VALIDATION_ERROR', details: err.errors }),
      };
    }
    logger.error('createIncident error', { requestId, err });
    return { statusCode: 500, body: JSON.stringify({ error: 'INTERNAL_ERROR' }) };
  }
};
