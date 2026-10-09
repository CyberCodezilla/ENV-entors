# SageMaker Lambda Adapter

The Lambda adapter is optional and fail-safe to the deterministic risk engine, never a path to a false "safe" result.

Environment variables:
- SAGEMAKER_ENABLED=true only after endpoint validation.
- SAGEMAKER_ENDPOINT_NAME=<endpoint>
- ML_MODEL_VERSION=xgb-rainfall-stress-v1
- ML_TIMEOUT_MS=800

The runtime payload uses the exact 10-column feature order in ml/feature_order.json:
1. rain_1h_mm
2. rain_3h_mm
3. relative_humidity_pct
4. apparent_temperature_c
5. hour_sin
6. hour_cos
7. dow_sin
8. dow_cos
9. month_sin
10. month_cos

On missing endpoint, timeout, AWS error, malformed response, or invalid probability, the adapter returns available=false. It does not fabricate a probability.

The ML signal is advisory and does not override deterministic flood risk, hard blocks, confidence rules, or route ranking.
