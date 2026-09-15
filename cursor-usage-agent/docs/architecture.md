# Architecture

## Target (eventual)

```
Developer PC
  → Cursor IDE
  → Cursor Usage Agent (local)
  → Company Backend API (NestJS)
  → PostgreSQL
  → Company Dashboard (Next.js)
```

## Phase 1 (this POC)

```
Developer PC
  → Cursor Usage Agent (`cursor-agent scan|report|test-usage`)
  → Local JSON report / snapshot
  → docs/findings.md + docs/POC_RESULT.md
```

Server and dashboard are stubs only until usage collection is proven.

## Planned tables (deferred)

**employees** — id, email, name, department, status, created_at  
**devices** — id, employee_id, device_name, operating_system, agent_version, last_seen_at, created_at  
**usage_snapshots** — id, employee_id, device_id, timestamp, billing_period, usage_data (jsonb), created_at

Never store Cursor credentials.

## Offline support (stub)

`cursor-agent snapshot` writes `.cursor-agent/snapshots/*.json` for later upload when online.
