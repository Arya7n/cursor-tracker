import { createHash, randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ensureSchema, getSql } from './db';
import { cursorUsagePercent, pickOnDemand } from './percent';

export interface Employee {
  id: string;
  email: string;
  name: string;
  department: string;
  status: 'active' | 'inactive';
  createdAt: string;
}

export interface Device {
  id: string;
  employeeId: string;
  deviceName: string;
  operatingSystem: string;
  architecture: string;
  agentVersion: string;
  cursorVersion: string | null;
  tokenHash: string;
  lastSeenAt: string;
  createdAt: string;
}

export interface UsageSnapshot {
  id: string;
  employeeId: string;
  deviceId: string;
  timestamp: string;
  billingPeriod: string | null;
  usageData: Record<string, unknown>;
  createdAt: string;
}

function iso(v: unknown): string {
  if (v instanceof Date) return v.toISOString();
  if (typeof v === 'string') return v;
  return new Date().toISOString();
}

function str(v: unknown): string | null {
  return typeof v === 'string' && v ? v : null;
}

function mapEmployee(row: Record<string, unknown>): Employee {
  return {
    id: String(row.id),
    email: String(row.email),
    name: String(row.name),
    department: String(row.department),
    status: row.status === 'inactive' ? 'inactive' : 'active',
    createdAt: iso(row.created_at),
  };
}

function mapDevice(row: Record<string, unknown>): Device {
  return {
    id: String(row.id),
    employeeId: String(row.employee_id),
    deviceName: String(row.device_name),
    operatingSystem: String(row.operating_system),
    architecture: String(row.architecture),
    agentVersion: String(row.agent_version),
    cursorVersion: row.cursor_version == null ? null : String(row.cursor_version),
    tokenHash: String(row.token_hash),
    lastSeenAt: iso(row.last_seen_at),
    createdAt: iso(row.created_at),
  };
}

