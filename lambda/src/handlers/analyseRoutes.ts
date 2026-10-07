/**
 * POST /routes/analyse
 *
 * Main HeatFlood Guardian endpoint.
 * Day 1: returns a valid stub response with typed structure.
 * Day 2: replace stubs with real Mapbox, Open-Meteo and DynamoDB calls.
 */
import { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import { ZodError } from 'zod';
import {
  AnalyseRoutesRequestSchema,
  AnalyseRoutesResponse,
  ROUTE_DISCLAIMER,
} from '@heatflood/shared';
import { buildStubRouteResponse } from '../stubs/routeStub';
import { logger } from '../utils/logger';

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  const requestId = event.requestContext.requestId;

  try {
    const body = JSON.parse(event.body ?? '{}');
    const request = AnalyseRoutesRequestSchema.parse(body);

    logger.info('analyseRoutes called', {
      requestId,
      mode: request.mode,
      isReplay: request.isReplay,
    });

    // -------------------------------------------------------------------
    // Day 1: return a typed stub response
    // Day 2: replace with real adapters
    // -------------------------------------------------------------------
    const response: AnalyseRoutesResponse = buildStubRouteResponse(request, requestId);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'X-Request-Id': requestId,
      },
      body: JSON.stringify(response),
    };
  } catch (err) {
    if (err instanceof ZodError) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'VALIDATION_ERROR', details: err.errors }),
      };
    }
    logger.error('analyseRoutes unhandled error', { requestId, err });
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'INTERNAL_ERROR', requestId }),
    };
  }
};
