# Final ML Setup

## One-command Windows shortcut

From the repository root:

```powershell
powershell -ExecutionPolicy Bypass -File .\RUN_FINAL.ps1
```

This creates/uses the Python ML environment, installs ML dependencies, downloads real Mumbai weather when needed, builds the bounded dataset, trains XGBoost, runs local inference, then runs TypeScript typecheck and the unit-test suite.

## SageMaker

SageMaker requires AWS credentials and an IAM role. Configure:

```powershell
$env:ML_S3_BUCKET = "your-bucket"
$env:ML_SAGEMAKER_ROLE_ARN = "arn:aws:iam::<account>:role/<role>"
$env:ML_SAGEMAKER_ENDPOINT = "heatflood-rainfall-stress-v1"
$env:AWS_REGION = "ap-south-1"
```

Then:

```powershell
powershell -ExecutionPolicy Bypass -File .\RUN_FINAL.ps1 -DeploySageMaker
```

The script uploads train/validation/test data and starts SageMaker training. It prints the `MODEL_DATA` S3 URI. Review it before deploying the endpoint with `ml/sagemaker/deploy.py`.

## Scientific boundary

The current model target is a next-hour heavy-rain advisory, not timestamped street-flood ground truth. The ML signal is advisory/shadow only. Verified closures and hard hazards remain deterministic hard blocks.
