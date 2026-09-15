# Build the zip you send to developers
$ErrorActionPreference = "Stop"
$pkg = $PSScriptRoot
$root = Resolve-Path (Join-Path $pkg "../..")
$agentSrc = Join-Path $root "agent"
$outDir = Join-Path $root "dist\CursorUsageAgent-employee"
$zip = Join-Path $root "dist\CursorUsageAgent-employee.zip"

if (-not (Test-Path (Join-Path $agentSrc "package.json"))) {
  throw "Cannot find agent at $agentSrc"
}

if (Test-Path $outDir) { Remove-Item $outDir -Recurse -Force }
New-Item -ItemType Directory -Force -Path (Join-Path $outDir "agent") | Out-Null

Copy-Item (Join-Path $pkg "install.ps1") $outDir
Copy-Item (Join-Path $pkg "uninstall.ps1") $outDir
Copy-Item (Join-Path $pkg "README.txt") $outDir

Get-ChildItem $agentSrc -Force | Where-Object {
  $_.Name -notin @("node_modules", "dist") -and -not $_.Name.StartsWith(".")
} | ForEach-Object {
  Copy-Item $_.FullName (Join-Path $outDir "agent\$($_.Name)") -Recurse -Force
}

$mac = Join-Path $root "packaging\macos"
if (Test-Path $mac) {
  New-Item -ItemType Directory -Force -Path (Join-Path $outDir "macos") | Out-Null
  Copy-Item (Join-Path $mac "*") (Join-Path $outDir "macos") -Force
}

New-Item -ItemType Directory -Force -Path (Join-Path $root "dist") | Out-Null
if (Test-Path $zip) { Remove-Item $zip -Force }
Compress-Archive -Path $outDir -DestinationPath $zip -Force
Write-Host "Employee package (zip, often blocked): $zip"
Write-Host "Unzipped folder (copy this instead): $outDir"

# Also publish onto the dashboard so PCs can install from http://server:3000/install
$kitScript = Join-Path $root "dashboard\scripts\publish-kit.mjs"
if (Test-Path $kitScript) {
  Push-Location (Join-Path $root "dashboard")
  try { node $kitScript } finally { Pop-Location }
}
