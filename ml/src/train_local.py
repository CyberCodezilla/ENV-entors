from __future__ import annotations
import argparse, json, os
from pathlib import Path
import numpy as np
import pandas as pd
import xgboost as xgb
from sklearn.metrics import roc_auc_score, average_precision_score, precision_recall_fscore_support, brier_score_loss, confusion_matrix
from sklearn.model_selection import TimeSeriesSplit
from features import NUMERIC_FEATURES, FEATURE_VERSION


def split_time(df):
    df=df.sort_values("timestamp").reset_index(drop=True)
    n=len(df); test_start=int(n*0.8); val_start=int(n*0.65)
    return df.iloc[:val_start], df.iloc[val_start:test_start], df.iloc[test_start:]

def metrics(y,p,thr=.5):
    pred=(p>=thr).astype(int)
    pr,rc,f1,_=precision_recall_fscore_support(y,pred,average="binary",zero_division=0)
    tn,fp,fn,tp=confusion_matrix(y,pred,labels=[0,1]).ravel()
    return {"roc_auc":float(roc_auc_score(y,p)) if len(np.unique(y))>1 else None,"pr_auc":float(average_precision_score(y,p)) if len(np.unique(y))>1 else None,"precision":float(pr),"recall":float(rc),"f1":float(f1),"brier":float(brier_score_loss(y,p)),"tn":int(tn),"fp":int(fp),"fn":int(fn),"tp":int(tp)}

def main():
    ap=argparse.ArgumentParser(); ap.add_argument("--data",required=True); ap.add_argument("--out",required=True); args=ap.parse_args()
    df=pd.read_csv(args.data)
    df[NUMERIC_FEATURES]=df[NUMERIC_FEATURES].replace([np.inf,-np.inf],np.nan).fillna(-1)
    train,val,test=split_time(df)
    Xtr,ytr=train[NUMERIC_FEATURES],train.label; Xv,yv=val[NUMERIC_FEATURES],val.label; Xt,yt=test[NUMERIC_FEATURES],test.label
    pos=max(1,int(ytr.sum())); neg=max(1,int(len(ytr)-ytr.sum())); spw=neg/pos
    model=xgb.XGBClassifier(n_estimators=500,learning_rate=.04,max_depth=6,min_child_weight=4,subsample=.85,colsample_bytree=.85,reg_alpha=.2,reg_lambda=2,objective="binary:logistic",eval_metric="aucpr",tree_method="hist",scale_pos_weight=spw,random_state=42,n_jobs=max(1,(os.cpu_count() or 2)-1))
    model.fit(Xtr,ytr,eval_set=[(Xv,yv)],verbose=False)
    pv=model.predict_proba(Xv)[:,1]; pt=model.predict_proba(Xt)[:,1]
    out={"feature_version":FEATURE_VERSION,"features":NUMERIC_FEATURES,"train_rows":len(train),"validation_rows":len(val),"test_rows":len(test),"positive_train":int(ytr.sum()),"validation":metrics(yv,pv),"test":metrics(yt,pt)}
    Path(args.out).mkdir(parents=True,exist_ok=True); model.save_model(Path(args.out)/"model.json"); (Path(args.out)/"metrics.json").write_text(json.dumps(out,indent=2)); (Path(args.out)/"feature_list.json").write_text(json.dumps(NUMERIC_FEATURES,indent=2)); print(json.dumps(out,indent=2))

if __name__ == "__main__": main()
