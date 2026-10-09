# ML Feature Contract

Version: `rainfall-stress-v1`

The production ML model uses exactly these 10 features, in this order:

1. `rain_1h_mm`
2. `rain_3h_mm`
3. `relative_humidity_pct`
4. `apparent_temperature_c`
5. `hour_sin`
6. `hour_cos`
7. `dow_sin`
8. `dow_cos`
9. `month_sin`
10. `month_cos`

All values are available at prediction time. Hotspot distance, hotspot overlap, and community-report fields remain part of the deterministic route engine but are deliberately excluded from the ML model to avoid label leakage.

SageMaker receives a headerless CSV row with these 10 values. Lambda rejects an unavailable/invalid endpoint response and falls back to the deterministic engine.
