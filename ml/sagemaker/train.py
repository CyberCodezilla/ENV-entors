from __future__ import annotations
import argparse,boto3,sagemaker
from sagemaker.estimator import Estimator
from sagemaker.inputs import TrainingInput
from sagemaker import image_uris
ap=argparse.ArgumentParser(description="Train HeatFlood XGBoost in SageMaker")
ap.add_argument("--bucket",required=True); ap.add_argument("--prefix",default="heatflood/ml/xgb-rainfall-stress-v1"); ap.add_argument("--role",required=True); ap.add_argument("--region",default=None); ap.add_argument("--instance-type",default="ml.m5.xlarge")
a=ap.parse_args(); region=a.region or boto3.Session().region_name
if not region: raise RuntimeError("AWS region is required; pass --region or configure boto3")
session=sagemaker.Session(boto_session=boto3.Session(region_name=region),default_bucket=a.bucket)
image=image_uris.retrieve("xgboost",region=region,version="1.7-1",image_scope="training",instance_type=a.instance_type)
estimator=Estimator(image_uri=image,role=a.role,instance_count=1,instance_type=a.instance_type,volume_size=20,output_path=f"s3://{a.bucket}/{a.prefix}/model",sagemaker_session=session,enable_sagemaker_metrics=True)
estimator.set_hyperparameters(objective="binary:logistic",eval_metric="aucpr",num_round=500,max_depth=5,eta=0.04,min_child_weight=4,subsample=0.85,colsample_bytree=0.9,reg_alpha=0.2,reg_lambda=2.0,tree_method="hist",early_stopping_rounds=40)
estimator.fit({"train":TrainingInput(f"s3://{a.bucket}/{a.prefix}/train",content_type="text/csv"),"validation":TrainingInput(f"s3://{a.bucket}/{a.prefix}/validation",content_type="text/csv")},wait=True)
print(f"TRAINING_JOB={estimator.latest_training_job.name}"); print(f"MODEL_DATA={estimator.model_data}")
