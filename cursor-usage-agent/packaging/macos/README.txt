Cursor Usage Agent — Mac

Need:
- Node.js 22 LTS (https://nodejs.org)
- Cursor Desktop installed and signed in

Install (from this folder, after the kit is downloaded):

  bash install.sh "https://YOUR-DASHBOARD" "ENROLLMENT_SECRET"

Or from the dashboard /install page, run the Mac one-liner.

That copies the agent to:
  ~/Library/Application Support/CursorUsageAgent
enrolls this Mac, uploads the first usage snapshot, and loads a Launch Agent
that syncs about every 20 minutes.

Uninstall:

  bash uninstall.sh

Cursor login tokens never leave this Mac.
