from __future__ import annotations
import numpy as np
import pandas as pd

NUMERIC_FEATURES = [
    "rain_1h_mm", "rain_3h_mm", "rain_forecast_1h_mm", "relative_humidity_pct", "apparent_temperature_c",
    "distance_hotspot_m", "hotspot_overlap", "recent_report_count", "verified_report_count", "newest_report_age_min",
    "hour_sin", "hour_cos", "dow_sin", "dow_cos", "month_sin", "month_cos"
]
FEATURE_VERSION = "flood-susceptibility-v2"

def cyclical(series: pd.Series, period: float):
    x = 2*np.pi*series/period
    return np.sin(x), np.cos(x)

def build_weather_features(df: pd.DataFrame) -> pd.DataFrame:
    out = df.copy()
    out["timestamp"] = pd.to_datetime(out["timestamp"], utc=True)
    out = out.sort_values("timestamp").reset_index(drop=True)
    rain = pd.to_numeric(out["rain_mm"], errors="coerce")
    rain = rain.where(rain.notna(), np.nan)
    out["rain_1h_mm"] = rain.fillna(-1).clip(lower=0)
    out["rain_3h_mm"] = rain.rolling(3, min_periods=1).sum().fillna(-1)
    out["rain_forecast_1h_mm"] = -1.0
    out["relative_humidity_pct"] = pd.to_numeric(out.get("humidity_pct", pd.Series(index=out.index, dtype=float)), errors="coerce").fillna(-1)
    out["apparent_temperature_c"] = pd.to_numeric(out.get("temperature_c", pd.Series(index=out.index, dtype=float)), errors="coerce").fillna(-999)
    h = out["timestamp"].dt.hour + out["timestamp"].dt.minute/60.0
    d = out["timestamp"].dt.dayofweek
    m = out["timestamp"].dt.month
    out["hour_sin"], out["hour_cos"] = cyclical(h, 24)
    out["dow_sin"], out["dow_cos"] = cyclical(d, 7)
    out["month_sin"], out["month_cos"] = cyclical(m, 12)
    return out
