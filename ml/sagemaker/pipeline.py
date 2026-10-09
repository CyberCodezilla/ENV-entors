from __future__ import annotations
import argparse,subprocess,sys
from pathlib import Path
import boto3
ROOT=Path(__file__).resolve().parents[2]; ML=ROOT/"ml"
def run(cmd:list[str])->None:
    print("$"," ".join(cmd),flush=True); subprocess.run(cmd,cwd=ROOT,check=True)
def main()->None:
    ap=argparse.ArgumentParser(description="Upload dataset, train and optionally deploy HeatFlood XGBoost")
    ap.add_argument("--bucket",required=True); ap.add_argument("--role",required=True); ap.add_argument("--region",default=None); ap.add_argument("--prefix",default="heatflood/ml/xgb-rainfall-stress-v1"); ap.add_argument("--endpoint",default="")
    a=ap.parse_args(); region=a.region or boto3.Session().region_name
    if not region: raise RuntimeError("AWS region is required")
    s3=boto3.client("s3",region_name=region); packaged=ML/"data"/"sagemaker"; dataset=ML/"data"/"processed"/"dataset.csv"
    if not dataset.exists(): raise RuntimeError("Missing dataset. Run the local ML pipeline first.")
    run([sys.executable,str(ML/"src"/"package_sagemaker_csv.py"),"--data",str(dataset),"--out",str(packaged)])
    for name in ("train","validation","test"):
        path=packaged/f"{name}.csv"; key=f"{a.prefix}/{name}/{path.name}"; s3.upload_file(str(path),a.bucket,key); print(f"UPLOADED=s3://{a.bucket}/{key}")
    run([sys.executable,str(ML/"sagemaker"/"train.py"),"--bucket",a.bucket,"--prefix",a.prefix,"--role",a.role,"--region",region])
    print("Training completed. Deploy with ml/sagemaker/deploy.py using the MODEL_DATA URI printed above.")
if __name__=="__main__": main()
