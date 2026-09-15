# Cursor Usage Agent (local)

Read-only POC agent that investigates **legitimate** local Cursor install + official CLI interfaces for usage metadata.

## Commands

```bash
cd agent
npm install

npm run scan          # human report
npm run report        # JSON report
npm run test-usage    # repeated usage-source probes
npm run snapshot      # save offline snapshot stub

# or
npx tsx src/main.ts scan
```

Optional binary name: `cursor-agent` (via `bin/cursor-agent.js`).

## What it does

- Detects Cursor IDE install/version/process (Windows)
- Detects Cursor Agent CLI (`agent`)
- Calls documented `agent status`, `agent about`, `agent models`
- Records whether plan usage meters are obtainable

## What it never does

- Read cookies, tokens, passwords, chat, source code
- Scrape cursor.com
- Modify Cursor files/config
- Call undocumented auth bypasses

See `../docs/` for findings and POC result.
