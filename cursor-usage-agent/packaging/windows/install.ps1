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
$nodeExe = (Get-Command node).Source
$wscript = Join-Path $env:SystemRoot "System32\wscript.exe"
$vbs = Join-Path $installDir "sync-hidden.vbs"
$oldCmd = Join-Path $installDir "sync-task.cmd"
if (Test-Path $oldCmd) { Remove-Item -LiteralPath $oldCmd -Force }

@"
Option Explicit
Dim sh
Set sh = CreateObject("WScript.Shell")
sh.CurrentDirectory = "$($installDir.Replace('"','""'))"
sh.Run """$($nodeExe.Replace('"','""'))"" --experimental-sqlite --import tsx src/main.ts tick", 0, False
"@ | Set-Content -Path $vbs -Encoding ASCII

$prevEap = $ErrorActionPreference
$ErrorActionPreference = "SilentlyContinue"
cmd.exe /c "schtasks /Delete /TN $taskName /F" | Out-Null
Unregister-ScheduledTask -TaskName $taskName -Confirm:$false -ErrorAction SilentlyContinue | Out-Null
$ErrorActionPreference = $prevEap

$registered = $false
try {
  $action = New-ScheduledTaskAction -Execute $wscript -Argument "//nologo //B `"$vbs`"" -WorkingDirectory $installDir
  $trigger = New-ScheduledTaskTrigger -Once -At ((Get-Date).Date) -RepetitionInterval (New-TimeSpan -Minutes 20) -RepetitionDuration (New-TimeSpan -Days 3650)
  $settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -MultipleInstances IgnoreNew -ExecutionTimeLimit (New-TimeSpan -Minutes 3)
  $settings.Hidden = $true
  $principal = New-ScheduledTaskPrincipal -UserId $env:USERNAME -LogonType Interactive -RunLevel Limited
  Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Settings $settings -Principal $principal -Force | Out-Null
  $registered = $true
} catch {
  $tr = "$wscript //nologo //B `"$vbs`""
  cmd.exe /c "schtasks /Create /TN $taskName /TR `"$tr`" /SC MINUTE /MO 20 /F"
  if ($LASTEXITCODE -eq 0) { $registered = $true }
}

if (-not $registered) {
  Write-Host ""
  Write-Host "Enroll succeeded, but the background task was not created." -ForegroundColor Yellow
  Write-Host "Manual sync:  cd `"$installDir`"; npm run sync"
} else {
  Write-Host ""
  Write-Host "Installed. Sync runs hidden in the background (no terminal window)."
}

Write-Host "Dashboard: $Server"
Write-Host "Uninstall:    .\uninstall.ps1"
