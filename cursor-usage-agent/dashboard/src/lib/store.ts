import { createHash, randomBytes } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { cursorUsagePercent } from './percent';

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

interface StoreFile {
  employees: Employee[];
  devices: Device[];
  snapshots: UsageSnapshot[];
}

function storePath() {
  return join(process.cwd(), 'data', 'company-store.json');
}

function emptyStore(): StoreFile {
  return { employees: [], devices: [], snapshots: [] };
}

function readStore(): StoreFile {
  try {
    const raw = readFileSync(storePath(), 'utf8');
    const parsed = JSON.parse(raw) as StoreFile;
    return {
      employees: parsed.employees ?? [],
      devices: parsed.devices ?? [],
      snapshots: parsed.snapshots ?? [],
    };
  } catch {
    return emptyStore();
  }
}

function writeStore(store: StoreFile) {
  const file = storePath();
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, JSON.stringify(store, null, 2), 'utf8');
}

let chain = Promise.resolve();

function locked<T>(fn: () => T): Promise<T> {
  const next = chain.then(() => fn());
  chain = next.then(
    () => undefined,
    () => undefined,
  );
  return next;
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

  return locked(() => {
    const store = readStore();
    const email = (input.email || `unknown@${input.hostname}`).toLowerCase();
    const name = email.split('@')[0] || input.hostname;

    let employee = store.employees.find((e) => e.email === email);
    if (!employee) {
      employee = {
        id: newId('emp'),
        email,
        name,
        department: 'unassigned',
        status: 'active',
        createdAt: new Date().toISOString(),
      };
      store.employees.push(employee);
    } else {
      employee.status = 'active';
    }

    let device = store.devices.find(
      (d) => d.employeeId === employee!.id && d.deviceName === input.hostname,
    );
    const token = newDeviceToken();
    const now = new Date().toISOString();

    if (!device) {
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
      store.devices.push(device);
    } else {
      device.tokenHash = hashToken(token);
      device.agentVersion = input.agentVersion;
      device.cursorVersion = input.cursorVersion;
      device.operatingSystem = input.os;
      device.lastSeenAt = now;
    }

    writeStore(store);
    return { employee, device, deviceToken: token };
  });
}

export async function findDeviceByToken(token: string): Promise<Device | null> {
  return locked(() => {
    const store = readStore();
    const hashed = hashToken(token);
    return store.devices.find((d) => d.tokenHash === hashed) ?? null;
  });
}

export async function heartbeat(token: string, agentVersion?: string) {
  return locked(() => {
    const store = readStore();
    const hashed = hashToken(token);
    const device = store.devices.find((d) => d.tokenHash === hashed);
    if (!device) throw new Error('Unknown device');
    device.lastSeenAt = new Date().toISOString();
    if (agentVersion) device.agentVersion = agentVersion;
    writeStore(store);
    return device;
  });
}

export async function saveUsageReport(
  token: string,
  payload: Record<string, unknown>,
) {
  return locked(() => {
    const store = readStore();
    const hashed = hashToken(token);
    const device = store.devices.find((d) => d.tokenHash === hashed);
    if (!device) throw new Error('Unknown device');

    const employee = store.employees.find((e) => e.id === device.employeeId);
    if (!employee) throw new Error('Unknown employee');

    const now = new Date().toISOString();
    device.lastSeenAt = now;
    if (typeof payload.agentVersion === 'string') {
      device.agentVersion = payload.agentVersion;
    }
    if (typeof payload.cursorVersion === 'string') {
      device.cursorVersion = payload.cursorVersion;
    }

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
    store.snapshots.push(snapshot);
    if (store.snapshots.length > 5000) {
      store.snapshots = store.snapshots.slice(-4000);
    }

    writeStore(store);
    return { employee, device, snapshot };
  });
}

export async function overview() {
  return locked(() => {
    const store = readStore();
    const latestByEmployee = new Map<string, UsageSnapshot>();
    for (const snap of store.snapshots) {
      const prev = latestByEmployee.get(snap.employeeId);
      if (!prev || snap.timestamp > prev.timestamp) {
        latestByEmployee.set(snap.employeeId, snap);
      }
    }

    const rows = store.employees.map((emp) => {
      const devices = store.devices.filter((d) => d.employeeId === emp.id);
      const latest = latestByEmployee.get(emp.id);
      const usage = (latest?.usageData?.usage ?? {}) as Record<string, unknown>;
      const billing = (latest?.usageData?.billingCycle ?? {}) as Record<
        string,
        unknown
      >;
      const lastSeen = devices
        .map((d) => d.lastSeenAt)
        .sort()
        .at(-1);
      return {
        id: emp.id,
        email: emp.email,
        name: emp.name,
        plan: (latest?.usageData?.plan as string) || null,
        percent: cursorUsagePercent(usage),
        billingCycleStart: str(billing.start),
        billingCycleEnd: str(billing.end),
        lastSeenAt: lastSeen ?? null,
        deviceCount: devices.length,
        cursorVersion: devices[0]?.cursorVersion ?? null,
      };
    });

    const percents = rows
      .map((r) => r.percent)
      .filter((n): n is number => n != null);
    const activeCutoff = Date.now() - 24 * 60 * 60 * 1000;
    const active = rows.filter(
      (r) => r.lastSeenAt && new Date(r.lastSeenAt).getTime() >= activeCutoff,
    ).length;

    return {
      totals: {
        developers: store.employees.length,
        activeDevelopers: active,
        devices: store.devices.length,
        averageUsagePercent:
          percents.length > 0
            ? percents.reduce((a, b) => a + b, 0) / percents.length
            : null,
        highestUsagePercent: percents.length ? Math.max(...percents) : null,
        lowestUsagePercent: percents.length ? Math.min(...percents) : null,
      },
      developers: rows.sort((a, b) => (b.percent ?? -1) - (a.percent ?? -1)),
    };
  });
}

export async function employeeDetail(id: string) {
  return locked(() => {
    const store = readStore();
    const employee = store.employees.find((e) => e.id === id);
    if (!employee) return null;
    const devices = store.devices.filter((d) => d.employeeId === id);
    const snapshots = store.snapshots
      .filter((s) => s.employeeId === id)
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
      .slice(0, 50)
      .map((s) => ({
        id: s.id,
        timestamp: s.timestamp,
        billingPeriod: s.billingPeriod,
        billingCycle: s.usageData.billingCycle ?? null,
        plan: (s.usageData.plan as string) || null,
        usage: s.usageData.usage ?? s.usageData,
        deviceId: s.deviceId,
      }));
    return { employee, devices: devices.map(({ tokenHash: _, ...d }) => d), snapshots };
  });
}

function num(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

function str(v: unknown): string | null {
  return typeof v === 'string' && v ? v : null;
}
