# Cursor Usage Agent

Company hub: **Next.js dashboard + Postgres**, plus an agent on each developer PC.

```
Developer PCs  --/install-->  https://your-hub
                                    ↓
                              Team dashboard
```

Full steps: **[docs/DEPLOY.md](docs/DEPLOY.md)** · root **[README](../README.md)**

### Hub (once)

Neon (or Docker Postgres) + deploy `dashboard/` to Vercel, or:

```bash
cp .env.example .env
docker compose up -d --build
```

Set `ENROLLMENT_SECRET` and `DATABASE_URL`. Optional `ADMIN_USER` / `ADMIN_PASSWORD` for the login page.

### Developers

Open `https://your-hub/install`.

- **Windows / Linux** — desktop app, paste hub URL, enroll
- **macOS** — CLI installer (Node 22) until a desktop build exists

They must stay signed in to Cursor Desktop. Reports run about every 20 minutes.

### Local hub (this PC)

```bash
cd dashboard && npm install && npm run dev
```

Open http://localhost:3000
