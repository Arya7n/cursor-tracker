param(
  [Parameter(Mandatory = $true)]
  [string]$Server,

  [Parameter(Mandatory = $true)]
  [string]$Secret
)

$ErrorActionPreference = "Stop"
$Server = $Server.TrimEnd("/")

$node = Get-Command node -ErrorAction SilentlyContinue
if (-not $node) {
  Write-Host "Install Node.js LTS from https://nodejs.org then run this again."
  exit 1
}

$tmp = Join-Path $env:TEMP ("CursorUsageKit-" + [guid]::NewGuid().ToString("N"))
New-Item -ItemType Directory -Force -Path $tmp | Out-Null

$headers = @{ "ngrok-skip-browser-warning" = "1" }

Write-Host "Downloading installer from $Server (no zip required)..."
$manifest = Invoke-RestMethod -Uri "$Server/employee-kit/manifest.json" -Headers $headers
foreach ($rel in $manifest.files) {
  $leaf = Split-Path $rel -Leaf
  if ($rel -eq "manifest.json" -or $leaf.StartsWith(".")) { continue }
  $dest = Join-Path $tmp ($rel -replace "/", [io.path]::DirectorySeparatorChar)
  $dir = Split-Path $dest -Parent
  if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Force -Path $dir | Out-Null }
  Invoke-WebRequest -Uri "$Server/employee-kit/$rel" -OutFile $dest -UseBasicParsing -Headers $headers
}

$installer = Join-Path $tmp "install.ps1"
if (-not (Test-Path $installer)) { throw "Download incomplete: install.ps1 missing" }

Write-Host "Running installer..."
powershell -ExecutionPolicy Bypass -File $installer -Server $Server -Secret $Secret
