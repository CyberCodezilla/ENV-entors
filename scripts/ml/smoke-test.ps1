$ErrorActionPreference = 'Stop'
Set-Location (Resolve-Path (Join-Path $PSScriptRoot '..\..'))
$env:SAGEMAKER_ENABLED = 'false'
npm run typecheck
npm test
Write-Host 'Deterministic fallback smoke test suite: PASS' -ForegroundColor Green
