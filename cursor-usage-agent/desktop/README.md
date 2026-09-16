# Cursor Usage desktop app

Electron tray app that enrolls this PC with the company hub and syncs Cursor usage in the background.

## Dev

```bash
cd cursor-usage-agent/agent && npm install
cd ../desktop && npm install && npm start
```

## Build Windows installer + publish to dashboard

```bash
cd cursor-usage-agent/desktop
npm install
npm run dist:publish
```

Copies `CursorUsageSetup-*.exe` and `CursorUsageSetup-latest.exe` into `dashboard/public/downloads/` so `/install` can offer **Download for Windows**.

Users still need Cursor Desktop signed in. The app bundles the agent runtime (via Electron); teammates do not need to run terminal enroll commands.
