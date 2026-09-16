#!/usr/bin/env bash
set -euo pipefail

SERVER="${1:?Usage: ./install.sh https://dashboard-url ENROLLMENT_SECRET}"
SECRET="${2:?Usage: ./install.sh https://dashboard-url ENROLLMENT_SECRET}"
SERVER="${SERVER%/}"

if ! command -v node >/dev/null 2>&1; then
  echo "Install Node.js 22 LTS from https://nodejs.org then retry."
  exit 1
fi

NODE_MAJOR="$(node -p "parseInt(process.versions.node, 10)")"
if [[ "$NODE_MAJOR" -lt 22 ]]; then
  echo "Need Node.js 22 or newer (found $(node -v)). Install LTS from https://nodejs.org"
  exit 1
fi

HERE="$(cd "$(dirname "$0")" && pwd)"
SOURCE="$HERE/agent"
if [[ ! -f "$SOURCE/package.json" ]]; then
  echo "Missing agent/ folder next to install.sh"
  exit 1
fi

INSTALL_DIR="$HOME/Library/Application Support/CursorUsageAgent"
mkdir -p "$INSTALL_DIR"
if command -v ditto >/dev/null 2>&1; then
  ditto "$SOURCE" "$INSTALL_DIR"
else
  cp -R "$SOURCE/." "$INSTALL_DIR/"
fi

cd "$INSTALL_DIR"
export NODE_ENV=development
npm install --include=dev

export CURSOR_USAGE_SERVER="$SERVER"
export CURSOR_USAGE_ENROLLMENT_SECRET="$SECRET"
npm run enroll
npm run sync || echo "First sync failed. Stay signed in to Cursor, then: cd \"$INSTALL_DIR\" && npm run sync"

mkdir -p "$HOME/Library/LaunchAgents"
PLIST="$HOME/Library/LaunchAgents/com.cursorusage.agent.plist"
cat > "$PLIST" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>com.cursorusage.agent</string>
  <key>ProgramArguments</key>
  <array>
    <string>/bin/bash</string>
    <string>-lc</string>
    <string>cd "$INSTALL_DIR" && npm run tick</string>
  </array>
  <key>StartInterval</key>
  <integer>1200</integer>
  <key>RunAtLoad</key>
  <true/>
</dict>
</plist>
EOF

launchctl bootout "gui/$(id -u)/com.cursorusage.agent" 2>/dev/null || true
launchctl bootstrap "gui/$(id -u)" "$PLIST" 2>/dev/null || launchctl load "$PLIST"

echo "Installed. Syncs in the background about every 20 minutes. Dashboard: $SERVER"
echo "Manual sync: cd \"$INSTALL_DIR\" && npm run sync"
echo "Uninstall: bash \"$HERE/uninstall.sh\""
