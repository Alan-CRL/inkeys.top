$ErrorActionPreference = 'Stop'
$projectDir = Split-Path $PSScriptRoot -Parent
$runtimeDir = Join-Path $projectDir '.cache/node-v24.16.0-win-x64'
New-Item -ItemType Directory -Force -Path $runtimeDir | Out-Null
$runtimeExe = Join-Path $runtimeDir 'node.exe'
$checksumFile = Join-Path $runtimeDir 'SHASUMS256.txt'
if (-not (Test-Path -LiteralPath $checksumFile)) {
  Invoke-WebRequest 'https://nodejs.org/dist/v24.16.0/SHASUMS256.txt' -OutFile $checksumFile
}
if (-not (Test-Path -LiteralPath $runtimeExe)) {
  Invoke-WebRequest 'https://nodejs.org/dist/v24.16.0/win-x64/node.exe' -OutFile $runtimeExe
}
$expectedHash = ((Get-Content -LiteralPath $checksumFile | Where-Object { $_ -match ' win-x64/node.exe$' }) -split '\s+')[0]
if (-not $expectedHash -or (Get-FileHash -LiteralPath $runtimeExe -Algorithm SHA256).Hash -ne $expectedHash) {
  throw 'Portable Node SHA256 mismatch. Remove the incomplete local runtime and run setup again.'
}
& $runtimeExe -p "process.version + ' ' + process.arch"
