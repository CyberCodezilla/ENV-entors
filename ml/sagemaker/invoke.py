from __future__ import annotations
import argparse, json, boto3

ap = argparse.ArgumentParser()
ap.add_argument('--endpoint', required=True)
ap.add_argument('--values', required=True)
ap.add_argument('--region', default=None)
a = ap.parse_args()

region = a.region or boto3.Session().region_name or 'ap-south-1'
body = ','.join(str(x) for x in json.loads(a.values))
sm = boto3.client('sagemaker-runtime', region_name=region)
r = sm.invoke_endpoint(EndpointName=a.endpoint, ContentType='text/csv', Body=body)
print(r['Body'].read().decode())
