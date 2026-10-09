from __future__ import annotations
import argparse
from pathlib import Path
import pandas as pd
from features import NUMERIC_FEATURES, FEATURE_VERSION

ap = argparse.ArgumentParser()
ap.add_argument("--data", required=True)
ap.add_argument("--out", required=True)
a = ap.parse_args()

df = pd.read_csv(a.data).sort_values("timestamp")
missing = [c for c in ["label", *NUMERIC_FEATURES] if c not in df.columns]
if missing:
    raise ValueError(f"Missing columns: {missing}")

Path(a.out).mkdir(parents=True, exist_ok=True)
n = len(df)
i1, i2 = int(n * 0.65), int(n * 0.80)
for name, chunk in [("train", df.iloc[:i1]), ("validation", df.iloc[i1:i2]), ("test", df.iloc[i2:])]:
    chunk[["label", *NUMERIC_FEATURES]].to_csv(Path(a.out) / f"{name}.csv", index=False, header=False)

print(f"feature_version={FEATURE_VERSION}")
print(f"wrote {n} rows to {a.out}")
