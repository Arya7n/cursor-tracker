#!/usr/bin/env bash
set -euo pipefail

launchctl bootout "gui/$(id -u)/com.cursorusage.agent" 2>/dev/null || true
rm -f "$HOME/Library/LaunchAgents/com.cursorusage.agent.plist"
rm -rf "$HOME/Library/Application Support/CursorUsageAgent"
rm -rf "$HOME/.cursor-usage-agent"

echo "Cursor Usage Agent removed from this Mac."
