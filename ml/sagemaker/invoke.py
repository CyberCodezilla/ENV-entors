from __future__ import annotations
import argparse
import json
import boto3

ap = argparse.ArgumentParser(description="Invoke a HeatFlood SageMaker endpoint")
ap.add_argument("--endpoint", required=True)
ap.add_argument("--values", required=True, help="JSON array of 16 feature values in feature_order.json order")
ap.add_argument("--region", default=None)
a = ap.parse_args()

session = boto3.Session(region_name=a.region) if a.region else boto3.Session()
client = session.client("sagemaker-runtime")
values = json.loads(a.values)
if not isinstance(values, list) or len(values) != 10:
    raise ValueError("--values must be a JSON array containing exactly 10 values")
body = ",".join(str(x) for x in values)
r = client.invoke_endpoint(EndpointName=a.endpoint, ContentType="text/csv", Body=body.encode("utf-8"))
raw = r["Body"].read().decode("utf-8").strip()
try:
    probability = float(raw.split(",")[0].split()[0])
except (ValueError, IndexError) as exc:
    raise RuntimeError(f"Endpoint returned invalid probability: {raw!r}") from exc
if not 0 <= probability <= 1:
    raise RuntimeError(f"Endpoint probability outside [0,1]: {probability}")
print(json.dumps({
    "available": True,
    "probability": probability,
    "featureVersion": "rainfall-stress-v1",
    "raw": raw,
}))
