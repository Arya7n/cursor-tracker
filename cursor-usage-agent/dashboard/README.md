# Cursor Usage Dashboard

Company hub UI + API. Agents on developer PCs report here; this app does not scrape Cursor.

```bash
cp .env.example .env.local
# ENROLLMENT_SECRET, DATABASE_URL (Neon pooled)
# optional ADMIN_USER / ADMIN_PASSWORD
npm install
npm run dev
```

Open http://localhost:3000

- **/** — team usage (search, pagination, Sync now, Remove)
- **/developers/[id]** — plan, cycle, %, Auto / API, trend, devices
- **/install** — desktop downloads + CLI installer
- **/login** — only if `ADMIN_USER` and `ADMIN_PASSWORD` are set

Agent routes (`/api/agents/*`, `/api/usage/report`) stay public so PCs can enroll without a dashboard login.

Vercel: deploy this folder, set the same env vars, use a Neon `DATABASE_URL`. The agent still runs on each PC, not on Vercel.
