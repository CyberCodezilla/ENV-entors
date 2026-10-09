from __future__ import annotations
import argparse,json,os
from pathlib import Path
import numpy as np,pandas as pd,xgboost as xgb
from sklearn.metrics import roc_auc_score,average_precision_score,precision_recall_fscore_support,brier_score_loss,confusion_matrix
from features import NUMERIC_FEATURES,FEATURE_VERSION
def split_time(df):
    df=df.sort_values("timestamp").reset_index(drop=True); n=len(df); val_start=int(n*0.65); test_start=int(n*0.80)
    return df.iloc[:val_start],df.iloc[val_start:test_start],df.iloc[test_start:]
def metrics(y,p,thr=0.5):
    pred=(p>=thr).astype(int); pr,rc,f1,_=precision_recall_fscore_support(y,pred,average="binary",zero_division=0); tn,fp,fn,tp=confusion_matrix(y,pred,labels=[0,1]).ravel()
    return {"threshold":thr,"roc_auc":float(roc_auc_score(y,p)) if len(np.unique(y))>1 else None,"pr_auc":float(average_precision_score(y,p)) if len(np.unique(y))>1 else None,"precision":float(pr),"recall":float(rc),"f1":float(f1),"brier":float(brier_score_loss(y,p)),"tn":int(tn),"fp":int(fp),"fn":int(fn),"tp":int(tp)}
def best_f1_threshold(y,p):
    best=(0.5,-1.0)
    for t in np.linspace(0.05,0.95,91):
        f1=precision_recall_fscore_support(y,(p>=t).astype(int),average="binary",zero_division=0)[2]
        if f1>best[1]: best=(float(t),float(f1))
    return best
def main():
    ap=argparse.ArgumentParser(); ap.add_argument("--data",required=True); ap.add_argument("--out",required=True); args=ap.parse_args()
    df=pd.read_csv(args.data); df[NUMERIC_FEATURES]=df[NUMERIC_FEATURES].replace([np.inf,-np.inf],np.nan).fillna(-1)
    train,val,test=split_time(df); Xtr,ytr=train[NUMERIC_FEATURES],train.label.astype(int); Xv,yv=val[NUMERIC_FEATURES],val.label.astype(int); Xt,yt=test[NUMERIC_FEATURES],test.label.astype(int)
    pos=max(1,int(ytr.sum())); neg=max(1,int(len(ytr)-ytr.sum()))
    model=xgb.XGBClassifier(n_estimators=500,learning_rate=0.04,max_depth=5,min_child_weight=4,subsample=0.85,colsample_bytree=0.9,reg_alpha=0.2,reg_lambda=2.0,objective="binary:logistic",eval_metric="aucpr",tree_method="hist",scale_pos_weight=neg/pos,early_stopping_rounds=40,random_state=42,n_jobs=max(1,(os.cpu_count() or 2)-1))
    model.fit(Xtr,ytr,eval_set=[(Xv,yv)],verbose=False); pv=model.predict_proba(Xv)[:,1]; pt=model.predict_proba(Xt)[:,1]; tuned_threshold,_=best_f1_threshold(yv,pv)
    out={"feature_version":FEATURE_VERSION,"features":NUMERIC_FEATURES,"model_type":"xgboost_binary_classifier","target":"next_hour_heavy_rain","label_definition":"Observed historical rainfall in the next hourly interval; threshold >= 10 mm; not street-flood ground truth","leakage_controls":["target shifted one hour forward","no hotspot-derived features","chronological split"],"train_rows":len(train),"validation_rows":len(val),"test_rows":len(test),"positive_train":int(ytr.sum()),"positive_validation":int(yv.sum()),"positive_test":int(yt.sum()),"best_iteration":int(model.best_iteration) if model.best_iteration is not None else None,"decision_threshold_tuned_on_validation":tuned_threshold,"validation":metrics(yv,pv,tuned_threshold),"test":metrics(yt,pt,tuned_threshold)}
    out_dir=Path(args.out); out_dir.mkdir(parents=True,exist_ok=True); model.save_model(out_dir/"model.json"); (out_dir/"metrics.json").write_text(json.dumps(out,indent=2),encoding="utf-8"); (out_dir/"feature_list.json").write_text(json.dumps(NUMERIC_FEATURES,indent=2),encoding="utf-8"); (out_dir/"README.md").write_text("This model predicts whether the next hourly interval will receive >=10 mm rainfall. It is an advisory rainfall-stress signal, not a street-flood predictor.\n",encoding="utf-8"); print(json.dumps(out,indent=2))
if __name__=="__main__": main()
