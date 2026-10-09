# HeatFlood Guardian ML

Drop-in ML module for the existing HeatFlood Guardian monorepo.

What is implemented:
- Real Mumbai weather acquisition from NASA POWER.
- Reproducible spatial hotspot susceptibility dataset builder using the repo's documented Mumbai hotspots.
- Leakage-safe chronological train/validation/test split.
- Imbalance-aware XGBoost binary classifier with early stopping.
- Local model training and inference.
- SageMaker AI built-in XGBoost training, deployment and invocation helpers.
- TypeScript Lambda SageMaker adapter with strict timeout, response validation and rule-engine fallback.
- Feature versioning and model metadata.

Important scientific boundary:
The currently available public sources do not provide a clean timestamped street-segment waterlogging ground-truth table for the exact live prediction target. The supplied pipeline therefore trains a spatial waterlogging-susceptibility proxy from documented Mumbai hotspot observations plus real historical weather. This is useful as an ML engineering demonstration, but its probability must NOT be described as the probability a specific road will flood at a future time.

For a validated live event predictor, replace the proxy labels with timestamped trusted-sensor or moderator-verified incident outcomes and rebuild the dataset with the same feature interface.

## Local setup

Windows PowerShell:

```powershell
cd ml
python -m venv .venv
.\.venv\Scripts\python -m pip install -r requirements.txt
python src\fetch_data_manifest.py
python src\fetch_real_data.py --out data\raw\mumbai_weather.csv
python src\prepare_dataset.py --weather data\raw\mumbai_weather.csv --hotspots ..\data\hotspots.json --out data\processed\dataset.csv
python src\train_local.py --data data\processed\dataset.csv --out artifacts\xgb
```

Ubuntu/macOS:

```bash
cd ml
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python src/fetch_data_manifest.py
python src/fetch_real_data.py --out data/raw/mumbai_weather.csv
python src/prepare_dataset.py --weather data/raw/mumbai_weather.csv --hotspots ../data/hotspots.json --out data/processed/dataset.csv
python src/train_local.py --data data/processed/dataset.csv --out artifacts/xgb
```

The exact trained metrics are saved in `artifacts/xgb/metrics.json`. Do not treat proxy metrics as evidence of live flood-prediction accuracy.

## SageMaker path

1. Upload headerless CSV files with label as first column to S3.
2. Run:

```bash
python ml/sagemaker/train.py --bucket <BUCKET> --role <SAGEMAKER_ROLE> --region ap-south-1
```

3. Deploy the resulting `model.tar.gz`:

```bash
python ml/sagemaker/deploy.py --model-data <S3_MODEL_TAR_GZ> --role <SAGEMAKER_ROLE> --endpoint heatflood-xgb-v2
```

4. Configure Lambda:

```text
SAGEMAKER_ENABLED=true
SAGEMAKER_ENDPOINT_NAME=heatflood-xgb-v2
ML_MODEL_VERSION=xgb-flood-susceptibility-v2
ML_TIMEOUT_MS=800
```

For SageMaker's built-in XGBoost CSV contract, the label is the first column and CSV training files must not contain a header. The deployment should remain optional and staged first. citeturn612419search0turn612419search4

## Production rule

SageMaker produces one ML signal. Lambda keeps the final route decision, hard blocks, confidence and no-confident-route state. Endpoint error, timeout, invalid output or version mismatch returns `available=false`; it does not turn into a low-risk result.
