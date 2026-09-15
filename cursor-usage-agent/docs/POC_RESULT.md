# POC Result — Cursor Usage Agent

## What We Can Collect

| Metric | Status |
| --- | --- |
| Cursor install / version / process | AVAILABLE |
| Account email | AVAILABLE (IDE session) |
| Plan name / price | AVAILABLE |
| Current period usage (USD) | AVAILABLE |
| Remaining included usage | AVAILABLE |
| Usage % (total / auto / API) | AVAILABLE |
| Billing cycle + reset date | AVAILABLE |
| On-demand spend fields | AVAILABLE when present |
| Model catalog | PARTIAL (CLI) |
| Per-model usage counts | NOT AVAILABLE |
| Historical usage series | NOT AVAILABLE yet |

## What We Cannot Collect

- Source code, prompts, chats (by design)
- Per-model request/token ledgers from this endpoint
- Usage without a signed-in Cursor Desktop session

## How The Data Is Obtained

1. Detect local Cursor install (read-only).
2. Read non-secret identity from IDE `state.vscdb`.
3. Use the IDE access token **in memory only** to call:
   - `GetCurrentPeriodUsage`
   - `GetPlanInfo`
   (same dashboard service Cursor’s `/usage` UI uses).
4. Emit aggregates only; redact secrets from reports.

## Reliability

`cursor-agent test-usage` re-reads meters multiple times. Values should remain stable unless you use Cursor between reads.

## Security

- No cookies scraped from browser
- No token in reports / snapshots
- Read-only SQLite open
- Do not forward IDE tokens to a company backend — only usage aggregates

## Recommendation

### **B. Local agent can provide the usage data needed for a personal/Pro dashboard**

Fleet rollout still requires: device enrollment, consent, and sending **aggregates only** to your NestJS backend.

Enterprise Admin APIs remain better for org-wide admin views without per-machine agents.
