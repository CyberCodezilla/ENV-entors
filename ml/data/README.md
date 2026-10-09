# 📊 Machine Learning Dataset & Feature Specifications

This document describes the data sources, spatial feature representations, and data policy for the HeatFlood Guardian flood susceptibility machine learning model.

---

## 🌐 Data Sources

1. **Weather Data (NASA POWER API):**
   - Hourly historical meteorology for Mumbai pilot coordinates (`19.12° N, 72.85° E`).
   - Parameters:
     - `PRECTOTCORR`: Precipitation corrected (mm/hour)
     - `T2M`: Temperature at 2 Meters (°C)
     - `RH2M`: Relative Humidity at 2 Meters (%)

2. **Spatial Flood Hotspots:**
   - Sourced from documented Mumbai flood hotspots ([data/hotspots.json](../../data/hotspots.json)).
   - Represents historical locations prone to heavy waterlogging (Andheri Underpass, SV Road, Link Road, Versova).

---

## 📐 Input Feature Schema (`FEATURE_VERSION = "v1"`)

The model consumes **16 numerical features** for every road segment point:

| Feature Name | Type | Description |
|---|---|---|
| `rain_1h_mm` | Float | Total rainfall in past 1 hour (mm) |
| `rain_3h_mm` | Float | Accumulated rainfall in past 3 hours (mm) |
| `rain_forecast_1h_mm` | Float | Projected rainfall forecast for upcoming 1 hour (mm) |
| `relative_humidity_pct` | Float | Relative humidity (%) |
| `apparent_temperature_c` | Float | Apparent feels-like temperature (°C) |
| `distance_hotspot_m` | Float | Distance to closest documented flood hotspot (meters) |
| `hotspot_overlap` | Binary | 1 if point lies within 250m hotspot radius; 0 otherwise |
| `recent_report_count` | Int | Crowd-sourced hazard reports within 500m in past 2 hours |
| `verified_report_count` | Int | Official / corroborated incident reports in past 2 hours |
| `newest_report_age_min` | Float | Minutes since most recent hazard report |
| `hour_sin`, `hour_cos` | Float | Cyclical sine/cosine transformation of hour of day (24h) |
| `dow_sin`, `dow_cos` | Float | Cyclical sine/cosine transformation of day of week (7d) |
| `month_sin`, `month_cos` | Float | Cyclical sine/cosine transformation of month of year (12m) |

---

## ⚡ Data Preparation & Performance

- **Script:** `ml/src/prepare_dataset.py`
- **Memory Optimization:** Uses pre-allocated contiguous 1D numpy arrays (`np.tile`, `np.repeat`), reducing RAM usage from 4.5 GB to **< 60 MB**.
- **Execution Speed:** Vectorized grid computations drop processing time from 4.5 minutes to **< 1.5 seconds**.

---

## ⚖️ Real-Data & Ethical Policy

- Proxy spatial waterlogging susceptibility labels are built from documented hotspot locations + historical NASA weather events.
- This model evaluates **relative spatial risk susceptibility**.
- For production live event prediction, replace proxy labels with timestamped sensor or official MCGM incident logs using the same 16-feature contract interface.
