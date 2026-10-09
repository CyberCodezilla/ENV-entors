# ML Integration Guide

## What is implemented

- XGBoost binary classifier with `rainfall-stress-v1` feature contract.
- Bounded dataset preparation (`250,000` rows by default) to prevent multi-GB CSV expansion.
- Chronological 65/15/20 train/validation/test split.
- Local XGBoost training with early stopping and imbalance handling.
- Local inference and metrics output.
- SageMaker built-in XGBoost training/deployment/invocation helpers.
- Lambda SageMaker Runtime adapter with an 800 ms application timeout and strict probability validation.
- Deterministic fallback when SageMaker is disabled, unavailable, times out, or returns invalid output.
- ML is an advisory/shadow signal only. Route ranking and hard safety decisions remain deterministic.
- Verified closures/hazards always remain hard blocks even if ML returns a low probability.

## Scientific boundary

The current repository does not contain a timestamped, street-segment flood ground-truth dataset. Therefore the current training label is a **next-hour heavy-rain advisory**, not a claim of time-specific observed flooding. Do not present its ROC-AUC as flood-prediction accuracy.

For a validated live flood predictor, replace the proxy label with timestamped trusted sensor or verified incident outcomes and evaluate with a temporal and, where possible, geographic holdout.

## Local one-command validation

From the repository root on Windows PowerShell:

```powershell
.\scripts\ml\run-final.ps1
```

This installs Python dependencies, downloads NASA POWER weather if needed, builds the bounded dataset, trains XGBoost, runs local inference, then runs TypeScript typecheck and the unit test suite.

## SageMaker deployment

Configure AWS credentials and these environment variables:

```powershell
$env:ML_S3_BUCKET = "your-training-bucket"
$env:ML_SAGEMAKER_ROLE_ARN = "arn:aws:iam::<account>:role/<sagemaker-role>"
$env:ML_SAGEMAKER_ENDPOINT = "heatflood-rainfall-stress-v1"
$env:AWS_REGION = "ap-south-1"
```

Then:

```powershell
.\scripts\ml\deploy-sagemaker.ps1
```

The training script uploads train/validation/test CSVs, starts a SageMaker XGBoost training job, and prints the resulting `MODEL_DATA` S3 URI. Review that URI before deploying the endpoint.

After deployment, configure the Lambda environment:

```text
SAGEMAKER_ENABLED=true
SAGEMAKER_ENDPOINT_NAME=heatflood-rainfall-stress-v1
ML_MODEL_VERSION=xgb-rainfall-stress-v1
ML_TIMEOUT_MS=800
```

The Lambda execution role needs only `sagemaker:InvokeEndpoint` for the specific endpoint.

## Safety contract

```text
Verified closure / hard hazard
            ↓
          BLOCK
            ↓
Deterministic flood + heat + confidence engine
            ↓
      Optional ML signal
            ↓
      Route ranking / UI
```

ML must never convert a hard-blocked route into a viable route.
