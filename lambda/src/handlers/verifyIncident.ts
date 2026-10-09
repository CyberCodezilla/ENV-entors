import { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import { GetItemCommand, UpdateItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall } from '@aws-sdk/util-dynamodb';
import { dynamoClient } from '../adapters/dynamodb';
import { logger } from '../utils/logger';

const client = dynamoClient;
const INCIDENTS_TABLE = process.env.INCIDENTS_TABLE ?? 'heatflood-incidents';

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  const incidentId = event.pathParameters?.id;
  if (!incidentId) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'MISSING_ID', detail: 'Incident ID path parameter is required' }),
    };
  }

  try {
    const existing = await client.send(new GetItemCommand({
      TableName: INCIDENTS_TABLE,
      Key: marshall({ incidentId }),
    }));

    if (!existing.Item) {
      return {
        statusCode: 404,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'NOT_FOUND', detail: `Incident ${incidentId} not found` }),
      };
    }

    const now = new Date().toISOString();
    await client.send(new UpdateItemCommand({
      TableName: INCIDENTS_TABLE,
      Key: marshall({ incidentId }),
      UpdateExpression: 'SET #s = :status, verifiedAt = :now, sourceType = :st',
      ExpressionAttributeNames: { '#s': 'status' },
      ExpressionAttributeValues: marshall({
        ':status': 'verified',
        ':now': now,
        ':st': 'moderator_verified',
      }),
    }));

    logger.info('verifyIncident succeeded', { incidentId });

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        incidentId,
        status: 'verified',
        verifiedAt: now,
        message: 'Incident verified successfully by moderator',
      }),
    };
  } catch (err) {
    logger.error('verifyIncident error', { incidentId, err });
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'INTERNAL_ERROR' }),
    };
  }
};
