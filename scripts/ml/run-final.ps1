$ErrorActionPreference = 'Stop'
$Root = Resolve-Path (Join-Path $PSScriptRoot '..\..')
Set-Location $Root

function Step($name) { Write-Host "`n=== $name ===" -ForegroundColor Cyan }
function Run([string]$exe, [string[]]$cmdArgs) {
  Write-Host ("> " + $exe + " " + ($cmdArgs -join ' ')) -ForegroundColor DarkGray
  & $exe @cmdArgs
  if ($LASTEXITCODE -ne 0) { throw "Command failed with exit code ${LASTEXITCODE}: $exe" }
}

Write-Host 'HeatFlood Guardian - FINAL local ML validation' -ForegroundColor Green

Step 'Python environment'
if (!(Test-Path 'ml\.venv\Scripts\python.exe')) {
  Run 'python' @('-m','venv','ml\.venv')
}
$Py = Join-Path $Root 'ml\.venv\Scripts\python.exe'
if (!(Test-Path $Py)) { throw "Python virtual environment was not created at $Py" }
Run $Py @('-m','pip','install','-r','ml\requirements.txt')

Step 'Node dependencies'
if (!(Test-Path 'node_modules')) { Run 'npm' @('install') }

Step 'Real Mumbai weather data'
if (!(Test-Path 'ml\data\raw\mumbai_weather.csv')) {
  Run $Py @('ml\src\fetch_real_data.py','--out','ml\data\raw\mumbai_weather.csv')
} else { Write-Host 'Weather CSV already exists; skipping download.' -ForegroundColor DarkGray }

Step 'Leakage-safe ML dataset (75k rows max)'
Run $Py @('ml\src\prepare_dataset.py','--weather','ml\data\raw\mumbai_weather.csv','--out','ml\data\processed\dataset.csv','--max-rows','75000','--threshold-mm','10')

Step 'XGBoost rainfall-stress training with chronological validation'
Run $Py @('ml\src\train_local.py','--data','ml\data\processed\dataset.csv','--out','ml\artifacts\xgb')

Step 'Local inference smoke test'
Run $Py @('ml\src\predict_local.py','--model','ml\artifacts\xgb\model.json','--json','ml\feature-order-example.json')

Step 'TypeScript validation'
Run 'npm' @('run','typecheck')

Step 'Unit tests'
Run 'npm' @('test')

Write-Host "`nLOCAL ML + TYPESCRIPT + UNIT TEST VALIDATION: PASSED" -ForegroundColor Green
Write-Host 'Model:   ml\artifacts\xgb\model.json' -ForegroundColor Green
Write-Host 'Metrics: ml\artifacts\xgb\metrics.json' -ForegroundColor Green
Write-Host 'Model target: next-hour heavy rainfall >= 10 mm (advisory only)' -ForegroundColor Green
Write-Host "`nSageMaker is optional and requires your AWS account credentials/IAM role." -ForegroundColor Yellow
Write-Host 'Set SAGEMAKER_ENABLED=true and SAGEMAKER_ENDPOINT_NAME=<endpoint> in Lambda to enable advisory inference.' -ForegroundColor Yellow
