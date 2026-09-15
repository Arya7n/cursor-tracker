const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001/api';

export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    cache: 'no-store',
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API ${path} failed (${res.status}): ${text}`);
  }
  return res.json() as Promise<T>;
}

export type UsageMetric =
  | { available: true; value: unknown; source?: string }
  | { available: false; reason: string };

export interface DashboardPayload {
  account: {
    available: boolean;
    reason?: string;
    email?: string | null;
    userId?: string | number | null;
    apiKeyName?: string | null;
    createdAt?: string | null;
    userFirstName?: string | null;
    userLastName?: string | null;
    accountType?: string | null;
    plan?: UsageMetric | string | null;
    organizationOrTeam?: UsageMetric | string | null;
    note?: string;
  };
  usage: {
    available: boolean;
    reason?: string;
    note?: string;
    currentUsage: UsageMetric;
    monthlyUsage: UsageMetric;
    remainingUsage: UsageMetric;
    usageLimits: UsageMetric;
    modelUsage: UsageMetric;
    tokenCounts: UsageMetric;
    agentUsage: UsageMetric;
    composerUsage: UsageMetric;
    chatUsage: UsageMetric;
    tabUsage: UsageMetric;
  };
  spending: {
    available: boolean;
    reason?: string;
    note?: string;
    currentSpending: UsageMetric;
    monthlySpending: UsageMetric;
    remainingBudget: UsageMetric;
  };
  usageHistory: {
    available: boolean;
    reason?: string;
    history: Array<Record<string, unknown>>;
  };
  capabilities: {
    accountInformation: boolean;
    usage: boolean;
    usageHistory: boolean;
    spending: boolean;
    limits: boolean;
    modelUsage: boolean;
    tokenUsage: boolean;
    billingData: boolean;
  };
  conclusion: {
    accountData: string;
    usageData: string;
    usageLimits: string;
    remainingUsage: string;
    usageHistory: string;
    modelUsage: string;
    tokenUsage: string;
    spending: string;
    billingData: string;
    multiEmployeeDashboard: string;
    multiEmployeeExplanation: string;
  };
  discoverySummary: {
    tested: number;
    accessible: number;
    inaccessible: number;
    skipped: number;
  };
}

export interface ProbeResult {
  endpoint: string;
  method: string;
  authentication: string;
  status: number | null;
  accessible: boolean;
  responseTime: number;
  responseShape: unknown;
  message: string;
  availability: string;
  purpose: string;
  docsUrl: string;
  skipped?: boolean;
  responseHeaders?: Record<string, string>;
  errorBody?: unknown;
}

export interface DiscoveryPayload {
  configured: boolean;
  baseUrl: string;
  results: ProbeResult[];
  capabilities: DashboardPayload['capabilities'];
  conclusion: DashboardPayload['conclusion'];
}

export interface DebugInspection {
  endpoint: string;
  method: string;
  status: number | null;
  responseHeaders: Record<string, string>;
  rawResponse: unknown;
  normalizedResponse: unknown;
  message: string;
  responseTime: number;
}
