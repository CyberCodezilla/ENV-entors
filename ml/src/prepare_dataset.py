from __future__ import annotations
import argparse, json
from pathlib import Path
import pandas as pd
from features import build_weather_features, FEATURE_VERSION, NUMERIC_FEATURES


def make_samples(weather: pd.DataFrame, max_rows: int, threshold_mm: float) -> pd.DataFrame:
    """Build a leakage-safe next-hour heavy-rain dataset from historical weather.

    Label at time t is whether rainfall at t+1 exceeds threshold_mm. All model
    features are known at time t. This is a genuine forecasting task using
    observed historical weather, not fabricated street-flood labels.
    """
    df = build_weather_features(weather)
    df["target_rain_next_1h_mm"] = pd.to_numeric(df["rain_mm"], errors="coerce").shift(-1)
    df = df.dropna(subset=["target_rain_next_1h_mm"]).copy()
    df["label"] = (df["target_rain_next_1h_mm"] >= threshold_mm).astype(int)
    keep = ["timestamp", *NUMERIC_FEATURES, "target_rain_next_1h_mm", "label"]
    df = df[keep]
    if len(df) > max_rows:
        # Keep chronological coverage rather than taking the first N rows.
        idx = pd.Series(range(len(df))).sample(n=max_rows, random_state=42).sort_values().to_numpy()
        df = df.iloc[idx].sort_values("timestamp").reset_index(drop=True)
    return df


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--weather", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--max-rows", type=int, default=75_000)
    ap.add_argument("--threshold-mm", type=float, default=10.0)
    args = ap.parse_args()
    if args.max_rows < 1 or args.threshold_mm <= 0:
        raise ValueError("max rows must be positive and threshold must be > 0")

    weather = pd.read_csv(args.weather)
    df = make_samples(weather, args.max_rows, args.threshold_mm)
    missing = [c for c in NUMERIC_FEATURES + ["label", "timestamp"] if c not in df.columns]
    if missing:
        raise ValueError(f"Dataset missing required columns: {missing}")

    Path(args.out).parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(args.out, index=False)
    print(json.dumps({
        "featureVersion": FEATURE_VERSION,
        "rows": len(df),
        "positives": int(df.label.sum()),
        "negative": int((df.label == 0).sum()),
        "maxRows": args.max_rows,
        "target": "next_hour_heavy_rain",
        "thresholdMm": args.threshold_mm,
        "labelDefinition": "Observed historical rainfall in the next hourly interval; not street-flood ground truth",
    }, indent=2), flush=True)

if __name__ == "__main__":
    main()
