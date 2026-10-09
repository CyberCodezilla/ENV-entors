from __future__ import annotations
import argparse
from pathlib import Path
import pandas as pd
from features import NUMERIC_FEATURES

ap=argparse.ArgumentParser(); ap.add_argument('--data',required=True); ap.add_argument('--out',required=True); a=ap.parse_args()
df=pd.read_csv(a.data).sort_values('timestamp')
Path(a.out).mkdir(parents=True,exist_ok=True)
# SageMaker built-in XGBoost expects label as the first column and no CSV header.
# Keep time split deterministic: 65% train, 15% validation, 20% test.
n=len(df); i1=int(n*.65); i2=int(n*.8)
for name,chunk in [('train',df.iloc[:i1]),('validation',df.iloc[i1:i2]),('test',df.iloc[i2:])]:
    chunk[['label']+NUMERIC_FEATURES].to_csv(Path(a.out)/f'{name}.csv',index=False,header=False)
print(f'wrote {n} rows to {a.out}')
