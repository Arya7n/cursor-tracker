# Cursor tracker

Company hub for **Cursor usage** across developer PCs.

A small agent on each machine reads the signed-in Cursor Desktop session and reports **plan**, **billing cycle**, **% used**, and **last sync** to a shared admin dashboard. Data lives in Postgres (Neon locally or on Vercel; Docker Postgres on a VM).

Cursor access tokens never leave the developer PC. The hub only stores usage aggregates plus device enrollment.

```
Developer PC (Cursor signed in)
        │  scheduled sync (~20 min)
        ▼
  HTTPS  /api/usage/report
        ▼
  Dashboard  +  Postgres
        ▼
  Admin opens the company URL
```

## What’s on the dashboard

| Field | Source |
| --- | --- |
| Plan | Cursor `GetPlanInfo` |
| Billing cycle | Current period start / end |
| % used | Cursor Auto / included usage percent |
| Last sync | Last successful agent report |

No USD totals, chats, source, or Cursor credentials.

## Repo layout

```
cursor-usage-agent/
  agent/          Local CLI (scan, enroll, sync)
  dashboard/      Next.js 15 admin hub
  packaging/      Windows / macOS employee installers
  docs/DEPLOY.md  Full company rollout
```

## Requirements

- **Node.js 22+** (agent uses `node:sqlite`)
- Developer stays signed in to **Cursor Desktop**
- Postgres: [Neon](https://neon.tech) (Vercel / local) or Docker Compose (office VM)

## Local development

```bash
git clone https://github.com/<org>/cursor-tracker.git
cd cursor-tracker/cursor-usage-agent/dashboard
cp .env.example .env.local
# set ENROLLMENT_SECRET and DATABASE_URL
npm install
npm run dev
```

Open http://localhost:3000

On this PC, enroll the agent against the local hub:

```bash
cd cursor-usage-agent/agent
npm install
# Windows PowerShell
$env:CURSOR_USAGE_SERVER="http://localhost:3000"
$env:CURSOR_USAGE_ENROLLMENT_SECRET="your-secret"
npm run enroll
npm run sync
```

## Company rollout

Two pieces: an always-on dashboard, and a one-time installer per developer.

**VM + Docker**

```bash
cd cursor-usage-agent
cp .env.example .env   # ENROLLMENT_SECRET, ADMIN_USER, ADMIN_PASSWORD
docker compose up -d --build
```

Dashboard listens on port **3000**. Put HTTPS in front (`cursor-usage.yourcompany.com`).

**Vercel + Neon**

1. Create a Neon project and copy the pooled `DATABASE_URL`
2. Deploy the `cursor-usage-agent/dashboard` folder
3. Set `DATABASE_URL`, `ENROLLMENT_SECRET`, and optional `ADMIN_USER` / `ADMIN_PASSWORD`

Developers should not get a zip if they can open the install page:

`https://cursor-usage.yourcompany.com/install`

Full steps: [cursor-usage-agent/docs/DEPLOY.md](cursor-usage-agent/docs/DEPLOY.md)

## Employee install

Needs Node.js 22 LTS and Cursor Desktop signed in.

**Windows**

```powershell
powershell -ExecutionPolicy Bypass -File .\install.ps1 -Server "https://cursor-usage.yourcompany.com" -Secret "ENROLLMENT_SECRET"
```

Installs to `%LOCALAPPDATA%\CursorUsageAgent` and a scheduled task every 20 minutes. Uninstall: `uninstall.ps1`.

**macOS**

```bash
bash install.sh "https://cursor-usage.yourcompany.com" "ENROLLMENT_SECRET"
```

Installs to `~/Library/Application Support/CursorUsageAgent` and a Launch Agent every 20 minutes. Uninstall: `bash uninstall.sh`.

The row appears on the dashboard after the first successful sync.

## Security

- Agent is read-only against Cursor’s own usage APIs for the signed-in user
- Cursor tokens stay in memory on the PC and are never POSTed to the hub
- Hub auth: shared enrollment secret for agents; optional HTTP basic auth for admins
- Do not commit `.env` / `.env.local`

See [cursor-usage-agent/docs/security.md](cursor-usage-agent/docs/security.md).
