from __future__ import annotations
import argparse, json, os
import boto3, sagemaker
from sagemaker.estimator import Estimator
from sagemaker.inputs import TrainingInput
from sagemaker import image_uris

ap=argparse.ArgumentParser(); ap.add_argument('--bucket',required=True); ap.add_argument('--prefix',default='heatflood/ml/xgb-v2'); ap.add_argument('--role',required=True); ap.add_argument('--region',default=None); a=ap.parse_args()
region=a.region or boto3.Session().region_name
session=sagemaker.Session(boto_session=boto3.Session(region_name=region), default_bucket=a.bucket)
image=image_uris.retrieve('xgboost',region=region,version='1.7-1',image_scope='training',instance_type='ml.m5.xlarge')
xgb=Estimator(image_uri=image,role=a.role,instance_count=1,instance_type='ml.m5.xlarge',volume_size=20,output_path=f's3://{a.bucket}/{a.prefix}/model',sagemaker_session=session,enable_sagemaker_metrics=True)
xgb.set_hyperparameters(objective='binary:logistic',eval_metric='aucpr',num_round=500,max_depth=6,eta=.04,min_child_weight=4,subsample=.85,colsample_bytree=.85,reg_alpha=.2,reg_lambda=2,tree_method='hist')
xgb.fit({'train':TrainingInput(f's3://{a.bucket}/{a.prefix}/train',content_type='text/csv'),'validation':TrainingInput(f's3://{a.bucket}/{a.prefix}/validation',content_type='text/csv')},wait=True)
print('TRAINING_JOB=',xgb.latest_training_job.name); print('MODEL_DATA=',xgb.model_data)
