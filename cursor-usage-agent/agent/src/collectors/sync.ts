import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { AGENT_VERSION, runFullScan } from './scan.js';
import type { AgentReport } from '../cursor/types.js';

export interface AgentHubConfig {
  serverUrl: string;
  enrollmentSecret: string;
  deviceId?: string;
  deviceToken?: string;
  employeeId?: string;
  lastSyncAt?: string;
}

function configDir(): string {
  return join(homedir(), '.cursor-usage-agent');
}

export function configPath(): string {
  return join(configDir(), 'config.json');
}

export function loadHubConfig(): AgentHubConfig | null {
  const fromEnvUrl = process.env.CURSOR_USAGE_SERVER;
  const fromEnvSecret = process.env.CURSOR_USAGE_ENROLLMENT_SECRET;
  let file: Partial<AgentHubConfig> = {};
  if (existsSync(configPath())) {
    try {
      file = JSON.parse(readFileSync(configPath(), 'utf8')) as AgentHubConfig;
    } catch {
      file = {};
    }
  }
  const serverUrl = fromEnvUrl || file.serverUrl;
  const enrollmentSecret = fromEnvSecret || file.enrollmentSecret;
  if (!serverUrl || !enrollmentSecret) return null;
  return {
    serverUrl: serverUrl.replace(/\/$/, ''),
    enrollmentSecret,
    deviceId: file.deviceId,
    deviceToken: file.deviceToken,
    employeeId: file.employeeId,
    lastSyncAt: file.lastSyncAt,
  };
}

export function saveHubConfig(cfg: AgentHubConfig) {
  mkdirSync(configDir(), { recursive: true });
  writeFileSync(configPath(), JSON.stringify(cfg, null, 2), 'utf8');
}

export function buildMinimizedPayload(report: AgentReport) {
  const current = (report.usage.current || {}) as Record<string, unknown>;
  const remaining = (report.usage.remaining || {}) as Record<string, unknown>;
  const percentage = (report.usage.percentage || {}) as Record<string, unknown>;
  const billing = (report.usage.billingCycle || {}) as Record<string, unknown>;
  const spending = (report.usage.spending || {}) as Record<string, unknown>;
  const onDemand = flattenOnDemand(spending);

  return {
    timestamp: report.timestamp,
    agentVersion: report.agentVersion,
    cursorVersion: report.cursor.version,
    hostname: report.machine.hostname,
    os: report.machine.os,
    email: report.account.identifier,
    plan: report.account.plan,
    usage: {
      available: report.usage.available,
      usedUsd: current.usedUsd ?? null,
      includedUsedUsd: current.includedUsedUsd ?? null,
      bonusUsedUsd: current.bonusUsedUsd ?? null,
      remainingUsd: remaining.remainingUsd ?? null,
      limitUsd: remaining.limitUsd ?? null,
      totalPercentUsed: percentage.totalPercentUsed ?? null,
      autoPercentUsed: percentage.autoPercentUsed ?? null,
      apiPercentUsed: percentage.apiPercentUsed ?? null,
      displayMessage: current.displayMessage ?? null,
      ...onDemand,
    },
    billingCycle: {
      start: billing.start ?? null,
      end: billing.end ?? null,
    },
    spending: {
      planPrice: spending.planPrice ?? null,
      planUsedUsd: spending.planUsedUsd ?? null,
      ...onDemand,
    },
  };
}

