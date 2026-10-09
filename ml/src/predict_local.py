from __future__ import annotations
import argparse, json
from pathlib import Path
import pandas as pd
import xgboost as xgb
from features import NUMERIC_FEATURES, FEATURE_VERSION

p = argparse.ArgumentParser()
p.add_argument("--model", required=True)
p.add_argument("--json", required=True)
a = p.parse_args()

model = xgb.XGBClassifier()
model.load_model(a.model)
obj = json.loads(Path(a.json).read_text(encoding="utf-8"))
row = pd.DataFrame([obj]).reindex(columns=NUMERIC_FEATURES).replace([float("inf"), float("-inf")], float("nan")).fillna(-1)
prob = float(model.predict_proba(row)[:, 1][0])
print(json.dumps({
    "available": True,
    "probability": prob,
    "modelVersion": "xgb-rainfall-stress-v1",
    "featureVersion": FEATURE_VERSION,
}))
