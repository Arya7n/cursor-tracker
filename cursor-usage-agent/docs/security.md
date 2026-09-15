# Security

## Principles

1. **Read-only POC** — never modify Cursor installs, config, or auth state.
2. **Data minimization** — only usage/account metadata candidates.
3. **No secrets in reports** — redact tokens, API keys, cookies; never print `CURSOR_API_KEY`.
4. **No private content** — never collect source code, prompts, chats, files, keystrokes, screenshots.

## Allowed sources (Phase 1 + usage)

| Source | Purpose |
| --- | --- |
| Cursor install path + `package.json` version | Install/version detection |
| `tasklist` for `Cursor.exe` | Process presence |
| IDE `state.vscdb` **non-secret** fields | Email / membership |
| IDE access token (**ephemeral, in-memory only**) | Call DashboardService usage RPCs for the signed-in user |
| `GetCurrentPeriodUsage` / `GetPlanInfo` | Plan usage meters |

## Token handling

- Token is read only to call Cursor’s own usage endpoints for **this machine’s signed-in user**
- Token is **never** written to scan/report/snapshot JSON
- Token must **never** be sent to the company backend — only usage aggregates

## Forbidden sources

- Browser cookie scraping
- Reading chat/prompt/source contents
- Logging or persisting access/refresh tokens
- Forwarding IDE credentials to third parties

## Agent ↔ company backend (future)

Use **device enrollment tokens** issued by the company server.  
Do **not** forward Cursor credentials to the company backend.
