from __future__ import annotations
import argparse,boto3,sagemaker
from sagemaker.model import Model
from sagemaker import image_uris
ap=argparse.ArgumentParser(description="Deploy HeatFlood XGBoost model to SageMaker")
ap.add_argument("--model-data",required=True); ap.add_argument("--role",required=True); ap.add_argument("--endpoint",required=True); ap.add_argument("--region",default=None); ap.add_argument("--instance-type",default="ml.t3.medium")
a=ap.parse_args(); region=a.region or boto3.Session().region_name
if not region: raise RuntimeError("AWS region is required")
session=sagemaker.Session(boto_session=boto3.Session(region_name=region))
image=image_uris.retrieve("xgboost",region=region,version="1.7-1",image_scope="inference",instance_type=a.instance_type)
model=Model(model_data=a.model_data,image_uri=image,role=a.role,sagemaker_session=session)
model.deploy(initial_instance_count=1,instance_type=a.instance_type,endpoint_name=a.endpoint,wait=True,tags=[{"Key":"heatflood-ml","Value":"xgb-rainfall-stress-v1"}])
print(f"ENDPOINT={a.endpoint}")
