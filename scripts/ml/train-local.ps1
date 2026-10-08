$ErrorActionPreference = 'Stop'
Set-Location (Join-Path $PSScriptRoot '..\..\ml')
if (!(Test-Path .venv)) { python -m venv .venv }
& .\.venv\Scripts\python.exe -m pip install -r requirements.txt
& .\.venv\Scripts\python.exe src\fetch_real_data.py --out data\raw\mumbai_weather.csv
& .\.venv\Scripts\python.exe src\prepare_dataset.py --weather data\raw\mumbai_weather.csv --hotspots ..\data\hotspots.json --out data\processed\dataset.csv
& .\.venv\Scripts\python.exe src\train_local.py --data data\processed\dataset.csv --out artifacts\xgb
Write-Host 'ML training complete. See ml\artifacts\xgb\metrics.json'
