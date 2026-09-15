# Company rollout

Two artifacts:

1. **Always-on VM** — Docker dashboard with a stable URL  
2. **Employee zip** — installer each developer runs once  

---

## A. Put the dashboard on a VM

Use any always-on Linux VM (AWS, Azure, GCP, a office server).

```bash
git clone <this-repo>
cd cursor-usage-agent
cp .env.example .env
# edit .env — long random ENROLLMENT_SECRET + ADMIN_USER/PASSWORD
docker compose up -d --build
```

That starts **Postgres** and the dashboard. Data lives in the `pg-data` volume.

For **Vercel**: create a free [Neon](https://neon.tech) Postgres database, set `DATABASE_URL` (and `ENROLLMENT_SECRET` / admin env) in the Vercel project, deploy the `dashboard` folder. Do not use the JSON file store on Vercel.

Dashboard listens on port **3000**.

Give it a **stable URL**:

- DNS: `cursor-usage.yourcompany.com` → VM IP  
- Put HTTPS in front (Cloudflare, Caddy, nginx, load balancer)

Example nginx:

```nginx
server {
  listen 443 ssl;
  server_name cursor-usage.yourcompany.com;
  location / {
    proxy_pass http://127.0.0.1:3000;
  }
}
```

Open in a browser:

`https://cursor-usage.yourcompany.com`  
(admin basic auth from `ADMIN_USER` / `ADMIN_PASSWORD`)

Agents post to the same host. They do **not** use admin basic auth; they use the enrollment secret / device token.

Firewall: allow 80/443 (and 3000 only if you skip a reverse proxy).

---

## B. Build the zip you send to developers

On a Windows machine with this repo:

```powershell
cd cursor-usage-agent\packaging\windows
powershell -ExecutionPolicy Bypass -File .\pack-employee-zip.ps1
```

Creates:

`cursor-usage-agent/dist/CursorUsageAgent-employee.zip`

Employees should **not** need a zip. Use the install page on the dashboard:

`http://SERVER:3000/install`

They run the PowerShell command shown there. Files download over HTTP from the hub.

Other options if email blocks zips:

- Copy the **folder** `dist/CursorUsageAgent-employee` (not the .zip) to a file share or USB
- Internal git clone of `cursor-usage-agent/agent` then `npm run enroll` / `npm run sync`
  

---

## C. What each developer does

Open `https://cursor-usage.yourcompany.com/install` and run the command for their OS.

Need **Node.js 22 LTS** and to stay signed in to **Cursor Desktop**.

### Windows

```powershell
powershell -ExecutionPolicy Bypass -File .\install.ps1 -Server "https://cursor-usage.yourcompany.com" -Secret "ENROLLMENT_SECRET"
```

Installs to `%LOCALAPPDATA%\CursorUsageAgent` and a scheduled task every **20 minutes**. Uninstall: `uninstall.ps1`.

### Mac

```bash
bash install.sh "https://cursor-usage.yourcompany.com" "ENROLLMENT_SECRET"
```

Installs to `~/Library/Application Support/CursorUsageAgent` and a Launch Agent every **20 minutes**. Uninstall: `bash uninstall.sh`.

Their row appears on the admin dashboard after the first successful sync.

---

## Data path

```
Developer PC (Cursor signed in)
  → agent scheduled sync
  → HTTPS POST /api/usage/report  (usage $ / % / email only)
  → VM disk volume (usage-data)
  → Admin opens https://cursor-usage.yourcompany.com
```

Cursor tokens never leave the developer PC.
