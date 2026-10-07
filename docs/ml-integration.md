# ML Integration Guide — Day 5

## Overview

The SageMaker AI XGBoost integration is **optional and additive**. It adds a shadow signal to the explainability output. It does not change route ranking or override safety rules.

## Day 5 checklist for Member C (ML)

- [ ] Inspect dataset manifest and label quality
- [ ] Define and document train/val/test time splits
- [ ] Build feature CSV in `flood-segment-v1` column order (see `feature-schema-v1.md`)
- [ ] Upload datasets to S3 bucket under `s3://heatflood-data/training/`
- [ ] Train XGBoost baseline using SageMaker AI built-in XGBoost (CPU, not GPU)
- [ ] Evaluate on held-out test set; record metrics in `docs/ml-results.md`
- [ ] If evaluation passes go/no-go criteria, deploy a SageMaker real-time endpoint
- [ ] Document endpoint name, feature version, expected latency and IAM requirements
- [ ] Hand `SAGEMAKER_ENDPOINT_NAME` to Member A

## Go/no-go gate for live shadow integration

Enable the endpoint in staging **only if all** of the following are true:

1. Labels are genuine observed outcomes (not derived from rainfall alone).
2. Training and inference use identical feature schema (`flood-segment-v1`) and units.
3. Evaluation is separated by time; a geographic holdout is used where feasible.
4. Metrics are compared against the rule-based baseline on the same held-out cases.
5. Endpoint timeout or error returns `{ available: false }` and the rule-based result is unchanged.
6. Hard blocks and `NO_CONFIDENT_ROUTE` outcomes are not affected by the ML signal.

## Day 5 checklist for Member A (backend)

- [ ] Confirm `SAGEMAKER_ENABLED=false` in production
- [ ] Enable in staging environment only
- [ ] Set application timeout of 800 ms for `InvokeEndpoint` call
- [ ] Validate response: `probability` must be a finite float in `[0, 1]`; `featureVersion` must match
- [ ] Log signal alongside rule-based result for shadow evaluation
- [ ] Test: disabled, timeout, endpoint error, malformed probability, version mismatch
- [ ] Promote to production only after passing regression tests

## Lambda integration point

```
analyseTrip(request)
  → fetch routes from Mapbox
  → fetch weather from Open-Meteo
  → load active incidents and hotspots from DynamoDB
  → segment routes and estimate arrival times
  → calculate rule-based floodRisk, heatRisk, confidence per segment
  → if SAGEMAKER_ENABLED:
       call mlProvider.predict(versionedFeatures)
       validate response; on failure set available=false
  → apply hard safety rules (verified closures block regardless of ML)
  → rank eligible routes using rule-based scores only
  → return routes + reasons + mlSignal + freshness
```

## IAM requirements for SageMaker endpoint invocation

The Lambda execution role needs:
```json
{
  "Effect": "Allow",
  "Action": "sagemaker:InvokeEndpoint",
  "Resource": "arn:aws:sagemaker:<region>:<account>:endpoint/<endpoint-name>"
}
```

Add this only after the endpoint is created. Do not add broad SageMaker permissions to the production Lambda.
