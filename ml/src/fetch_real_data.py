from __future__ import annotations
import argparse, requests, pandas as pd
from pathlib import Path

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument('--lat',type=float,default=19.12)
    ap.add_argument('--lon',type=float,default=72.85)
    ap.add_argument('--start',default='2015-01-01')
    ap.add_argument('--end',default='2025-12-31')
    ap.add_argument('--out',required=True)
    a=ap.parse_args()
    url='https://power.larc.nasa.gov/api/temporal/hourly/point'
    params={'parameters':'PRECTOTCORR,T2M,RH2M','community':'AG','longitude':a.lon,'latitude':a.lat,'start':a.start.replace('-',''),'end':a.end.replace('-',''),'format':'JSON','time-standard':'UTC'}
    r=requests.get(url,params=params,timeout=120)
    r.raise_for_status()
    data=r.json()['properties']['parameter']
    rows=[]
    for k in sorted(data['PRECTOTCORR']):
        rows.append({'timestamp':pd.to_datetime(k,format='%Y%m%d%H',utc=True),'rain_mm':data['PRECTOTCORR'].get(k),'temperature_c':data['T2M'].get(k),'humidity_pct':data['RH2M'].get(k)})
    out=pd.DataFrame(rows)
    Path(a.out).parent.mkdir(parents=True,exist_ok=True)
    out.to_csv(a.out,index=False)
    print(f'wrote {len(out)} rows to {a.out}')
if __name__=='__main__': main()
