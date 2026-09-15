$ErrorActionPreference = "SilentlyContinue"
cmd.exe /c "schtasks /Delete /TN CursorUsageAgentSync /F" | Out-Null
$ErrorActionPreference = "Stop"
$installDir = Join-Path $env:LOCALAPPDATA "CursorUsageAgent"
if (Test-Path $installDir) {
  Remove-Item -LiteralPath $installDir -Recurse -Force
}
Write-Host "Cursor Usage Agent removed."
