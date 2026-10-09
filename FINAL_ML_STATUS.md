# HeatFlood Guardian — Final ML status

## Complete
- Real Mumbai hourly weather ingestion via NASA POWER.
- Leakage-safe one-hour-ahead rainfall target (>=10 mm).
- No hotspot-derived features in the ML model.
- Chronological 65/15/20 train/validation/test split.
- XGBoost with class weighting and early stopping.
- Validation-only threshold tuning.
- Local inference smoke test.
- SageMaker training/deployment/invocation helpers.
- Lambda SageMaker adapter with exact 10-feature contract, strict timeout and invalid-response fallback.
- Live Lambda route handler passes the SageMaker provider when enabled.
- ML remains advisory/non-blocking; deterministic flood rules and verified hard blocks remain authoritative.
- TypeScript typecheck and unit tests are included in the final runner.

## Scientific boundary
The bundled ML model predicts next-hour heavy rainfall from historical weather. It is a **rainfall-stress advisory**, not a validated street-flood predictor. Its probability must never be described as the probability that a road will flood.

The deterministic engine combines the ML signal with current weather, hotspots and verified/community evidence. If timestamped segment-level flood labels become available, they can replace the rainfall target in a future dedicated flood model.

## AWS boundary
A real SageMaker endpoint still requires the operator's AWS account, IAM role, S3 bucket and credentials. The deployment code is included, but no cloud resource is created automatically.

## Quick start
Run `RUN_FINAL.cmd`. It creates/uses the Python environment, installs dependencies, downloads real weather if absent, builds the bounded leakage-safe dataset, trains XGBoost, runs local inference, and executes TypeScript/tests.
