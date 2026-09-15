/**
 * Shared status vocabulary for the Cursor Usage Agent POC.
 * Do not invent values — use these statuses explicitly.
 */
export type AvailabilityStatus =
  | 'AVAILABLE'
  | 'NOT AVAILABLE'
  | 'UNKNOWN'
  | 'NOT PERMITTED';

export interface DiscoverySourceResult {
  source: string;
  available: boolean;
  fields: string[];
  reason: string;
  rawSafeSummary?: Record<string, unknown>;
}

export interface MachineInfo {
  os: string;
  architecture: string;
  hostname: string;
}

export interface CursorInstallInfo {
  installed: boolean;
  version: string | null;
  executablePath: string | null;
  processRunning: boolean;
  processCount: number;
  cliAgentAvailable: boolean;
  cliAgentPath: string | null;
  cliAgentVersion: string | null;
}

export interface AccountInfo {
  status: AvailabilityStatus;
  authenticated: boolean | null;
  identifier: string | null;
  plan: string | null;
  source: string | null;
  fields: string[];
  reason: string;
}

export interface UsageMetric {
  status: AvailabilityStatus;
  value: unknown;
  source: string | null;
  reason: string;
}

export interface UsageInfo {
  currentUsage: UsageMetric;
  monthlyUsage: UsageMetric;
  remainingUsage: UsageMetric;
  usagePercentage: UsageMetric;
  modelUsage: UsageMetric;
  requestCounts: UsageMetric;
  tokenCounts: UsageMetric;
  spending: UsageMetric;
  billingCycle: UsageMetric;
  historicalUsage: UsageMetric;
  resetDate: UsageMetric;
  sources: DiscoverySourceResult[];
}

export interface ModelsInfo {
  status: AvailabilityStatus;
  models: string[];
  source: string | null;
  reason: string;
}

export interface AgentReport {
  agentVersion: string;
  timestamp: string;
  machine: MachineInfo;
  cursor: {
    installed: boolean;
    version: string | null;
    executablePath: string | null;
    processRunning: boolean;
    cliAgentAvailable: boolean;
  };
  account: {
    authenticated: boolean | null;
    identifier: string | null;
    plan: string | null;
    status: AvailabilityStatus;
  };
  usage: {
    available: boolean;
    current?: unknown;
    remaining?: unknown;
    percentage?: unknown;
    monthly?: unknown;
    spending?: unknown;
    billingCycle?: unknown;
    details: UsageInfo;
  };
  models: {
    available: boolean;
    list: string[];
    status: AvailabilityStatus;
  };
  spending: {
    available: boolean;
    status: AvailabilityStatus;
  };
  discoveries: DiscoverySourceResult[];
}
