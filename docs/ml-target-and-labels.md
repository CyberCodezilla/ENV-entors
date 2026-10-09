# ML Target and Label Definition

## Production-safe ML target

The bundled model predicts **whether the next hourly weather interval will receive at least 10 mm of rain**.

- `label = 1`: observed rainfall in the next hourly interval is >= 10 mm.
- `label = 0`: observed rainfall in the next hourly interval is < 10 mm.
- The target is shifted one hour forward, so the model only sees information available at prediction time.

This is a real historical-weather forecasting task. It is **not** a claim that the model predicts street flooding.

## Leakage controls

- No hotspot-derived features are supplied to the model.
- The target is one hour ahead of the feature timestamp.
- Train/validation/test are chronological (65/15/20).
- Threshold selection is performed on validation only.
- Test metrics are reported once on the untouched chronological test set.

## How the ML signal is used

The model is an advisory **rainfall-stress signal**. The deterministic flood engine remains the final route decision-maker. Verified flooding, closures, and hard blocks cannot be overridden by ML.

The ML probability must not be described as flood probability, route safety probability, or street-water depth prediction.

## If verified flood labels become available

The next model iteration can replace this rainfall target with timestamped segment-level flood outcomes from moderator-verified reports, trusted sensors, or official closures. At that point, a dedicated flood model can be evaluated against the same chronological and spatial holdouts.
