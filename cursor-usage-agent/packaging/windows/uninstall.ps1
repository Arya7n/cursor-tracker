$ErrorActionPreference = "Stop"
$taskName = "CursorUsageAgentSync"
schtasks /Delete /TN $taskName /F 2>$null | Out-Null
$installDir = Join-Path $env:LOCALAPPDATA "CursorUsageAgent"
if (Test-Path $installDir) {
  Remove-Item -LiteralPath $installDir -Recurse -Force
}
Write-Host "Cursor Usage Agent removed."
