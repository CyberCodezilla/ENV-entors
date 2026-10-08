/**
 * GET /demo/scenarios/:id
 *
 * Returns a pre-set scenario fixture that the frontend sends straight
 * to POST /routes/analyse with isReplay=true.
 *
 * Available scenario IDs: heat | flood | compound
 *
 * Perf notes (optimised):
 *   - Scenario files are static — they never change at runtime.
 *     Previously fs.readFileSync + JSON.parse ran on every request.
 *     Now files are loaded ONCE at module initialisation into SCENARIO_CACHE
 *     as raw strings (no JSON.parse needed).
 *   - JSON.parse → JSON.stringify round-trip eliminated: the raw JSON string
 *     is stored and returned directly as the response body, saving a full
 *     object graph allocation per request.
 */
import { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import * as fs from 'fs';
import * as path from 'path';
import { logger } from '../utils/logger';

const SCENARIO_DIR = path.join(__dirname, '..', '..', '..', 'data', 'scenarios');
const VALID_IDS = ['heat', 'flood', 'compound'] as const;
type ScenarioId = typeof VALID_IDS[number];

const SCENARIO_CACHE = new Map<ScenarioId, string>();
for (const id of VALID_IDS) {
  try {
    const raw = fs.readFileSync(path.join(SCENARIO_DIR, `${id}.json`), 'utf8');
    SCENARIO_CACHE.set(id, raw);
  } catch (error) {
    logger.error('Failed to read scenario file', { id, error });
  }
}

const VALID_ID_SET = new Set<string>(VALID_IDS);

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  const id = event.pathParameters?.id ?? '';

  if (!VALID_ID_SET.has(id)) {
    return {
      statusCode: 404,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' },
      body: JSON.stringify({
        error: 'SCENARIO_NOT_FOUND',
        validIds: VALID_IDS,
      }),
    };
  }

  const raw = SCENARIO_CACHE.get(id as ScenarioId);
  if (!raw) {
    // File was missing at deploy time
    logger.error('getDemoScenario: file not found in cache', { id });
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' },
      body: JSON.stringify({ error: 'SCENARIO_READ_ERROR' }),
    };
  }

  logger.info('getDemoScenario served', { id });

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=300',
    },
    // Return raw string directly — no JSON.parse + JSON.stringify round-trip
    body: raw,
  };
};
