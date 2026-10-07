# Feature Schema v1 — XGBoost flood-segment prediction

> **Version:** `flood-segment-v1`  
> **Owner:** Day 5 ML teammate (Member C)  
> **Prepared by:** Member A on Day 4  
> **Status:** Frozen for ML handoff

---

## Prediction Target

**Is waterlogging actively observed at this route segment during the expected arrival time window?**

- Binary classification: `1 = waterlogging observed`, `0 = not observed`.
- "Observed" requires a moderator-verified report, a trusted sensor reading, or an official closure — not inferred from rainfall alone.
- Time window: the 60-minute window centred on the estimated segment arrival time.

## Feature Table

| # | Field name | Type | Unit | Missing value | Notes |
|---|---|---|---|---|---|
| 1 | `rainfall_recent_1h_mm` | float | mm | `-1` | Preceding-hour precipitation from Open-Meteo |
| 2 | `rainfall_recent_3h_mm` | float | mm | `-1` | Sum of 3 preceding hourly values |
| 3 | `rainfall_forecast_1h_mm` | float | mm | `-1` | Forecast hour covering segment arrival time |
| 4 | `relative_humidity_pct` | float | % | `-1` | Open-Meteo relative humidity at arrival time |
| 5 | `apparent_temperature_c` | float | °C | `-999` | Open-Meteo apparent temperature at arrival time |
| 6 | `hotspot_distance_m` | float | metres | `-1` | Haversine distance to nearest curated hotspot; `-1` if none within 1 km |
| 7 | `hotspot_overlap` | int | 0 or 1 | `0` | 1 if segment midpoint is inside a hotspot polygon |
| 8 | `recent_report_count` | int | count | `0` | Number of active non-expired unverified reports within 200 m of segment |
| 9 | `verified_report_count` | int | count | `0` | Number of active moderator-verified reports within 200 m |
| 10 | `newest_report_age_min` | float | minutes | `-1` | Age of newest active report; `-1` if none |
| 11 | `hour_of_day` | int | 0–23 | required | Local IST hour at estimated segment arrival |
| 12 | `day_of_week` | int | 0–6 | required | 0 = Monday |
| 13 | `month` | int | 1–12 | required | Calendar month (seasonality proxy) |
| 14 | `location_geohash5` | string (categorical) | — | `"unknown"` | Geohash precision 5 (~5 km²); encode as integer or one-hot only if training data has sufficient coverage per cell |

## Critical Rules for the Feature Builder

1. **No future leakage.** Only use reports and observations with `observedAt < predictionTimeUtc`.
2. **Rainfall semantics.** Open-Meteo `precipitation` is the sum for the **preceding** hour. Do not mix it with instantaneous apparent temperature in the same time bucket.
3. **Missing ≠ zero.** Missing rain, sensor or report data must use the sentinel values above — never fill with `0` which implies "no rain" or "no reports".
4. **Feature version must match.** The inference endpoint must reject payloads where `featureVersion != "flood-segment-v1"`.
5. **Location encoding.** Use `location_geohash5` only if the training set covers enough distinct cells. If fewer than 10 examples per cell, drop this feature or use a coarser geohash.
6. **Train/val/test split by time.** Never use random row shuffling across time. Hold out the most recent time period for testing. Hold out at least one spatial area if data volume permits.

## Sample Feature Row (JSON)

```json
{
  "featureVersion": "flood-segment-v1",
  "predictionTimeUtc": "2026-07-18T08:30:00Z",
  "segmentId": "seg_abc123",
  "rainfall_recent_1h_mm": 12.4,
  "rainfall_recent_3h_mm": 31.2,
  "rainfall_forecast_1h_mm": 8.0,
  "relative_humidity_pct": 91.0,
  "apparent_temperature_c": 34.5,
  "hotspot_distance_m": 85.0,
  "hotspot_overlap": 1,
  "recent_report_count": 2,
  "verified_report_count": 0,
  "newest_report_age_min": 12.0,
  "hour_of_day": 8,
  "day_of_week": 0,
  "month": 7,
  "location_geohash5": "te7u2"
}
```

## Expected Inference Response

```json
{
  "available": true,
  "probability": 0.72,
  "modelVersion": "xgb-flood-v1.0",
  "featureVersion": "flood-segment-v1",
  "predictedAt": "2026-10-04T14:00:00Z"
}
```

## Shadow Mode Contract

- The XGBoost probability has **zero weight** in route ranking initially.
- Lambda logs the signal for evaluation but does not alter the rule-based result.
- A hard block (verified closure or impassable incident) is **never** cleared by an ML prediction.
- `MlRiskProvider.predict()` must complete within the configured timeout; on timeout/error, return `{ available: false, reasonUnavailable: "timeout" }`.
