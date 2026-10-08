#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../../ml"
python3 -m venv .venv 2>/dev/null || true
source .venv/bin/activate
pip install -r requirements.txt
python src/fetch_real_data.py --out data/raw/mumbai_weather.csv
python src/prepare_dataset.py --weather data/raw/mumbai_weather.csv --hotspots ../data/hotspots.json --out data/processed/dataset.csv
python src/train_local.py --data data/processed/dataset.csv --out artifacts/xgb
cat artifacts/xgb/metrics.json
