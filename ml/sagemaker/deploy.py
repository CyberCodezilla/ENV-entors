from __future__ import annotations
import argparse
import boto3
import sagemaker
from sagemaker.model import Model
from sagemaker import image_uris

ap = argparse.ArgumentParser()
ap.add_argument('--model-data', required=True)
ap.add_argument('--role', required=True)
ap.add_argument('--endpoint', required=True)
ap.add_argument('--region', default=None)
a = ap.parse_args()

region = a.region or boto3.Session().region_name or 'ap-south-1'
session = sagemaker.Session(boto_session=boto3.Session(region_name=region))
image = image_uris.retrieve('xgboost', region=region, version='1.7-1', image_scope='inference', instance_type='ml.m5.large')
model = Model(model_data=a.model_data, image_uri=image, role=a.role, sagemaker_session=session)
model.deploy(initial_instance_count=1, instance_type='ml.t3.medium', endpoint_name=a.endpoint, wait=True)
print(f'ENDPOINT={a.endpoint}')
