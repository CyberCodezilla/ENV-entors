# Disaster Response Command Center

## Scope

This module is additive. It does not replace existing route analysis, map behavior, incident reporting, replay scenarios, or SageMaker risk inference. Every command-center scenario is synthetic. Recommendations are advisory and require human review.

## API contract

### `POST /scenarios/run`

Example request:

```json
{
  "scenarioId": "cloudburst",
  "rainfallMm": 32,
  "apparentTempC": 29,
  "blockedRoads": 2,
  "unavailableShelters": 0,
  "exposedPeople": 1800,
  "forceDegraded": false
}
```

Valid scenario IDs: `cloudburst`, `heat`, `blocked-road`, `compound`. Numeric inputs are clamped to documented safe ranges. The response includes a trace ID, generation timestamp, `simulated: true`, risk indices, provenance, uncertainty, ranked recommendations, response brief, and persistence/event status. The `forceDegraded` switch is for demo/testing and only selects deterministic fallback labeling; it does not disable the deterministic engine.

### `GET /scenarios/history`

Returns up to 10 recent records when DynamoDB is available. A successful scenario assessment can still return when persistence or event publication fails, but the response explicitly reports that state. Local browser fallback is never represented as a durable audit record.

## Event workflow

The request Lambda performs validation, deterministic assessment, response-brief generation, and the initial audit write synchronously. Only after the audit row is successfully persisted, it publishes `HeatFloodScenarioAssessed` to a stage-specific EventBridge bus. A rule starts a Step Functions Standard workflow. The workflow rejects events that are not explicitly marked simulated and invokes `scenarioWorkflowTask` to mark the existing audit row `PROCESSED`. Transient Lambda service errors are retried up to three times. The `runId` is the idempotency key for the initial write; a duplicate initial write is not allowed. Workflow updates are safe to repeat.

## Observability and limitations

Lambda structured logs report trace ID, scenario ID, latency, persistence, event publication, and degraded mode. CloudWatch Lambda metrics provide invocation/error/duration monitoring. The module does not claim real-time data freshness, verified road status, authoritative shelter availability, or a validated population estimate. No Bedrock model is called; the response brief is deterministic and grounded only in the supplied synthetic scenario assumptions.

## Acceptance checks

1. Run all four presets from the UI without editing code.
2. Confirm baseline and scenario indices differ for the selected hazards.
3. Confirm each response says `simulated: true`, includes provenance and uncertainty, and requires human review.
4. Trigger the ML-outage simulation and confirm deterministic output continues with degraded status.
5. Inspect DynamoDB for the scenario row and verify EventBridge/Step Functions updates workflow status to `PROCESSED`.
6. Stop the API or build without an API base URL and confirm local fallback clearly says no durable audit was written.
7. Verify mobile layout, API failure behavior, `npm ci`, Lambda build/typecheck/unit tests, frontend static build, `sam validate`, and deployed smoke tests.
8. Measure p50/p95 latency and cost from real runs; do not fill these with estimates presented as observed metrics.
