$ErrorActionPreference = 'Stop'
$Root = Resolve-Path (Join-Path $PSScriptRoot '..\..')
Set-Location $Root

foreach ($name in @('ML_S3_BUCKET','ML_SAGEMAKER_ROLE_ARN','ML_SAGEMAKER_ENDPOINT')) {
  if ([string]::IsNullOrWhiteSpace((Get-Item "Env:$name" -ErrorAction SilentlyContinue).Value)) {
    throw "Missing environment variable $name"
  }
}

$Py = Join-Path $Root 'ml\.venv\Scripts\python.exe'
if (!(Test-Path $Py)) { throw 'Run .\scripts\ml\run-final.ps1 first.' }

$Region = if ($env:AWS_REGION) { $env:AWS_REGION } else { 'ap-south-1' }
$Prefix = if ($env:ML_S3_PREFIX) { $env:ML_S3_PREFIX } else { 'heatflood/ml/xgb-rainfall-stress-v1' }

& $Py ml\sagemaker\pipeline.py --bucket $env:ML_S3_BUCKET --role $env:ML_SAGEMAKER_ROLE_ARN --region $Region --prefix $Prefix

Write-Host ''
Write-Host 'Training job completed.' -ForegroundColor Green
Write-Host 'Copy the MODEL_DATA=s3://... value printed above, then deploy with:' -ForegroundColor Cyan
Write-Host ".\ml\.venv\Scripts\python.exe ml\sagemaker\deploy.py --model-data <MODEL_DATA> --role $env:ML_SAGEMAKER_ROLE_ARN --endpoint $env:ML_SAGEMAKER_ENDPOINT --region $Region" -ForegroundColor Cyan
