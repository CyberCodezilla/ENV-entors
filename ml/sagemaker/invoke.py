from __future__ import annotations
import argparse,json,boto3
ap=argparse.ArgumentParser(); ap.add_argument('--endpoint',required=True); ap.add_argument('--values',required=True); a=ap.parse_args()
body=','.join(str(x) for x in json.loads(a.values)); sm=boto3.client('sagemaker-runtime'); r=sm.invoke_endpoint(EndpointName=a.endpoint,ContentType='text/csv',Body=body); print(r['Body'].read().decode())
