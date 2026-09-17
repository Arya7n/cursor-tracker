# Cursor tracker

Company hub for **Cursor usage** across developer PCs.

A small agent on each machine reads the signed-in Cursor Desktop session and reports **plan**, **billing cycle**, **% used**, and **last sync** to a shared dashboard. Data lives in Postgres ([Neon](https://neon.tech) on Vercel or locally; Docker Postgres on a VM).

Cursor access tokens never leave the developer PC. The hub only stores usage aggregates plus device enrollment.

```
Developer PC (Cursor signed in)
        │  desktop app or CLI agent (~20 min)
        ▼
  HTTPS  /api/usage/report
        ▼
  Next.js hub  +  Postgres (Neon)
        ▼
  Team dashboard
```

## How it works

1. **Database** — Neon (or Docker Postgres) with `DATABASE_URL`.
2. **Hub** — this Next.js app, hosted on Vercel or a VM. It is the API and the UI.
3. **Agents** — each developer installs from `/install`. They stay signed in to Cursor Desktop. The agent reports about every 20 minutes.
4. **Team page** — open the hub URL, sign in if admin login is enabled, and watch usage. Click a person for Auto / included, API usage, trend history, and devices.

The agent does **not** run on Vercel. Only the hub does.

## What’s on the dashboard

| Field | Source |
| --- | --- |
| Plan | Cursor `GetPlanInfo` |
| Billing cycle | Current period start / end |
| % used | Cursor Auto / included usage percent |
| Auto / API | Same meters the IDE shows |
| Last sync | Last successful agent report |
| Devices | Enrolled machines for that person |
| Trend | Recent sync history |

No USD totals, chats, source, or Cursor credentials. Nobody is ranked High / Watch / On track.

**Remove from hub** deletes that person from the dashboard. If their agent is still installed, they show up again on the next sync. Uninstall on the PC is what stops them from returning.

**Sync now** asks enrolled devices to report on their next check-in. It cannot push into other PCs.

## Repo layout

```
cursor-usage-agent/
  agent/          Local CLI (scan, enroll, sync, tick)
  desktop/        Electron tray app (Windows / Linux builds)
  dashboard/      Next.js 15 hub (UI + API)
  packaging/      Windows / macOS CLI installers
  docs/DEPLOY.md  Rollout notes
```

## Requirements

- **Node.js 22+** (CLI agent uses `node:sqlite`)
- Developer stays signed in to **Cursor Desktop**
- Postgres: Neon (Vercel / local) or Docker Compose (office VM)

## Local development

```bash
git clone https://github.com/<org>/cursor-tracker.git
cd cursor-tracker/cursor-usage-agent/dashboard
cp .env.example .env.local
# set ENROLLMENT_SECRET and DATABASE_URL (Neon pooled string)
# optional: ADMIN_USER + ADMIN_PASSWORD for the login page
npm install
npm run dev
```

Open http://localhost:3000 — **Team** for usage, **Install** for the employee page.

Enroll this PC against the local hub (CLI):

```bash
cd cursor-usage-agent/agent
npm install
# Windows PowerShell
$env:CURSOR_USAGE_SERVER="http://localhost:3000"
$env:CURSOR_USAGE_ENROLLMENT_SECRET="your-secret"
npm run enroll
npm run sync
```

Or run the desktop app:

```bash
cd cursor-usage-agent/agent && npm install
cd ../desktop && npm install && npm start
```

Paste `http://localhost:3000`, load the enrollment secret, then **Enroll & sync**.

## Host the hub

Agents need a **stable HTTPS URL**. `npm run dev` on a laptop is only for you.

**Vercel + Neon (usual cloud setup)**

1. Create a Neon project and copy the **pooled** `DATABASE_URL`
2. Deploy the `cursor-usage-agent/dashboard` folder
3. Set `DATABASE_URL`, `ENROLLMENT_SECRET`
4. Optional: `ADMIN_USER`, `ADMIN_PASSWORD`, `SESSION_SECRET` (login page)
5. Optional: `WINDOWS_DOWNLOAD_URL` and `LINUX_DOWNLOAD_URL` (GitHub Release assets for the desktop installers)

Point every agent at `https://your-app.vercel.app`. If PCs were enrolled to `localhost`, re-install with the new hub URL.

**VM + Docker**

```bash
cd cursor-usage-agent
cp .env.example .env
docker compose up -d --build
```

Put HTTPS in front (`cursor-usage.yourcompany.com`). Same Neon URL can be used instead of Compose Postgres.

More detail: [cursor-usage-agent/docs/DEPLOY.md](cursor-usage-agent/docs/DEPLOY.md)

## Add developers

Send them to `/install` on the hub (not a zip, if they can open that page).

Need **Cursor Desktop signed in**. The Windows/Linux **desktop app** bundles the agent; they paste the hub URL and enroll.

**macOS** (CLI until a desktop build exists) needs **Node.js 22 LTS**. Use **Advanced: CLI installer** on `/install`, or:

```bash
bash install.sh "https://your-hub" "ENROLLMENT_SECRET"
```

**Windows CLI** (Node 22, hidden Task Scheduler every 20 minutes):

```powershell
powershell -ExecutionPolicy Bypass -File .\install.ps1 -Server "https://your-hub" -Secret "ENROLLMENT_SECRET"
```

The row appears after the first successful sync.

### Uninstall the CLI agent

**Windows** (PowerShell, as that user):

```powershell
schtasks /Delete /TN CursorUsageAgentSync /F
Remove-Item -Recurse -Force "$env:LOCALAPPDATA\CursorUsageAgent"
Remove-Item -Recurse -Force "$env:USERPROFILE\.cursor-usage-agent"
```

**macOS:**

```bash
launchctl bootout "gui/$(id -u)/com.cursorusage.agent" 2>/dev/null || true
rm -f "$HOME/Library/LaunchAgents/com.cursorusage.agent.plist"
rm -rf "$HOME/Library/Application Support/CursorUsageAgent"
rm -rf "$HOME/.cursor-usage-agent"
```

That does not delete their row on the hub. Use **Remove** on the dashboard for that.

## Security

- Agent is read-only against Cursor’s own usage APIs for the signed-in user
- Cursor tokens stay on the PC and are never POSTed to the hub
- Agents enroll with `ENROLLMENT_SECRET` / a device token; `/install` and agent APIs stay public
- Optional hub login: `ADMIN_USER` + `ADMIN_PASSWORD` (cookie session, not HTTP basic)
- Do not commit `.env` / `.env.local`

See [cursor-usage-agent/docs/security.md](cursor-usage-agent/docs/security.md).
