# SageMaker Lambda adapter

Set:

- `SAGEMAKER_ENABLED=true` only after staging validation.
- `SAGEMAKER_ENDPOINT_NAME=<endpoint>`.
- `ML_FEATURE_VERSION=flood-susceptibility-v2` only if the adapter is paired with this model.

The runtime payload is built in Lambda and converted to the exact numeric feature order in `ml/feature_order.json`. Hard blocks and route ranking remain deterministic.
