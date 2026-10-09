# SageMaker Lambda Adapter

The Lambda adapter is optional and fail-open to the deterministic risk engine, never fail-open to a false "safe" result.

Environment variables:

- `SAGEMAKER_ENABLED=true` only in staging/production after endpoint validation.
- `SAGEMAKER_ENDPOINT_NAME=<endpoint>`
- `ML_MODEL_VERSION=xgb-rainfall-stress-v1`
- `ML_TIMEOUT_MS=800`

The runtime payload uses the exact 16-column feature order in `ml/feature_order.json`.

On missing endpoint, timeout, AWS error, malformed response, or invalid probability, the adapter returns `available=false`. It does not fabricate a probability.

The ML signal is exposed as `segment.mlSignal` for observability/UI. It does not change `floodRisk`, `hardBlock`, `hasConfidentRecommendation`, or route ranking.
