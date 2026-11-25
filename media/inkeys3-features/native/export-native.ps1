param(
  [Parameter(Mandatory=$true)][string]$Repository,
  [Parameter(Mandatory=$true)][string]$Python,
  [string]$OutputDirectory,
  [switch]$Smoke,
  [switch]$Redesign
)
$ErrorActionPreference = 'Stop'
if ([string]::IsNullOrWhiteSpace($OutputDirectory)) {
  if ($Redesign) { $OutputDirectory = Join-Path $PSScriptRoot '..\sources-redesign' }
  else { $OutputDirectory = Join-Path $PSScriptRoot '..\sources' }
}
if ($Smoke) { & $Python (Join-Path $PSScriptRoot 'export-native.py') --repository $Repository --output $OutputDirectory --smoke }
elseif ($Redesign) { & $Python (Join-Path $PSScriptRoot 'export-native.py') --repository $Repository --output $OutputDirectory --redesign }
else { & $Python (Join-Path $PSScriptRoot 'export-native.py') --repository $Repository --output $OutputDirectory }
if ($LASTEXITCODE -ne 0) { throw 'Native build, offscreen export, adapter restoration, or validation failed.' }
