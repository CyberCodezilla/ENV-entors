from __future__ import annotations
import json, math, argparse
from pathlib import Path
import pandas as pd
import numpy as np
from features import build_weather_features, FEATURE_VERSION

ROOT = Path(__file__).resolve().parents[1]


def make_samples(weather: pd.DataFrame, hotspots: list[dict]) -> pd.DataFrame:
    weather = build_weather_features(weather)
    hot = [(float(x["lat"]), float(x["lon"])) for x in hotspots]
    rows = []
    # Build a spatial grid over the pilot area. Positive labels come from the real documented hotspot list.
    # Fixed pilot grid. Historical NASA POWER weather is sampled at the pilot centroid; spatial variation comes from hotspot proximity.
    lat_grid = np.arange(19.09, 19.15 + 1e-9, 0.005)
    lon_grid = np.arange(72.81, 72.88 + 1e-9, 0.005)
    for _, w in weather.iterrows():
        for lat in lat_grid:
            for lon in lon_grid:
                ds = [6371.0088*2*math.asin(math.sqrt(math.sin(math.radians((lat-a)/2))**2 + math.cos(math.radians(lat))*math.cos(math.radians(a))*math.sin(math.radians((lon-b)/2))**2)) for a,b in hot]
                dmin = min(ds) if ds else 999.0
                is_hotspot = dmin <= 0.35
                is_rainy = (w.rain_1h_mm >= 10.0 or w.rain_3h_mm >= 25.0)
                is_extreme_rain = w.rain_1h_mm >= 35.0
                label = int((is_hotspot and is_rainy) or is_extreme_rain)
                rows.append({
                    "timestamp": w.timestamp.isoformat(), "lat": lat, "lon": lon,
                    "rain_1h_mm": w.rain_1h_mm, "rain_3h_mm": w.rain_3h_mm, "rain_forecast_1h_mm": 0.0,
                    "relative_humidity_pct": w.relative_humidity_pct, "apparent_temperature_c": w.apparent_temperature_c,
                    "distance_hotspot_m": dmin*1000, "hotspot_overlap": int(dmin <= 0.25),
                    "recent_report_count": 0, "verified_report_count": 0, "newest_report_age_min": -1.0,
                    "hour_sin": w.hour_sin, "hour_cos": w.hour_cos, "dow_sin": w.dow_sin, "dow_cos": w.dow_cos,
                    "month_sin": w.month_sin, "month_cos": w.month_cos,
                    "label": label
                })
    return pd.DataFrame(rows)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--weather", required=True)
    ap.add_argument("--hotspots", required=True)
    ap.add_argument("--out", required=True)
    args = ap.parse_args()
    weather = pd.read_csv(args.weather)
    hotspots_obj = json.loads(Path(args.hotspots).read_text())
    hotspots = hotspots_obj.get('hotspots', hotspots_obj)
    df = make_samples(weather, hotspots)
    Path(args.out).parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(args.out, index=False)
    print(json.dumps({"featureVersion": FEATURE_VERSION, "rows": len(df), "positives": int(df.label.sum()), "negative": int((df.label==0).sum())}, indent=2))

if __name__ == "__main__": main()
