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

Send employees:

- that zip  
- URL: `https://cursor-usage.yourcompany.com`  
- enrollment secret (`ENROLLMENT_SECRET` from the VM `.env`)  
- **not** the admin password  

---

## C. What each developer does

1. Install Node.js LTS: https://nodejs.org  
2. Stay signed in to Cursor Desktop  
3. Unzip, then:

```powershell
powershell -ExecutionPolicy Bypass -File .\install.ps1 -Server "https://cursor-usage.yourcompany.com" -Secret "ENROLLMENT_SECRET"
```

That:

- installs to `%LOCALAPPDATA%\CursorUsageAgent`
- enrolls the PC
- uploads first usage snapshot
- creates a scheduled task every **20 minutes**

Their row appears on the admin dashboard after the first successful sync.

Uninstall: `uninstall.ps1` in the same zip (or in the install folder).

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
