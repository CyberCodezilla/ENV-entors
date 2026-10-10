import type { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import { randomUUID } from 'node:crypto';
import { DynamoDBClient, PutItemCommand, QueryCommand } from '@aws-sdk/client-dynamodb';
import { EventBridgeClient, PutEventsCommand } from '@aws-sdk/client-eventbridge';
import { logger } from '../utils/logger';

type ScenarioId = 'cloudburst' | 'heat' | 'blocked-road' | 'compound';
type Input = { scenarioId?: ScenarioId; rainfallMm?: number; apparentTempC?: number; blockedRoads?: number; unavailableShelters?: number; exposedPeople?: number; forceDegraded?: boolean };
const presets: Record<ScenarioId, Omit<Required<Input>, 'scenarioId'|'forceDegraded'>> = {
  cloudburst: { rainfallMm: 32, apparentTempC: 29, blockedRoads: 2, unavailableShelters: 0, exposedPeople: 1800 },
  heat: { rainfallMm: 0, apparentTempC: 42, blockedRoads: 0, unavailableShelters: 1, exposedPeople: 2400 },
  'blocked-road': { rainfallMm: 8, apparentTempC: 34, blockedRoads: 1, unavailableShelters: 0, exposedPeople: 950 },
  compound: { rainfallMm: 18, apparentTempC: 39, blockedRoads: 3, unavailableShelters: 1, exposedPeople: 3100 },
};
const bounded = (v: unknown, fallback: number, min: number, max: number) => typeof v === 'number' && Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : fallback;
const db = new DynamoDBClient({}); const events = new EventBridgeClient({});
const table = () => process.env.SCENARIO_RUNS_TABLE;
export function assessScenario(input: Input, forceDegraded = false) {
  const id = input.scenarioId && Object.prototype.hasOwnProperty.call(presets, input.scenarioId) ? input.scenarioId : 'cloudburst';
  const d = presets[id];
  const rainfallMm = bounded(input.rainfallMm, d.rainfallMm, 0, 250);
  const apparentTempC = bounded(input.apparentTempC, d.apparentTempC, -20, 65);
  const blockedRoads = Math.round(bounded(input.blockedRoads, d.blockedRoads, 0, 100));
  const unavailableShelters = Math.round(bounded(input.unavailableShelters, d.unavailableShelters, 0, 100));
  const exposedPeople = Math.round(bounded(input.exposedPeople, d.exposedPeople, 0, 10000000));
  const flood = Math.min(100, Math.round(rainfallMm * 2.4 + blockedRoads * 12));
  const heat = Math.min(100, Math.max(0, Math.round((apparentTempC - 22) * 4.4)));
  const composite = Math.min(100, Math.round(flood * .55 + heat * .45 + unavailableShelters * 8));
  const level = composite >= 75 ? 'CRITICAL' : composite >= 55 ? 'HIGH' : composite >= 30 ? 'MODERATE' : 'LOW';
  const generatedAt = new Date().toISOString(); const traceId = randomUUID();
  return { runId: traceId, traceId, scenarioId: id, generatedAt, simulated: true, inputs: { rainfallMm, apparentTempC, blockedRoads, unavailableShelters, exposedPeople }, indices: { flood, heat, composite, level }, provenance: [
    { field: 'rainfallMm', source: 'synthetic scenario parameter', status: 'simulated' }, { field: 'apparentTempC', source: 'synthetic scenario parameter', status: 'simulated' }, { field: 'blockedRoads', source: 'scenario assumption; not a verified closure', status: 'simulated' }, { field: 'exposedPeople', source: 'illustrative planning estimate', status: 'simulated' }
  ], uncertainty: ['Scenario parameters are synthetic and not live observations.', 'No official road, shelter-capacity, or population feed was queried.', 'Human verification is required before any operational decision.'], engine: forceDegraded ? 'deterministic-fallback-ml-unavailable' : 'deterministic-scenario-engine', degraded: forceDegraded, humanReviewRequired: true,
  recommendations: [
    { priority: 1, action: 'Verify road closures and current access with an authoritative source.', rationale: `${blockedRoads} road segment(s) are assumed blocked.` },
    { priority: 2, action: apparentTempC >= 36 ? 'Prioritize exposed people and confirm cooling-site availability.' : 'Prioritize low-lying locations and confirm flood reports.', rationale: apparentTempC >= 36 ? `Simulated apparent temperature is ${apparentTempC}°C.` : `Simulated rainfall input is ${rainfallMm} mm.` },
    { priority: 3, action: 'Require operator review before publishing guidance or dispatching resources.', rationale: 'This is a simulation, not verified operational intelligence.' }
  ] };
}
const response = (statusCode: number, payload: unknown) => ({ statusCode, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify(payload) });
export const handler: APIGatewayProxyHandlerV2 = async event => {
  const method = event.requestContext?.http?.method ?? 'POST';
  const requestId = event.requestContext?.requestId ?? randomUUID();
  if (method === 'GET' && event.rawPath.endsWith('/scenarios/history')) {
    if (!table()) return response(200, { runs: [], persisted: false, warning: 'SCENARIO_RUNS_TABLE is not configured.' });
    try { const result = await db.send(new QueryCommand({ TableName: table(), IndexName: 'partitionKey-generatedAt-index', KeyConditionExpression: 'partitionKey = :pk', ExpressionAttributeValues: { ':pk': { S: 'SCENARIO_RUNS' } }, ScanIndexForward: false, Limit: 10 }));
      const runs = (result.Items ?? []).map(item => { const read=(k:string)=>item[k]?.S ?? ''; return { runId: read('runId'), scenarioId: read('scenarioId'), generatedAt: read('generatedAt'), indices: { level: read('riskLevel') }, workflowStatus: read('workflowStatus') }; }); return response(200, { runs, persisted: true });
    } catch (error) { logger.warn('scenario history unavailable', { requestId, error }); return response(200, { runs: [], persisted: false, warning: 'Audit history is temporarily unavailable.' }); }
  }
  let input: Input = {};
  if (event.body) { try { input = JSON.parse(event.body) as Input; } catch { return response(400, { error: 'INVALID_JSON', requestId }); } }
  if (input.scenarioId && !Object.prototype.hasOwnProperty.call(presets, input.scenarioId)) return response(400, { error: 'INVALID_SCENARIO_ID', validScenarioIds: Object.keys(presets), requestId });
  const started = Date.now(); const forceDegraded = input.forceDegraded === true || process.env.INNOVATION_FORCE_DEGRADED === 'true'; const result = assessScenario(input, forceDegraded);
  let persisted = false; let eventPublished = false;
  if (table()) {
    try { await db.send(new PutItemCommand({ TableName: table(), Item: { runId: { S: result.runId }, partitionKey: { S: 'SCENARIO_RUNS' }, generatedAt: { S: result.generatedAt }, scenarioId: { S: result.scenarioId }, riskLevel: { S: result.indices.level }, workflowStatus: { S: 'PENDING' }, payloadJson: { S: JSON.stringify(result) }, ttlEpoch: { N: String(Math.floor(Date.now()/1000)+60*60*24*90) } }, ConditionExpression: 'attribute_not_exists(runId)' })); persisted = true; }
    catch (error) { logger.warn('scenario audit persistence failed; returning deterministic result', { requestId, traceId: result.traceId, error }); }
  }
  if (persisted && process.env.SCENARIO_EVENT_BUS_ARN) {
    try { const out = await events.send(new PutEventsCommand({ Entries: [{ EventBusName: process.env.SCENARIO_EVENT_BUS_ARN, Source: 'heatflood.guardian', DetailType: 'HeatFloodScenarioAssessed', Time: new Date(result.generatedAt), Detail: JSON.stringify({ runId: result.runId, scenarioId: result.scenarioId, generatedAt: result.generatedAt, riskLevel: result.indices.level, simulated: true }) }] })); eventPublished = (out.FailedEntryCount ?? 0) === 0; }
    catch (error) { logger.warn('scenario event publish failed; synchronous result remains available', { requestId, traceId: result.traceId, error }); }
  }
  logger.info('scenario assessed', { requestId, traceId: result.traceId, scenarioId: result.scenarioId, latencyMs: Date.now()-started, persisted, eventPublished, degraded: result.degraded });
  return response(200, { ...result, requestId, audit: { persisted, eventPublished, workflowStatus: persisted && eventPublished ? 'PENDING' : 'NOT_CONFIRMED' }, responseBrief: { headline: `${result.indices.level} simulated composite risk`, priorityActions: result.recommendations.map(r=>r.action), evidence: result.provenance, uncertainties: result.uncertainty, label: 'Deterministic response brief — human review required' } });
};
