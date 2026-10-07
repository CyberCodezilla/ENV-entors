/**
 * GET /demo/scenarios/:id
 *
 * Returns a clearly labelled deterministic replay input.
 * Scenario IDs: 'heat', 'flood', 'compound'
 * These are static fixtures — they never depend on live APIs.
 */
import { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import { DEMO_SCENARIOS } from '../stubs/demoScenarios';

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  const id = event.pathParameters?.id ?? '';
  const scenario = DEMO_SCENARIOS[id];

  if (!scenario) {
    return {
      statusCode: 404,
      body: JSON.stringify({
        error: 'SCENARIO_NOT_FOUND',
        available: Object.keys(DEMO_SCENARIOS),
      }),
    };
  }

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...scenario,
      _demo: true,
      _label: 'HISTORICAL / DEMO SCENARIO — NOT LIVE DATA',
    }),
  };
};
