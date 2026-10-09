# HeatFlood Guardian ML

This module provides an advisory **rainfall-stress** model for the HeatFlood Guardian route engine.

## Model
- XGBoost binary classifier.
- Target: next-hour rainfall >= 10 mm.
- Features are available at prediction time: recent rain, humidity, apparent temperature, and cyclical time features.
- No hotspot-derived features are used by the model, preventing the previous hotspot-label leakage.
- Chronological 65/15/20 split.
- Class imbalance handling and early stopping.
- Validation-only decision-threshold tuning.

## Scientific boundary
This model does not predict street flooding. It predicts near-term heavy rainfall from historical weather. The deterministic flood engine remains authoritative for route decisions.

## Local setup
```powershell
cd ml
python -m venv .venv
.\.venv\Scripts\python -m pip install -r requirements.txt
python src\fetch_real_data.py --out data\raw\mumbai_weather.csv
python src\prepare_dataset.py --weather data\raw\mumbai_weather.csv --out data\processed\dataset.csv --max-rows 75000 --threshold-mm 10
python src\train_local.py --data data\processed\dataset.csv --out artifacts\xgb
python src\predict_local.py --model artifacts\xgb\model.json --json feature-order-example.json
```

Metrics are saved to `artifacts/xgb/metrics.json`.
