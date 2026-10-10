import type { Handler } from 'aws-lambda';
import { DynamoDBClient, UpdateItemCommand } from '@aws-sdk/client-dynamodb';
import { logger } from '../utils/logger';
const db = new DynamoDBClient({});
type Detail = { runId?: string; scenarioId?: string; generatedAt?: string; riskLevel?: string; simulated?: boolean };
export const handler: Handler<Detail, { processed: boolean; runId?: string }> = async (detail) => {
  if (!detail?.runId || !detail.generatedAt || detail.simulated !== true) throw new Error('Invalid or non-simulated scenario event');
  const table = process.env.SCENARIO_RUNS_TABLE;
  if (!table) throw new Error('SCENARIO_RUNS_TABLE is not configured');
  try {
    await db.send(new UpdateItemCommand({ TableName: table, Key: { runId: { S: detail.runId } }, UpdateExpression: 'SET workflowStatus = :status, workflowProcessedAt = :at', ConditionExpression: 'attribute_exists(runId)', ExpressionAttributeValues: { ':status': { S: 'PROCESSED' }, ':at': { S: new Date().toISOString() } } }));
    logger.info('scenario workflow processed', { runId: detail.runId, scenarioId: detail.scenarioId });
    return { processed: true, runId: detail.runId };
  } catch (error) { logger.error('scenario workflow task failed', { runId: detail.runId, error }); throw error; }
};
