# Cursor Usage Agent

Company rollout: **always-on dashboard VM** + **employee zip**.

Full steps: **[docs/DEPLOY.md](docs/DEPLOY.md)**

```
Developer PCs  --install.ps1-->  https://cursor-usage.yourcompany.com
                                      ↓
                                 Admin dashboard
```

### Admin (once)

```bash
cd cursor-usage-agent
cp .env.example .env   # set secrets
docker compose up -d --build
```

### Zip for employees (once)

```powershell
cd packaging\windows
powershell -ExecutionPolicy Bypass -File .\pack-employee-zip.ps1
```

Send `dist/CursorUsageAgent-employee.zip` + dashboard URL + enrollment secret.

### Local dev (this PC only)

```bash
cd dashboard && npm install && npm run dev
```
