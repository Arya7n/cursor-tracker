import postgres from 'postgres';

type Sql = ReturnType<typeof postgres>;

const globalForSql = globalThis as unknown as {
  cursorSql?: Sql;
  cursorSqlUrl?: string;
};

function databaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      'DATABASE_URL is required. Use local Docker Postgres or a Neon URL for Vercel.',
    );
  }
  return url;
}

function sslOption(url: string) {
  if (process.env.DATABASE_SSL === 'false') return false;
  if (url.includes('localhost') || url.includes('127.0.0.1')) return false;
  return 'require' as const;
}

export function getSql(): Sql {
  const url = databaseUrl();
  if (!globalForSql.cursorSql || globalForSql.cursorSqlUrl !== url) {
    if (globalForSql.cursorSql) {
      void globalForSql.cursorSql.end({ timeout: 1 });
    }
    globalForSql.cursorSqlUrl = url;
    globalForSql.cursorSql = postgres(url, {
      max: 1,
      ssl: sslOption(url),
      idle_timeout: 20,
      connect_timeout: 30,
    });
    migrated = null;
  }
  return globalForSql.cursorSql;
}

let migrated: Promise<void> | null = null;

export function ensureSchema(): Promise<void> {
  if (!migrated) migrated = runMigrations();
  return migrated;
}

async function runMigrations() {
  const sql = getSql();
  await sql`
    CREATE TABLE IF NOT EXISTS employees (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      department TEXT NOT NULL DEFAULT 'unassigned',
      status TEXT NOT NULL DEFAULT 'active',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS devices (
      id TEXT PRIMARY KEY,
      employee_id TEXT NOT NULL REFERENCES employees(id),
      device_name TEXT NOT NULL,
      operating_system TEXT NOT NULL,
      architecture TEXT NOT NULL,
      agent_version TEXT NOT NULL,
      cursor_version TEXT,
      token_hash TEXT NOT NULL,
      last_seen_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (employee_id, device_name)
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS snapshots (
      id TEXT PRIMARY KEY,
      employee_id TEXT NOT NULL REFERENCES employees(id),
      device_id TEXT NOT NULL REFERENCES devices(id),
      timestamp TIMESTAMPTZ NOT NULL,
      billing_period TEXT,
      usage_data JSONB NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS snapshots_employee_ts ON snapshots (employee_id, timestamp DESC)`;
  await sql`CREATE INDEX IF NOT EXISTS devices_token_hash ON devices (token_hash)`;
  await sql`
    CREATE TABLE IF NOT EXISTS hub_meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
}
