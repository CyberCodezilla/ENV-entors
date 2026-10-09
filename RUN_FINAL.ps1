param([switch]$DeploySageMaker)
$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot

& "$PSScriptRoot\scripts\ml\run-final.ps1"
if ($DeploySageMaker) {
  & "$PSScriptRoot\scripts\ml\deploy-sagemaker.ps1"
}
