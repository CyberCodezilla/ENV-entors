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
    
    # Pre-compute spatial grid points and hotspot distances ONCE O(G * H)
    lat_grid = np.arange(19.09, 19.15 + 1e-9, 0.005)
    lon_grid = np.arange(72.81, 72.88 + 1e-9, 0.005)
    
    grid_lats = []
    grid_lons = []
    is_hotspots = []
    dist_m = []
    overlaps = []
    for lat in lat_grid:
        for lon in lon_grid:
            ds = [6371.0088*2*math.asin(math.sqrt(math.sin(math.radians((lat-a)/2))**2 + math.cos(math.radians(lat))*math.cos(math.radians(a))*math.sin(math.radians((lon-b)/2))**2)) for a,b in hot]
            dmin = min(ds) if ds else 999.0
            grid_lats.append(lat)
            grid_lons.append(lon)
            is_hotspots.append(dmin <= 0.35)
            dist_m.append(dmin * 1000)
            overlaps.append(int(dmin <= 0.25))

    num_w = len(weather)
    num_g = len(grid_lats)
    total_n = num_w * num_g

    # Pre-allocate contiguous numpy arrays for minimal memory overhead (< 60MB RAM)
    lats = np.tile(grid_lats, num_w)
    lons = np.tile(grid_lons, num_w)
    rain_1h = np.repeat(weather.rain_1h_mm.to_numpy(), num_g)
    rain_3h = np.repeat(weather.rain_3h_mm.to_numpy(), num_g)
    rain_fc_1h = np.zeros(total_n, dtype=np.float64)
    rel_hum = np.repeat(weather.relative_humidity_pct.to_numpy(), num_g)
    app_temp = np.repeat(weather.apparent_temperature_c.to_numpy(), num_g)
    distance_hotspot_m = np.tile(dist_m, num_w)
    hotspot_overlap = np.tile(overlaps, num_w)
    recent_report_count = np.zeros(total_n, dtype=np.int32)
    verified_report_count = np.zeros(total_n, dtype=np.int32)
    newest_report_age_min = np.full(total_n, -1.0, dtype=np.float64)
    hour_sin = np.repeat(weather.hour_sin.to_numpy(), num_g)
    hour_cos = np.repeat(weather.hour_cos.to_numpy(), num_g)
    dow_sin = np.repeat(weather.dow_sin.to_numpy(), num_g)
    dow_cos = np.repeat(weather.dow_cos.to_numpy(), num_g)
    month_sin = np.repeat(weather.month_sin.to_numpy(), num_g)
    month_cos = np.repeat(weather.month_cos.to_numpy(), num_g)

    # Vectorized label computation
    is_hotspot_arr = np.tile(is_hotspots, num_w)
    is_rainy_arr = np.repeat((weather.rain_1h_mm >= 10.0) | (weather.rain_3h_mm >= 25.0), num_g)
    is_extreme_rain_arr = np.repeat(weather.rain_1h_mm >= 35.0, num_g)
    labels = ((is_hotspot_arr & is_rainy_arr) | is_extreme_rain_arr).astype(np.int32)

    # Vectorized timestamps
    ts_strings = np.array([ts.isoformat() for ts in weather.timestamp], dtype=object)
    timestamps = np.repeat(ts_strings, num_g)

    return pd.DataFrame({
        "timestamp": timestamps, "lat": lats, "lon": lons,
        "rain_1h_mm": rain_1h, "rain_3h_mm": rain_3h, "rain_forecast_1h_mm": rain_fc_1h,
        "relative_humidity_pct": rel_hum, "apparent_temperature_c": app_temp,
        "distance_hotspot_m": distance_hotspot_m, "hotspot_overlap": hotspot_overlap,
        "recent_report_count": recent_report_count, "verified_report_count": verified_report_count,
        "newest_report_age_min": newest_report_age_min,
        "hour_sin": hour_sin, "hour_cos": hour_cos, "dow_sin": dow_sin, "dow_cos": dow_cos,
        "month_sin": month_sin, "month_cos": month_cos,
        "label": labels
    })


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
