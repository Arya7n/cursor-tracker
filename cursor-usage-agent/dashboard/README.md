# Cursor Usage Dashboard

Shows live plan usage from the local agent (signed-in Cursor Desktop).

```bash
# Terminal 1 — not required; dashboard calls the agent on each refresh
cd ../agent && npm install

# Terminal 2
cd dashboard
npm install
npm run dev
```

Open http://localhost:3000

API: `GET /api/usage` → runs `agent report` and returns JSON (secrets redacted).
