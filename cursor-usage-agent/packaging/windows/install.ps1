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
    Write-Host "Node.js 22 LTS is required. Install it from https://nodejs.org then re-run this installer."
    exit 1
  }
  $major = 0
  try { $major = [int]((node -p "process.versions.node.split('.')[0]")) } catch { $major = 0 }
  if ($major -lt 22) {
    Write-Host "Need Node.js 22 or newer (found $(node -v)). Install LTS from https://nodejs.org"
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
  $env:NODE_ENV = "development"
  npm install --include=dev
  if ($LASTEXITCODE -ne 0) { throw "npm install failed" }

  Write-Host "Enrolling this PC with $Server"
  $env:CURSOR_USAGE_SERVER = $Server.TrimEnd("/")
  $env:CURSOR_USAGE_ENROLLMENT_SECRET = $Secret
  npm run enroll
  if ($LASTEXITCODE -ne 0) {
    throw "enroll failed. Scroll up for the Node/hub error. Need Node 22 and a reachable hub URL."
  }

  npm run sync
  if ($LASTEXITCODE -ne 0) {
    Write-Host "First sync failed. Stay signed in to Cursor Desktop and run: npm run sync" -ForegroundColor Yellow
  }
} finally {
  Pop-Location
}

$taskName = "CursorUsageAgentSync"
$wrapper = Join-Path $installDir "sync-task.cmd"
@(
  "@echo off"
  "cd /d `"$installDir`""
  "call npm run tick"
) | Set-Content -Path $wrapper -Encoding ASCII

$prevEap = $ErrorActionPreference
$ErrorActionPreference = "SilentlyContinue"
cmd.exe /c "schtasks /Delete /TN $taskName /F" | Out-Null
$ErrorActionPreference = $prevEap

cmd.exe /c "schtasks /Create /TN $taskName /TR `"$wrapper`" /SC MINUTE /MO 1 /F"
if ($LASTEXITCODE -ne 0) {
  Write-Host ""
  Write-Host "Enroll succeeded, but the scheduled task was not created." -ForegroundColor Yellow
  Write-Host "Manual sync:  cd `"$installDir`"; npm run sync"
} else {
  Write-Host ""
  Write-Host "Installed. This PC checks in every minute and reports usage about every 20 minutes, or right away when an admin clicks Sync now."
}

Write-Host "Dashboard: $Server"
Write-Host "Uninstall:    .\uninstall.ps1"
