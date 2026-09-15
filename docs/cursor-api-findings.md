# Cursor Personal API Findings

Research date: documented against Cursor public docs at [cursor.com/docs/api](https://cursor.com/docs/api).

This POC probes **only officially documented** endpoints using a server-side `CURSOR_API_KEY`. It does not scrape cursor.com and does not use cookies or passwords.

Live results for *your* key appear in the dashboard (`GET /api/cursor/discovery`). This file captures what the documentation claims and what the POC is designed to verify.

---

## Authentication

| Item | Finding |
| --- | --- |
| Method | **Basic Auth** with API key as username and empty password (`Authorization: Basic base64(KEY:)`). Cloud Agents API also accepts Bearer. |
| Personal key creation | Cursor Dashboard → API Keys (user / Cloud Agents). Format often `crsr_…` or `cursor_…` depending on product surface. |
| Team admin keys | Separate Admin / Analytics keys with scopes such as `admin:*` — **Enterprise**. |
| Rate limits | Default ~20 req/min unless endpoint documents otherwise. Cloud Agents `/v1/repositories` is especially strict (1/min, 30/hour). Analytics supports ETag caching (15 min). |
| Recommended polling | Admin daily usage / filtered events: **at most once per hour**. Analytics: prefer `7d` / `30d` shortcuts + ETags. |

---

## Account

**Endpoint:** `GET /v1/me` (also legacy `GET /v0/me`)

**Docs:** [Cloud Agents API](https://cursor.com/docs/cloud-agent/api/endpoints)

**Authentication:** Personal user API key or service-account key

**Result (expected for personal key):** **AVAILABLE**

**Data documented:**

- `apiKeyName`
- `createdAt`
- `userId` (user-scoped keys)
- `userEmail` (user-scoped keys)
- `userFirstName` / `userLastName` (user-scoped keys)

**Unavailable / not returned by this endpoint:**

- Subscription / plan name
- Usage quotas or remaining allowance
- Billing or spend
- Organization/team membership details

---

## Usage (account-wide IDE / subscription)

**Documented endpoints:**

- `POST /teams/daily-usage-data` — Admin API, **Enterprise**
- `POST /teams/filtered-usage-events` — Admin API, **Enterprise**
- Analytics team / by-user metrics — Analytics API, **Enterprise**

**Personal Cloud Agents API:**

- **Result:** **NOT AVAILABLE** for account-wide Cursor IDE usage (Tab, Chat, Composer, premium requests, monthly limits).

**Related personal endpoint:**

- `GET /v1/agents/{id}/usage` — **AVAILABLE** only for **that cloud agent’s token usage** (input/output/cache tokens). This is **not** subscription monthly usage.

---

## Usage history

**Endpoint:** Admin `POST /teams/daily-usage-data` / `POST /teams/filtered-usage-events`

**Result for personal key (expected):** **NOT AVAILABLE**

**Unavailable fields via personal key:** daily request counts, costs, model breakdown history, Tab/Agent edit history.

---

## Spending / billing

**Endpoint:** `POST /teams/spend` (Admin API, Enterprise)

**Result for personal key (expected):** **NOT AVAILABLE**

**Unavailable:** current spend, monthly spend, usage-based spend, subscription cost, per-model cost, remaining budget, billing cycle — none are documented on Cloud Agents `/v1/*` for personal keys.

---

## Models

| Endpoint | Purpose | Usage metrics? |
| --- | --- | --- |
| `GET /v1/models` | List model IDs / params for launching Cloud Agents | **No** |
| `GET /analytics/by-user/models` | Model usage by user | **Yes** (Enterprise Analytics) |

---

## Which APIs require what

| API | Availability (docs) | Personal user key |
| --- | --- | --- |
| Cloud Agents API (`/v1/*`, `/v0/*`) | Beta — all plans | Expected to work for agent/metadata endpoints |
| Admin API (`/teams/*`) | Enterprise teams | Expected **401/403** |
| Analytics API (`/analytics/*`) | Enterprise teams | Expected **401/403** |
| AI Code Tracking / Bugbot / Org Admin | Enterprise / org | Not probed beyond docs classification; not personal usage APIs |

---

## What is NOT available (personal key)

- Monthly / daily IDE usage totals
- Remaining usage / hard limits
- Premium request balances
- Spending and invoices
- Per-model cost for the personal subscription
- Company-wide multi-user analytics
- Tab / Chat / Composer usage breakdowns

Mark any undocumented surface as: **Not confirmed / unavailable**.

---

## Conclusion (documentation-based; confirm with live discovery)

```
PERSONAL API KEY CAPABILITIES

Account data:       AVAILABLE          (/v1/me)
Usage data:         NOT AVAILABLE      (account-wide)
Usage limits:       NOT AVAILABLE
Remaining usage:    NOT AVAILABLE
Usage history:      NOT AVAILABLE
Model usage:        NOT AVAILABLE      (list models ≠ usage)
Token usage:        PARTIAL            (per cloud-agent only)
Spending:           NOT AVAILABLE
Billing data:       NOT AVAILABLE
```

### CAN THIS BE USED TO BUILD A MULTI-EMPLOYEE COMPANY CURSOR USAGE DASHBOARD?

**NO** (with a personal API key alone).

**PARTIALLY / YES** only if the company has **Enterprise Admin + Analytics API** keys and uses those documented team endpoints — not personal Cloud Agents keys.

---

## Sources

1. https://cursor.com/docs/api
2. https://cursor.com/docs/cloud-agent/api/endpoints
3. https://cursor.com/docs/cloud-agent/api/v0
4. https://cursor.com/docs/account/teams/admin-api
5. https://cursor.com/docs/account/teams/analytics-api
