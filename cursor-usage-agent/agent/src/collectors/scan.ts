import { arch, hostname, platform, release, type } from 'node:os';
import { detectAccount } from '../cursor/cursor-account.js';
import { detectCursorInstall } from '../cursor/cursor-detector.js';
import { detectModels } from '../cursor/cursor-models.js';
import { discoverUsage } from '../cursor/cursor-usage.js';
import type { AgentReport, MachineInfo } from '../cursor/types.js';
import { redactSecrets } from '../security/redact.js';

export const AGENT_VERSION = '0.1.0';

export function getMachineInfo(): MachineInfo {
  const osLabel =
    platform() === 'win32'
      ? `Windows ${release()}`
      : `${type()} ${release()}`;
  return {
    os: osLabel,
    architecture: arch(),
    hostname: hostname(),
  };
}

export async function runFullScan(): Promise<AgentReport> {
  const machine = getMachineInfo();
  const cursor = await detectCursorInstall();
  const { account, discovery: accountDiscovery } = await detectAccount();
  const { models, discovery: modelsDiscovery } = await detectModels();
  const { usage, discoveries: usageDiscoveries } = await discoverUsage();

  const usageAvailable = [
    usage.currentUsage,
    usage.remainingUsage,
    usage.usagePercentage,
    usage.monthlyUsage,
  ].some((m) => m.status === 'AVAILABLE');

  const report: AgentReport = {
    agentVersion: AGENT_VERSION,
    timestamp: new Date().toISOString(),
    machine,
    cursor: {
      installed: cursor.installed,
      version: cursor.version,
      executablePath: cursor.executablePath,
      processRunning: cursor.processRunning,
      cliAgentAvailable: cursor.cliAgentAvailable,
    },
    account: {
      authenticated: account.authenticated,
      identifier: account.identifier,
      plan: account.plan,
      status: account.status,
    },
    usage: {
      available: usageAvailable,
      current: usage.currentUsage.value,
      remaining: usage.remainingUsage.value,
      percentage: usage.usagePercentage.value,
      monthly: usage.monthlyUsage.value,
      spending: usage.spending.value,
      billingCycle: usage.billingCycle.value,
      details: usage,
    },
    models: {
      available: models.status === 'AVAILABLE',
      list: models.models,
      status: models.status,
    },
    spending: {
      available: usage.spending.status === 'AVAILABLE',
      status: usage.spending.status,
    },
    discoveries: [accountDiscovery, modelsDiscovery, ...usageDiscoveries],
  };

  return redactSecrets(report);
}

export function formatHumanScan(report: AgentReport): string {
  const u = report.usage.details;
  const current = u.currentUsage.value as Record<string, unknown> | null;
  const remaining = u.remainingUsage.value as Record<string, unknown> | null;
  const pct = u.usagePercentage.value as Record<string, unknown> | null;
  const cycle = u.billingCycle.value as Record<string, unknown> | null;
  const spend = u.spending.value as Record<string, unknown> | null;

  const lines = [
    '=====================================',
    'Cursor Usage Agent',
    '=====================================',
    '',
    '## Machine',
    '',
    `OS: ${report.machine.os}`,
    `Architecture: ${report.machine.architecture}`,
    '',
    '## Cursor',
    '',
    `Installed: ${report.cursor.installed ? 'YES' : 'NO'}`,
    `Version: ${report.cursor.version ?? 'UNKNOWN'}`,
    `Executable: ${report.cursor.executablePath ?? 'UNKNOWN'}`,
    `Process running: ${report.cursor.processRunning ? 'YES' : 'NO'}`,
    `Agent CLI: ${report.cursor.cliAgentAvailable ? 'YES' : 'NO'}`,
    '',
    '## Account',
    '',
    `Authenticated: ${
      report.account.authenticated === null
        ? 'UNKNOWN'
        : report.account.authenticated
          ? 'YES'
          : 'NO'
    }`,
    `Account identifier: ${report.account.identifier ?? 'UNKNOWN'}`,
    `Plan: ${report.account.plan ?? 'UNKNOWN'}`,
    `Status: ${report.account.status}`,
    '',
    '## Usage',
    '',
    `Current usage: ${formatMoney(current?.usedUsd) ?? statusLine(u.currentUsage.status)}`,
    `Included used: ${formatMoney(current?.includedUsedUsd) ?? 'UNKNOWN'}`,
    `Bonus used: ${formatMoney(current?.bonusUsedUsd) ?? 'UNKNOWN'}`,
    `Monthly / period limit: ${formatMoney(remaining?.limitUsd) ?? statusLine(u.monthlyUsage.status)}`,
    `Remaining usage: ${formatMoney(remaining?.remainingUsd) ?? statusLine(u.remainingUsage.status)}`,
    `Usage percentage: ${
      typeof pct?.totalPercentUsed === 'number'
        ? `${pct.totalPercentUsed.toFixed(1)}%`
        : statusLine(u.usagePercentage.status)
    }`,
    `  Auto %: ${typeof pct?.autoPercentUsed === 'number' ? pct.autoPercentUsed.toFixed(1) + '%' : 'UNKNOWN'}`,
    `  API %: ${typeof pct?.apiPercentUsed === 'number' ? pct.apiPercentUsed.toFixed(1) + '%' : 'UNKNOWN'}`,
    `Request counts: ${statusLine(u.requestCounts.status)}`,
    `Token counts: ${statusLine(u.tokenCounts.status)}`,
    `Billing cycle: ${
      cycle?.start && cycle?.end
        ? `${cycle.start} → ${cycle.end}`
        : statusLine(u.billingCycle.status)
    }`,
    `Reset date: ${
      (u.resetDate.value as { resetsAt?: string } | null)?.resetsAt ??
      statusLine(u.resetDate.status)
    }`,
    current?.displayMessage
      ? `Message: ${String(current.displayMessage)}`
      : '',
    '',
    '## Models',
    '',
    `Catalog available: ${report.models.status}`,
    `Model count: ${report.models.list.length}`,
    `Model usage metrics: ${statusLine(u.modelUsage.status)}`,
    '',
    '## Spending',
    '',
    `Plan spend (period): ${formatMoney(spend?.planUsedUsd) ?? statusLine(u.spending.status)}`,
    `Plan price: ${spend?.planPrice ?? 'UNKNOWN'}`,
    `On-demand used: ${formatMoney((spend?.onDemand as { individualUsedUsd?: number } | undefined)?.individualUsedUsd) ?? 'UNKNOWN'}`,
    '',
    '## History',
    '',
    `Available: ${statusLine(u.historicalUsage.status)}`,
    '',
    '=====================================',
    'RESULT',
    '=====================================',
    '',
    `Usage meters for company dashboard: ${
      report.usage.available ? 'AVAILABLE' : 'NOT AVAILABLE'
    }`,
    '',
  ].filter((line) => line !== '');

  return lines.join('\n') + '\n';
}

function formatMoney(v: unknown): string | null {
  if (typeof v !== 'number' || Number.isNaN(v)) return null;
  return `$${v.toFixed(2)}`;
}

function statusLine(s: string): string {
  return s;
}
