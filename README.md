# Cursor Personal API Explorer

Proof-of-concept that answers one question: **what can a single personal Cursor API key actually retrieve?**

It does **not** scrape the Cursor website, does **not** use passwords or browser cookies, and keeps `CURSOR_API_KEY` **server-side only**.

```
Browser  →  Next.js (UI)  →  NestJS (this app)  →  api.cursor.com
```

---

## Stack

| Layer | Tech |
| --- | --- |
| Backend | Node.js, TypeScript, NestJS, REST |
| Frontend | Next.js, TypeScript, Tailwind CSS, shadcn-style UI primitives |
| Data | PostgreSQL + Drizzle **optional** (stub only — POC does not persist secrets) |

---

## 1. Install

```bash
# From repo root
cd backend && npm install
cd ../frontend && npm install
```

---

## 2. Configure `CURSOR_API_KEY`

```bash
cp .env.example .env
```

Edit `.env`:

```env
CURSOR_API_KEY=your_key_here
CURSOR_API_BASE_URL=https://api.cursor.com
PORT=3001
FRONTEND_ORIGIN=http://localhost:3000
```

Create a **user / Cloud Agents** API key from [Cursor Dashboard → API Keys](https://cursor.com/dashboard/api) (or Integrations, depending on your dashboard version).

Also copy the frontend env example:

```bash
cp frontend/.env.local.example frontend/.env.local
```

**Never commit `.env`.** Never put the key in `NEXT_PUBLIC_*` variables or `localStorage`.

---

## 3. Start backend

```bash
cd backend
npm run start:dev
```

Health check: http://localhost:3001/api/health

Nest routes (global prefix `api`):

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/cursor/discovery` | Probe documented Cursor endpoints |
| GET | `/api/cursor/account` | Normalize `/v1/me` account metadata |
| GET | `/api/cursor/usage` | Account usage (or explicit unavailability) |
| GET | `/api/cursor/spending` | Spending (or explicit unavailability) |
| GET | `/api/cursor/usage/history` | History (or explicit unavailability) |
| GET | `/api/cursor/dashboard` | Aggregated dashboard payload |
| GET | `/api/cursor/debug` | Redacted raw inspector payloads |

---

## 4. Start frontend

```bash
cd frontend
npm run dev
```

Open:

- Dashboard: http://localhost:3000
- Debug inspector: http://localhost:3000/debug

---

## 5. Endpoints tested (documented only)

### Cloud Agents (personal keys — docs say available on all plans)

- `GET /v1/me`
- `GET /v1/models`
- `GET /v1/agents`
- `GET /v1/repositories` (strict rate limits)
- `GET /v1/agents/{id}/usage` (dynamic, if an agent exists)
- Legacy: `GET /v0/me`, `GET /v0/models`, `GET /v0/agents`

### Admin API (Enterprise — expected fail for personal keys)

- `GET /teams/members`
- `POST /teams/daily-usage-data`
- `POST /teams/spend`
- `POST /teams/filtered-usage-events`

### Analytics API (Enterprise — expected fail for personal keys)

- `GET /analytics/team/dau`
- `GET /analytics/by-user/models`

No undocumented paths are invented. See `docs/cursor-api-findings.md`.

---

## 6–7. Which endpoints work / fail

Run discovery with your key. The UI table and `GET /api/cursor/discovery` show live `status`, `accessible`, and messages:

| Status | Meaning |
| --- | --- |
| 200 | Accessible |
| 401 | Authentication failed |
| 403 | Authenticated but not authorized (often Enterprise-only) |
| 404 | Endpoint unavailable |
| 429 | Rate limited |
| 5xx | Cursor server error |

**Documentation-based expectation for a personal key:**

| Worked (expected) | Failed (expected) |
| --- | --- |
| `/v1/me`, `/v1/models`, `/v1/agents`, `/v0/*` equivalents | `/teams/*` Admin usage & spend |
| Optional `/v1/agents/{id}/usage` if you have cloud agents | `/analytics/*` |

---

## 8. Information typically accessible

- API key name / creation time
- User email, user id, name fields (user-scoped keys)
- Cloud agent list / models list / repositories (subject to auth & rate limits)
- Per-**cloud-agent** token usage (not IDE subscription usage)

---

## 9. Information typically inaccessible

- Monthly / remaining / premium IDE usage
- Usage history for Tab / Chat / Composer
- Spending, budgets, billing cycle
- Per-model cost for the personal plan
- Multi-employee team analytics

When a metric is missing, the API returns:

```json
{ "available": false, "reason": "Not exposed by this endpoint" }
```

---

## 10. Multi-employee company dashboard?

**NO** — not with personal API keys alone.

Company-wide usage/spend APIs are documented for **Enterprise Admin + Analytics** keys. A personal key is the wrong credential for an employee usage dashboard.

To expand later: use Enterprise team admin keys (server-side), map members via `/teams/members`, usage via `/teams/daily-usage-data`, spend via `/teams/spend`, analytics via `/analytics/*`. Optionally persist non-secret aggregates in PostgreSQL (Drizzle stub is ready).

---

## Architecture notes

```
backend/src/modules/cursor/
  cursor.client.ts     # HTTP to Cursor only
  cursor.service.ts    # Auth check, discovery, normalize
  cursor.controller.ts # REST for the Next.js UI
  cursor.endpoints.ts  # Documented catalog only
  cursor.types.ts
  cursor.redact.ts     # Strip secrets from responses/logs
```

PostgreSQL is optional. Sensitive Cursor payloads are not persisted by default.

---

## PERSONAL API KEY CAPABILITIES

(Confirm live via the dashboard conclusion card.)

```
Account data:       AVAILABLE / NOT AVAILABLE
Usage data:         AVAILABLE / NOT AVAILABLE
Usage limits:       AVAILABLE / NOT AVAILABLE
Remaining usage:    AVAILABLE / NOT AVAILABLE
Usage history:      AVAILABLE / NOT AVAILABLE
Model usage:        AVAILABLE / NOT AVAILABLE
Token usage:        AVAILABLE / NOT AVAILABLE
Spending:           AVAILABLE / NOT AVAILABLE
Billing data:       AVAILABLE / NOT AVAILABLE
```

### Recommendation

**CAN THIS BE USED TO BUILD A MULTI-EMPLOYEE COMPANY CURSOR USAGE DASHBOARD?**

**NO** for personal keys · **YES / PARTIALLY** only with Enterprise Admin/Analytics APIs.

---

## Security checklist

- [x] `.env` gitignored
- [x] `.env.example` without secrets
- [x] Key never sent to the browser
- [x] Authorization headers redacted in debug UI
- [x] No password / cookie / scrape flows
