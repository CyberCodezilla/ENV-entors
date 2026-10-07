# ML Target and Label Definition

## What the model predicts

A binary classification: **was waterlogging actively observed at this route segment during the 60-minute window covering the expected arrival time?**

- `label = 1`: A moderator-verified incident report, trusted sensor reading, or official closure marked the segment as waterlogged / impassable during the target window.
- `label = 0`: No such evidence was recorded for that segment and window.

## What the model does NOT predict

- That a route is "safe."
- The depth of water.
- Whether a specific person will experience flooding.
- The accuracy of unverified community reports.

## Data provenance checklist (fill before Day 5 training)

- [ ] Source name and URL for each labelled row
- [ ] Geographic coordinate and precision of each observation
- [ ] Observation timestamp and time zone (must be UTC)
- [ ] Label assigned by: sensor / moderator / official / synthetic
- [ ] Licence or permission for this use
- [ ] Class counts: positive (flooded) vs negative rows
- [ ] Train / validation / test date ranges
- [ ] Location holdout area (if feasible)
- [ ] Features confirmed available at `predictionTimeUtc` (no leakage)

## If genuine labels are unavailable

If no verified segment-level waterlogging outcomes exist, **do not fabricate labels from weather data alone**. Instead:
1. Document the data gap clearly.
2. Run SageMaker as a pipeline experiment with synthetic labels.
3. Present as "experimental infrastructure," not a validated flood predictor.
4. The rule-based engine remains the production decision-maker.

## Baseline to beat

Before deploying any ML signal, the XGBoost precision/recall on held-out data must be compared against the rule-based engine on the same cases. Report:
- Precision and recall (especially missed hazardous events — false negatives matter more than false positives here).
- Accuracy is insufficient when flooding is rare (class imbalance).
- If the model does not improve on at least one key metric, do not promote to staging.