function mapSnapshot(row: Record<string, unknown>): UsageSnapshot {
  const usageData =
    typeof row.usage_data === 'object' && row.usage_data
      ? (row.usage_data as Record<string, unknown>)
      : {};
  return {
    id: String(row.id),
    employeeId: String(row.employee_id),
    deviceId: String(row.device_id),
    timestamp: iso(row.timestamp),
    billingPeriod: row.billing_period == null ? null : String(row.billing_period),
    usageData,
    createdAt: iso(row.created_at),
  };
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function newId(prefix: string): string {
  return `${prefix}_${randomBytes(8).toString('hex')}`;
}

export function newDeviceToken(): string {
  return `dev_${randomBytes(24).toString('hex')}`;
}

export function enrollmentSecret(): string {
  return (
    process.env.ENROLLMENT_SECRET ||
    process.env.CURSOR_USAGE_ENROLLMENT_SECRET ||
    'change-me'
  );
}

let imported = false;

async function ready() {
  await ensureSchema();
  if (!imported) {
    imported = true;
    await importJsonIfEmpty();
  }
}

async function importJsonIfEmpty() {
  const sql = getSql();
  const [{ count }] = await sql<{ count: string }[]>`
    SELECT COUNT(*)::text AS count FROM employees
  `;
  if (Number(count) > 0) return;
  try {
    const raw = readFileSync(join(process.cwd(), 'data', 'company-store.json'), 'utf8');
    const parsed = JSON.parse(raw) as {
      employees?: Employee[];
      devices?: Device[];
      snapshots?: UsageSnapshot[];
    };
    for (const e of parsed.employees ?? []) {
      await sql`
        INSERT INTO employees (id, email, name, department, status, created_at)
        VALUES (${e.id}, ${e.email}, ${e.name}, ${e.department}, ${e.status}, ${e.createdAt})
        ON CONFLICT (id) DO NOTHING
      `;
    }
    for (const d of parsed.devices ?? []) {
      await sql`
        INSERT INTO devices (
          id, employee_id, device_name, operating_system, architecture,
          agent_version, cursor_version, token_hash, last_seen_at, created_at
        )
        VALUES (
          ${d.id}, ${d.employeeId}, ${d.deviceName}, ${d.operatingSystem},
          ${d.architecture}, ${d.agentVersion}, ${d.cursorVersion}, ${d.tokenHash},
          ${d.lastSeenAt}, ${d.createdAt}
        )
        ON CONFLICT (id) DO NOTHING
      `;
    }
    for (const s of parsed.snapshots ?? []) {
      await sql`
        INSERT INTO snapshots (id, employee_id, device_id, timestamp, billing_period, usage_data, created_at)
        VALUES (
          ${s.id}, ${s.employeeId}, ${s.deviceId}, ${s.timestamp}, ${s.billingPeriod},
          ${sql.json(s.usageData as never)}, ${s.createdAt}
        )
        ON CONFLICT (id) DO NOTHING
      `;
    }
  } catch {
    /* no local JSON to import */
  }
}

export async function registerDevice(input: {
  enrollmentSecret: string;
  hostname: string;
  os: string;
  architecture: string;
  agentVersion: string;
  cursorVersion: string | null;
  email: string | null;
  plan: string | null;
}): Promise<{ employee: Employee; device: Device; deviceToken: string }> {
  if (!input.enrollmentSecret || input.enrollmentSecret !== enrollmentSecret()) {
    throw new Error('Invalid enrollment secret');
  }
  await ready();

  const email = (input.email || `unknown@${input.hostname}`).toLowerCase();
  const name = email.split('@')[0] || input.hostname;
  const token = newDeviceToken();
  const now = new Date().toISOString();
  const sql = getSql();

  return sql.begin(async (txn) => {
    const existingEmp = await txn<Record<string, unknown>[]>`
      SELECT * FROM employees WHERE email = ${email} LIMIT 1
    `;
    let employee: Employee;
    if (existingEmp[0]) {
      const row = existingEmp[0];
      await txn`UPDATE employees SET status = 'active' WHERE id = ${row.id as string}`;
      employee = mapEmployee({ ...row, status: 'active' });
    } else {
      employee = {
        id: newId('emp'),
        email,
        name,
        department: 'unassigned',
        status: 'active',
        createdAt: now,
      };
      await txn`
        INSERT INTO employees (id, email, name, department, status, created_at)
        VALUES (${employee.id}, ${employee.email}, ${employee.name}, ${employee.department}, ${employee.status}, ${employee.createdAt})
      `;
    }

    const existingDev = await txn<Record<string, unknown>[]>`
      SELECT * FROM devices
      WHERE employee_id = ${employee.id} AND device_name = ${input.hostname}
      LIMIT 1
    `;
    let device: Device;
    if (existingDev[0]) {
      const id = String(existingDev[0].id);
      await txn`
        UPDATE devices SET
          token_hash = ${hashToken(token)},
          agent_version = ${input.agentVersion},
          cursor_version = ${input.cursorVersion},
          operating_system = ${input.os},
          architecture = ${input.architecture},
          last_seen_at = ${now}
        WHERE id = ${id}
      `;
      device = mapDevice({
        ...existingDev[0],
        token_hash: hashToken(token),
        agent_version: input.agentVersion,
        cursor_version: input.cursorVersion,
        operating_system: input.os,
        architecture: input.architecture,
        last_seen_at: now,
      });
    } else {
      device = {
        id: newId('dev'),
        employeeId: employee.id,
        deviceName: input.hostname,
        operatingSystem: input.os,
        architecture: input.architecture,
        agentVersion: input.agentVersion,
        cursorVersion: input.cursorVersion,
        tokenHash: hashToken(token),
        lastSeenAt: now,
        createdAt: now,
      };
      await txn`
        INSERT INTO devices (
          id, employee_id, device_name, operating_system, architecture,
          agent_version, cursor_version, token_hash, last_seen_at, created_at
        )
        VALUES (
          ${device.id}, ${device.employeeId}, ${device.deviceName}, ${device.operatingSystem},
          ${device.architecture}, ${device.agentVersion}, ${device.cursorVersion}, ${device.tokenHash},
          ${device.lastSeenAt}, ${device.createdAt}
        )
      `;
    }
    return { employee, device, deviceToken: token };
  });
}

export async function findDeviceByToken(token: string): Promise<Device | null> {
  await ready();
  const sql = getSql();
  const rows = await sql<Record<string, unknown>[]>`
    SELECT * FROM devices WHERE token_hash = ${hashToken(token)} LIMIT 1
  `;
  return rows[0] ? mapDevice(rows[0]) : null;
}

export async function heartbeat(token: string, agentVersion?: string) {
  await ready();
  const sql = getSql();
  const hashed = hashToken(token);
  const now = new Date().toISOString();
  const rows = await sql<Record<string, unknown>[]>`
    UPDATE devices SET
      last_seen_at = ${now},
      agent_version = COALESCE(${agentVersion ?? null}, agent_version)
    WHERE token_hash = ${hashed}
    RETURNING *
  `;
  if (!rows[0]) throw new Error('Unknown device');
  const device = mapDevice(rows[0]);
  const requestedAt = await getSyncRequestedAt();
  let syncNow = false;
  if (requestedAt) {
    const latest = await sql<{ timestamp: Date | string }[]>`
      SELECT timestamp FROM snapshots
      WHERE device_id = ${device.id}
      ORDER BY timestamp DESC
      LIMIT 1
    `;
    const last = latest[0]?.timestamp
      ? new Date(latest[0].timestamp).getTime()
      : 0;
    syncNow = !Number.isFinite(last) || last < requestedAt.getTime();
  }
  return { device, syncNow, requestedAt: requestedAt?.toISOString() ?? null };
}

export async function getSyncRequestedAt(): Promise<Date | null> {
  await ready();
  const sql = getSql();
  const rows = await sql<{ value: string }[]>`
    SELECT value FROM hub_meta WHERE key = 'sync_requested_at' LIMIT 1
  `;
  if (!rows[0]?.value) return null;
  const t = new Date(rows[0].value);
  return Number.isFinite(t.getTime()) ? t : null;
}

export async function requestCompanySync(): Promise<{
  requestedAt: string;
  deviceCount: number;
}> {
  await ready();
  const sql = getSql();
  const requestedAt = new Date().toISOString();
  await sql`
    INSERT INTO hub_meta (key, value, updated_at)
    VALUES ('sync_requested_at', ${requestedAt}, ${requestedAt})
    ON CONFLICT (key) DO UPDATE SET
      value = EXCLUDED.value,
      updated_at = EXCLUDED.updated_at
  `;
  const [{ count }] = await sql<{ count: string }[]>`
    SELECT COUNT(*)::text AS count FROM devices
  `;
  return { requestedAt, deviceCount: Number(count) };
}

export async function saveUsageReport(
  token: string,
  payload: Record<string, unknown>,
) {
  await ready();
  const hashed = hashToken(token);
  const sql = getSql();
  return sql.begin(async (txn) => {
    const devices = await txn<Record<string, unknown>[]>`
      SELECT * FROM devices WHERE token_hash = ${hashed} LIMIT 1
    `;
    if (!devices[0]) throw new Error('Unknown device');
    const device = mapDevice(devices[0]);
    const employees = await txn<Record<string, unknown>[]>`
      SELECT * FROM employees WHERE id = ${device.employeeId} LIMIT 1
    `;
    if (!employees[0]) throw new Error('Unknown employee');
    const employee = mapEmployee(employees[0]);

    const now = new Date().toISOString();
    const agentVersion =
      typeof payload.agentVersion === 'string' ? payload.agentVersion : null;
    const cursorVersion =
      typeof payload.cursorVersion === 'string' ? payload.cursorVersion : null;

    await txn`
      UPDATE devices SET
        last_seen_at = ${now},
        agent_version = COALESCE(${agentVersion}, agent_version),
        cursor_version = COALESCE(${cursorVersion}, cursor_version)
      WHERE id = ${device.id}
    `;

    const billing = payload.billingCycle as
      | { start?: string; end?: string }
      | undefined;
    const snapshot: UsageSnapshot = {
      id: newId('snap'),
      employeeId: employee.id,
      deviceId: device.id,
      timestamp: typeof payload.timestamp === 'string' ? payload.timestamp : now,
      billingPeriod: billing?.end ?? null,
      usageData: payload,
      createdAt: now,
    };
    await txn`
      INSERT INTO snapshots (id, employee_id, device_id, timestamp, billing_period, usage_data, created_at)
      VALUES (
        ${snapshot.id}, ${snapshot.employeeId}, ${snapshot.deviceId}, ${snapshot.timestamp},
        ${snapshot.billingPeriod}, ${txn.json(payload as never)}, ${snapshot.createdAt}
      )
    `;
    await txn`
      DELETE FROM snapshots WHERE id IN (
        SELECT id FROM snapshots ORDER BY created_at DESC OFFSET 4000
      )
    `;
    return { employee, device, snapshot };
  });
}

export async function overview() {
  await ready();
  const sql = getSql();
  const employees = (await sql<Record<string, unknown>[]>`SELECT * FROM employees`).map(
    mapEmployee,
  );
  const devices = (await sql<Record<string, unknown>[]>`SELECT * FROM devices`).map(
    mapDevice,
  );
  const latestRows = await sql<Record<string, unknown>[]>`
    SELECT DISTINCT ON (employee_id) *
    FROM snapshots
    ORDER BY employee_id, timestamp DESC
  `;
  const latestByEmployee = new Map<string, UsageSnapshot>();
  for (const row of latestRows) {
    const snap = mapSnapshot(row);
    latestByEmployee.set(snap.employeeId, snap);
  }

  const rows = employees.map((emp) => {
    const empDevices = devices.filter((d) => d.employeeId === emp.id);
    const latest = latestByEmployee.get(emp.id);
    const usage = (latest?.usageData?.usage ?? {}) as Record<string, unknown>;
    const billing = (latest?.usageData?.billingCycle ?? {}) as Record<
      string,
      unknown
    >;
    const lastSeen = empDevices
      .map((d) => d.lastSeenAt)
      .sort()
      .at(-1);
    const onDemand = pickOnDemand(usage, {
      start: str(billing.start),
      end: str(billing.end),
    });
    return {
      id: emp.id,
      email: emp.email,
      name: emp.name,
      plan: (latest?.usageData?.plan as string) || null,
      percent: cursorUsagePercent(usage),
      autoPercent:
        typeof usage.autoPercentUsed === 'number' ? usage.autoPercentUsed : null,
      apiPercent:
        typeof usage.apiPercentUsed === 'number' ? usage.apiPercentUsed : null,
      onDemandUsedUsd: onDemand.usedUsd,
      onDemandLimitUsd: onDemand.limitUsd,
      onDemandRemainingUsd: onDemand.remainingUsd,
      onDemandPercent: onDemand.percent,
      onDemandEnabled: onDemand.on,
      afterIncludedUsd: onDemand.afterIncludedUsd,
      displayMessage:
        typeof usage.displayMessage === 'string' ? usage.displayMessage : null,
      billingCycleStart: str(billing.start),
      billingCycleEnd: str(billing.end),
      lastSeenAt: lastSeen ?? null,
      deviceCount: empDevices.length,
      cursorVersion: empDevices[0]?.cursorVersion ?? null,
    };
  });

  const percents = rows
    .map((r) => r.percent)
    .filter((n): n is number => n != null);
  const onDemandActive = rows.filter((r) => r.onDemandEnabled).length;
  const activeCutoff = Date.now() - 24 * 60 * 60 * 1000;
  const active = rows.filter(
    (r) => r.lastSeenAt && new Date(r.lastSeenAt).getTime() >= activeCutoff,
  ).length;

  return {
    totals: {
      developers: employees.length,
      activeDevelopers: active,
      devices: devices.length,
      averageUsagePercent:
        percents.length > 0
          ? percents.reduce((a, b) => a + b, 0) / percents.length
          : null,
      highestUsagePercent: percents.length ? Math.max(...percents) : null,
      lowestUsagePercent: percents.length ? Math.min(...percents) : null,
      onDemandDevelopers: onDemandActive,
    },
    developers: rows.sort((a, b) => a.name.localeCompare(b.name)),
  };
}

export async function removeEmployee(id: string): Promise<{ email: string }> {
  await ready();
  const sql = getSql();
  return sql.begin(async (txn) => {
    const empRows = await txn<Record<string, unknown>[]>`
      SELECT * FROM employees WHERE id = ${id} LIMIT 1
    `;
    if (!empRows[0]) throw new Error('Not found');
    const email = String(empRows[0].email).toLowerCase();
    await txn`DELETE FROM snapshots WHERE employee_id = ${id}`;
    await txn`DELETE FROM devices WHERE employee_id = ${id}`;
    await txn`DELETE FROM employees WHERE id = ${id}`;
    return { email };
  });
}

export async function employeeDetail(
  id: string,
  opts?: { history?: boolean },
) {
  await ready();
  const sql = getSql();
  const empRows = await sql<Record<string, unknown>[]>`
    SELECT * FROM employees WHERE id = ${id} LIMIT 1
  `;
  if (!empRows[0]) return null;
  const employee = mapEmployee(empRows[0]);
  const devices = (
    await sql<Record<string, unknown>[]>`
      SELECT * FROM devices WHERE employee_id = ${id}
    `
  ).map(mapDevice);
  const limit = opts?.history ? 50 : 1;
  const snapshots = (
    await sql<Record<string, unknown>[]>`
      SELECT * FROM snapshots WHERE employee_id = ${id}
      ORDER BY timestamp DESC
      LIMIT ${limit}
    `
  ).map((s) => {
    const snap = mapSnapshot(s);
    return {
      id: snap.id,
      timestamp: snap.timestamp,
      billingPeriod: snap.billingPeriod,
      billingCycle: snap.usageData.billingCycle ?? null,
      plan: (snap.usageData.plan as string) || null,
      usage: snap.usageData.usage ?? snap.usageData,
      deviceId: snap.deviceId,
    };
  });
  return {
    employee,
    devices: devices.map(({ tokenHash: _, ...d }) => d),
    snapshots,
  };
}

/** Same payload an admin sees for this employee — scoped to the calling device token. */
export async function myUsage(token: string) {
  const device = await findDeviceByToken(token);
  if (!device) throw new Error('Unknown device');
  const detail = await employeeDetail(device.employeeId, { history: true });
  if (!detail) throw new Error('Unknown employee');

  const latest = detail.snapshots[0];
  const usage = (latest?.usage ?? {}) as Record<string, unknown>;
  const billing = (latest?.billingCycle ?? {}) as {
    start?: string;
    end?: string;
  };
  const lastSeen = detail.devices
    .map((d) => d.lastSeenAt)
    .filter(Boolean)
    .sort()
    .at(-1);
  const onDemand = pickOnDemand(usage, {
    start: typeof billing.start === 'string' ? billing.start : null,
    end: typeof billing.end === 'string' ? billing.end : null,
  });

  return {
    ...detail,
    thisDeviceId: device.id,
    summary: {
      email: detail.employee.email,
      name: detail.employee.name,
      plan: latest?.plan ?? null,
      percent: cursorUsagePercent(usage),
      autoPercent:
        typeof usage.autoPercentUsed === 'number' ? usage.autoPercentUsed : null,
      apiPercent:
        typeof usage.apiPercentUsed === 'number' ? usage.apiPercentUsed : null,
      onDemandUsedUsd: onDemand.usedUsd,
      onDemandLimitUsd: onDemand.limitUsd,
      onDemandRemainingUsd: onDemand.remainingUsd,
      onDemandPercent: onDemand.percent,
      onDemandEnabled: onDemand.on,
      afterIncludedUsd: onDemand.afterIncludedUsd,
      displayMessage:
        typeof usage.displayMessage === 'string' ? usage.displayMessage : null,
      billingCycleStart: typeof billing.start === 'string' ? billing.start : null,
      billingCycleEnd: typeof billing.end === 'string' ? billing.end : null,
      lastSeenAt: lastSeen ?? null,
      cursorVersion:
        detail.devices.find((d) => d.id === device.id)?.cursorVersion ??
        detail.devices[0]?.cursorVersion ??
        null,
    },
  };
}
