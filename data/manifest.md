# HeatFlood Guardian — Data Manifest

## Hotspot data

| Field | Value |
|---|---|
| File | `data/hotspots.json` |
| Source | MCGM ward records (indicative) |
| Coverage | Andheri West / Versova pilot area |
| Points | 3 (seed — expand before demo) |
| Usage | Static flood-susceptibility prior only |
| License | **TODO: verify before demo** |

## Weather data (runtime)

| Field | Value |
|---|---|
| Provider | Open-Meteo (free, no API key) |
| Variables | `apparent_temperature`, `relative_humidity_2m`, `precipitation` |
| Resolution | Hourly |
| Coverage | Grid-level, not street-level |
| Limitations | `precipitation` is preceding-hour sum; `apparent_temperature` is instantaneous |

## Routing data (runtime)

| Field | Value |
|---|---|
| Provider | Mapbox Directions API |
| Profiles | `walking`, `driving-traffic` |
| Alternatives | 0, 1 or 2 (not guaranteed) |
| Token | Required — set in environment |

## Community reports (runtime)

| Field | Value |
|---|---|
| Store | DynamoDB `heatflood-incidents` |
| Default status | `pending` (never auto-verified) |
| TTL | 2 h unverified, 4 h corroborated, manual for verified |
| Demo records | `isDemo: true` field; physically separate from live reports |

## ML training data (Day 5 — to be filled before training)

| Field | Value |
|---|---|
| Target | Waterlogging observed at segment during arrival window |
| Label source | **TODO: identify genuine labelled dataset** |
| Features | See `docs/feature-schema-v1.md` |
| Split | By time (not random rows) |
| Geographic holdout | If data volume permits |
| Class balance | **TODO: measure before training** |
| License | **TODO: confirm before any model training** |

> **Important:** If genuine segment-level waterlogging observations are unavailable, the ML run is an infrastructure experiment only. Do not present it as a validated Mumbai flood predictor.