function num(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

function flattenOnDemand(spending: Record<string, unknown>) {
  const nested =
    spending.onDemand && typeof spending.onDemand === 'object'
      ? (spending.onDemand as Record<string, unknown>)
      : {};
  const used = num(nested.individualUsedUsd) ?? num(spending.onDemandUsedUsd);
  const limit = num(nested.individualLimitUsd) ?? num(spending.onDemandLimitUsd);
  const remaining =
    num(nested.individualRemainingUsd) ??
    num(spending.onDemandRemainingUsd) ??
    (used != null && limit != null
      ? Math.max(0, Math.round((limit - used) * 100) / 100)
      : null);
  const percent =
    num(nested.percentUsed) ??
    num(spending.onDemandPercentUsed) ??
    (used != null && limit != null && limit > 0
      ? Math.round((used / limit) * 1000) / 10
      : null);
  const limitType =
    typeof nested.limitType === 'string'
      ? nested.limitType
      : typeof spending.onDemandLimitType === 'string'
        ? spending.onDemandLimitType
        : null;
  const enabled =
    typeof nested.enabled === 'boolean'
      ? nested.enabled
      : typeof spending.onDemandEnabled === 'boolean'
        ? spending.onDemandEnabled
        : limit != null && limit > 0
          ? true
          : null;
  return {
    onDemandUsedUsd: used,
    onDemandLimitUsd: limit,
    onDemandRemainingUsd: remaining,
    onDemandPercentUsed: percent,
    onDemandLimitType: limitType,
    onDemandEnabled: enabled,
  };
}

async function postJson(
  url: string,
  body: unknown,
  headers: Record<string, string>,
) {
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'ngrok-skip-browser-warning': '1',
      'User-Agent': 'CursorUsageAgent/0.1',
      ...headers,
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let json: Record<string, unknown> = {};
  try {
    json = text ? (JSON.parse(text) as Record<string, unknown>) : {};
  } catch {
    throw new Error(
      `Hub returned non-JSON (HTTP ${res.status}). Check the dashboard URL / ngrok. Preview: ${text.slice(0, 180)}`,
    );
  }
  if (!res.ok) {
    throw new Error(String(json.error || `HTTP ${res.status}`));
  }
  return json;
}

const REGULAR_SYNC_MS = 20 * 60 * 1000;

function markSynced(cfg: AgentHubConfig) {
  saveHubConfig({
    ...cfg,
    lastSyncAt: new Date().toISOString(),
  });
}

export async function tickHub(): Promise<{
  action: 'synced' | 'idle';
  enrolled?: boolean;
  employeeId?: string;
  deviceId?: string;
  snapshotOk?: boolean;
}> {
  const cfg = loadHubConfig();
  if (!cfg) {
    throw new Error(
      'Not configured. Set CURSOR_USAGE_SERVER and CURSOR_USAGE_ENROLLMENT_SECRET, then run: npm run enroll',
    );
  }

  let syncNow = false;
  if (cfg.deviceToken) {
    try {
      const hb = await postJson(`${cfg.serverUrl}/api/agents/heartbeat`, {
        agentVersion: AGENT_VERSION,
      }, {
        Authorization: `Bearer ${cfg.deviceToken}`,
      });
      syncNow = Boolean(hb.syncNow);
    } catch {
      syncNow = false;
    }
  }

  const last = cfg.lastSyncAt ? Date.parse(cfg.lastSyncAt) : 0;
  const due = !Number.isFinite(last) || last <= 0 || Date.now() - last >= REGULAR_SYNC_MS;
  if (!cfg.deviceToken || syncNow || due) {
    const result = await syncToHub();
    const latest = loadHubConfig();
    if (latest) markSynced(latest);
    return { action: 'synced', ...result };
  }

  return { action: 'idle' };
}

export async function enrollWithHub(
  serverUrl: string,
  enrollmentSecret: string,
  report: AgentReport,
): Promise<AgentHubConfig> {
  const json = await postJson(
    `${serverUrl.replace(/\/$/, '')}/api/agents/register`,
    {
      hostname: report.machine.hostname,
      os: report.machine.os,
      architecture: report.machine.architecture,
      agentVersion: report.agentVersion || AGENT_VERSION,
      cursorVersion: report.cursor.version,
      email: report.account.identifier,
      plan: report.account.plan,
    },
    { 'x-enrollment-secret': enrollmentSecret },
  );

  const cfg: AgentHubConfig = {
    serverUrl: serverUrl.replace(/\/$/, ''),
    enrollmentSecret,
    deviceId: String(json.deviceId),
    deviceToken: String(json.deviceToken),
    employeeId: String(json.employeeId),
  };
  saveHubConfig(cfg);
  return cfg;
}

export async function syncToHub(): Promise<{
  enrolled: boolean;
  employeeId?: string;
  deviceId?: string;
  snapshotOk: boolean;
}> {
  const report = await runFullScan();
  let cfg = loadHubConfig();
  if (!cfg) {
    throw new Error(
      'Not configured. Set CURSOR_USAGE_SERVER and CURSOR_USAGE_ENROLLMENT_SECRET, then run: npm run sync',
    );
  }

  if (!cfg.deviceToken) {
    cfg = await enrollWithHub(cfg.serverUrl, cfg.enrollmentSecret, report);
  }

  const payload = buildMinimizedPayload(report);

  try {
    await postJson(`${cfg.serverUrl}/api/usage/report`, payload, {
      Authorization: `Bearer ${cfg.deviceToken}`,
    });
    return {
      enrolled: true,
      employeeId: cfg.employeeId,
      deviceId: cfg.deviceId,
      snapshotOk: true,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : '';
    if (msg.includes('Unknown device') || msg.includes('401')) {
      cfg = await enrollWithHub(cfg.serverUrl, cfg.enrollmentSecret, report);
      await postJson(`${cfg.serverUrl}/api/usage/report`, payload, {
        Authorization: `Bearer ${cfg.deviceToken}`,
      });
      return {
        enrolled: true,
        employeeId: cfg.employeeId,
        deviceId: cfg.deviceId,
        snapshotOk: true,
      };
    }
    throw e;
  }
}
