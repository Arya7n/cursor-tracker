# Company rollout

Two pieces:

1. **Always-on hub** — Next.js dashboard with a stable HTTPS URL and Postgres  
2. **Per-PC agent** — desktop app (Windows / Linux) or CLI (macOS / advanced)

Cursor tokens never leave the developer PC.

```
Developer PC (Cursor signed in)
  → agent scheduled sync (~20 min)
  → HTTPS POST /api/usage/report
  → Neon / Postgres
  → Team opens the hub URL
```

---

## A. Database

Create a [Neon](https://neon.tech) project and copy the **pooled** `DATABASE_URL`.

On a VM you can skip Neon and use Compose Postgres instead (`DATABASE_SSL=false`).

---

## B. Put the dashboard online

### Vercel + Neon

1. Deploy the `dashboard` folder  
2. Set `DATABASE_URL`, `ENROLLMENT_SECRET`  
3. Optional: `ADMIN_USER`, `ADMIN_PASSWORD`, `SESSION_SECRET`  
4. Optional: `WINDOWS_DOWNLOAD_URL`, `LINUX_DOWNLOAD_URL` (GitHub Release `.exe` / AppImage)

Hub URL example: `https://your-app.vercel.app`

**Sync now** on Vercel only flags enrolled PCs. It cannot run Cursor on the serverless host.

### VM + Docker

```bash
git clone <this-repo>
cd cursor-usage-agent
cp .env.example .env
# ENROLLMENT_SECRET, DATABASE_URL (or Compose defaults), optional admin login
docker compose up -d --build
```

Dashboard listens on port **3000**. Put HTTPS in front:

```nginx
server {
  listen 443 ssl;
  server_name cursor-usage.yourcompany.com;
  location / {
    proxy_pass http://127.0.0.1:3000;
  }
}
```

Agents post to the same host. They do **not** use the admin login; they use the enrollment secret / device token.

Firewall: allow 80/443 (and 3000 only if you skip a reverse proxy).

---

## C. Desktop installers (optional)

From a machine with the repo:

```bash
cd cursor-usage-agent/desktop
npm install
npm run dist:publish
```

That copies Windows setup into `dashboard/public/downloads/` so `/install` can offer **Download for Windows**. For Vercel, publish the files as GitHub Release assets and set `WINDOWS_DOWNLOAD_URL` / `LINUX_DOWNLOAD_URL`.

macOS desktop build is not ready; use the CLI installer.

---

## D. What each developer does

Open `https://your-hub/install`.

Need **Cursor Desktop signed in**.

**Windows / Linux** — download the app, paste the hub URL, load the secret, Enroll & sync.

**macOS / CLI** — Node.js 22 LTS, then the command on the install page, or:

```powershell
powershell -ExecutionPolicy Bypass -File .\install.ps1 -Server "https://your-hub" -Secret "ENROLLMENT_SECRET"
```

```bash
bash install.sh "https://your-hub" "ENROLLMENT_SECRET"
```

CLI install: Windows Task Scheduler or macOS Launch Agent every **20 minutes**. Uninstall: `uninstall.ps1` / `bash uninstall.sh`.

The row appears after the first successful sync.

If they were enrolled to `localhost`, re-install with the public hub URL. Keep the **same** `ENROLLMENT_SECRET`.
