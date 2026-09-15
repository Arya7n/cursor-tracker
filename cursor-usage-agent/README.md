# Cursor Usage — company hub + PC agent

One dashboard. Many developer PCs.

```
Developer PC  →  cursor-agent sync  →  Admin dashboard (this repo /dashboard)
```

The agent never sends Cursor login tokens. Only usage aggregates + email.

---

## 1. Admin PC (host the dashboard)

```bash
cd cursor-usage-agent/dashboard
copy .env.example .env.local
# set ENROLLMENT_SECRET to a real secret
npm install
npm run dev
```

Open http://localhost:3000  
Click **Sync this PC** to add the admin’s own Cursor usage.

Other PCs need this machine’s LAN IP, e.g. `http://192.168.1.27:3000`.  
Windows Firewall: allow Node/port 3000.

---

## 2. Each developer PC

Install Node.js. Copy `cursor-usage-agent/agent` (or the whole repo). Stay signed in to Cursor Desktop.

```bash
cd cursor-usage-agent/agent
npm install

npm run enroll -- --server http://ADMIN_PC_IP:3000 --secret YOUR_SECRET
npm run sync
```

`sync` reads this PC’s Cursor usage and uploads it. Run it on a schedule (Task Scheduler every 15–30 minutes) or after work.

Config is stored at `%USERPROFILE%\.cursor-usage-agent\config.json` (device token only, not Cursor’s token).

---

## 3. Admin dashboard

http://ADMIN_PC_IP:3000

- Total / active developers
- Average / highest / lowest usage %
- Table: developer, plan, used, remaining, last sync

---

## API (for the agent)

| Method | Path | Auth |
| --- | --- | --- |
| POST | `/api/agents/register` | `x-enrollment-secret` |
| POST | `/api/agents/heartbeat` | `Authorization: Bearer <deviceToken>` |
| POST | `/api/usage/report` | `Authorization: Bearer <deviceToken>` |
| GET | `/api/analytics/overview` | none (LAN POC) |
| GET | `/api/developers` | none (LAN POC) |
| GET | `/api/developers/:id` | none (LAN POC) |
