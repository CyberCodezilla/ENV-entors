/**
 * GET /demo/scenarios/:id — Day 4
 *
 * Returns a pre-set scenario fixture that the frontend sends straight
 * to POST /routes/analyse with isReplay=true.
 *
 * The _weatherOverride and _incidentOverrides fields are read by
 * analyseRoutes when isReplay=true to inject fixture data instead
 * of calling external APIs.
 *
 * Available scenario IDs: heat | flood | compound
 */
import { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import * as fs from 'fs';
import * as path from 'path';
import { logger } from '../utils/logger';

const SCENARIO_DIR = path.join(__dirname, '..', '..', '..', 'data', 'scenarios');
const VALID_IDS = new Set(['heat', 'flood', 'compound']);

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  const id = event.pathParameters?.id ?? '';

  if (!VALID_IDS.has(id)) {
    return {
      statusCode: 404,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error: 'SCENARIO_NOT_FOUND',
        validIds: [...VALID_IDS],
      }),
    };
  }

  try {
    const filePath = path.join(SCENARIO_DIR, `${id}.json`);
    const raw = fs.readFileSync(filePath, 'utf8');
    const scenario = JSON.parse(raw);

    logger.info('getDemoScenario served', { id });

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=300', // 5 min CDN cache
      },
      body: JSON.stringify(scenario),
    };
  } catch (err) {
    logger.error('getDemoScenario read error', { id, err });
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'SCENARIO_READ_ERROR' }),
    };
  }
};
