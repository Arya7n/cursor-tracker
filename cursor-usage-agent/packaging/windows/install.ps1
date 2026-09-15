param(
  [Parameter(Mandatory = $true)]
  [string]$Server,

  [Parameter(Mandatory = $true)]
  [string]$Secret
)

$ErrorActionPreference = "Stop"

function Require-Node {
  $node = Get-Command node -ErrorAction SilentlyContinue
  if (-not $node) {
    Write-Host "Node.js is required. Install the LTS build from https://nodejs.org then re-run this installer."
    exit 1
  }
}

Require-Node

$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$source = Join-Path $here "agent"
if (-not (Test-Path $source)) {
  Write-Host "Missing agent\ folder next to install.ps1. Unzip the full employee package."
  exit 1
}

$installDir = Join-Path $env:LOCALAPPDATA "CursorUsageAgent"
New-Item -ItemType Directory -Force -Path $installDir | Out-Null

Write-Host "Installing agent to $installDir"
Copy-Item -Path (Join-Path $source "*") -Destination $installDir -Recurse -Force

Push-Location $installDir
try {
  npm install
  if ($LASTEXITCODE -ne 0) { throw "npm install failed" }

  Write-Host "Enrolling this PC with $Server"
  $env:CURSOR_USAGE_SERVER = $Server.TrimEnd("/")
  $env:CURSOR_USAGE_ENROLLMENT_SECRET = $Secret
  npm run enroll -- --server $env:CURSOR_USAGE_SERVER --secret $env:CURSOR_USAGE_ENROLLMENT_SECRET
  if ($LASTEXITCODE -ne 0) { throw "enroll failed" }

  npm run sync
  if ($LASTEXITCODE -ne 0) {
    Write-Host "First sync failed. Stay signed in to Cursor Desktop and run: npm run sync" -ForegroundColor Yellow
  }
} finally {
  Pop-Location
}

$taskName = "CursorUsageAgentSync"
$syncCmd = "npm run sync"
$action = "cmd.exe /c `"cd /d `"$installDir`" && $syncCmd`""

schtasks /Delete /TN $taskName /F 2>$null | Out-Null
schtasks /Create /TN $taskName /TR $action /SC MINUTE /MO 20 /F | Out-Null

Write-Host ""
Write-Host "Installed. This PC will sync usage about every 20 minutes."
Write-Host "Dashboard: $Server"
Write-Host "Manual sync:  cd `"$installDir`"; npm run sync"
Write-Host "Uninstall:    .\uninstall.ps1"
