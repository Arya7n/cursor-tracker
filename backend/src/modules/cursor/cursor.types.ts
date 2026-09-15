/**
 * Types for Cursor Personal API Explorer.
 * Only shapes that map to documented Cursor API responses or our normalized POC outputs.
 */

export type CursorHttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export type DiscoveryAvailability =
  | 'Cloud Agents API (personal / service-account keys)'
  | 'Admin API (Enterprise team admin keys)'
  | 'Analytics API (Enterprise team admin keys)'
  | 'Documented but requires resource ID';

export interface DocumentedEndpointSpec {
  /** Path relative to CURSOR_API_BASE_URL */
  endpoint: string;
  method: CursorHttpMethod;
  /** Human-readable docs category */
  availability: DiscoveryAvailability;
  /** Why we probe this endpoint */
  purpose: string;
  /** Optional JSON body for POST probes */
  body?: Record<string, unknown>;
  /** Skip live call (e.g. needs ID we may not have) */
  skipLiveProbe?: boolean;
  skipReason?: string;
  docsUrl: string;
}

export interface ProbeResult {
  endpoint: string;
  method: CursorHttpMethod;
  authentication: 'API key';
  status: number | null;
  accessible: boolean;
  responseTime: number;
  responseShape: unknown;
  message: string;
  availability: DiscoveryAvailability;
  purpose: string;
  docsUrl: string;
  errorBody?: unknown;
  responseHeaders?: Record<string, string>;
  skipped?: boolean;
  skipReason?: string;
}

export interface CursorClientResponse {
  status: number;
  ok: boolean;
  responseTimeMs: number;
  headers: Record<string, string>;
  body: unknown;
  rawText: string;
}

export interface UnavailableMetric {
  available: false;
  reason: string;
}

export interface AccountInfoResponse {
  available: boolean;
  reason?: string;
  sourceEndpoint?: string;
  email?: string | null;
  userId?: string | number | null;
  apiKeyName?: string | null;
  createdAt?: string | null;
  userFirstName?: string | null;
  userLastName?: string | null;
  accountType?: string | null;
  plan?: UnavailableMetric | string | null;
  organizationOrTeam?: UnavailableMetric | string | null;
  rawFields?: Record<string, unknown>;
  note?: string;
}

export interface UsageMetricValue {
  available: true;
  value: unknown;
  source?: string;
}

export type UsageMetric = UsageMetricValue | UnavailableMetric;

export interface UsageInfoResponse {
  available: boolean;
  reason?: string;
  note?: string;
  currentUsage: UsageMetric;
  monthlyUsage: UsageMetric;
  dailyUsage: UsageMetric;
  usageLimits: UsageMetric;
  remainingUsage: UsageMetric;
  premiumUsage: UsageMetric;
  requestCounts: UsageMetric;
  tokenCounts: UsageMetric;
  modelUsage: UsageMetric;
  agentUsage: UsageMetric;
  composerUsage: UsageMetric;
  chatUsage: UsageMetric;
  tabUsage: UsageMetric;
  /** Cloud-agent-scoped token usage when an agent ID is known */
  cloudAgentTokenUsage?: UsageMetric;
  discoveryHints?: ProbeResult[];
}

export interface SpendingInfoResponse {
  available: boolean;
  reason?: string;
  note?: string;
  currentSpending: UsageMetric;
  monthlySpending: UsageMetric;
  usageBasedSpending: UsageMetric;
  subscriptionCost: UsageMetric;
  perModelCost: UsageMetric;
  remainingBudget: UsageMetric;
  billingCycle: UsageMetric;
  discoveryHints?: ProbeResult[];
}

export interface UsageHistoryDay {
  date: string;
  requests?: number;
  tokens?: number;
  cost?: number;
  [key: string]: unknown;
}

export interface UsageHistoryResponse {
  available: boolean;
  reason?: string;
  note?: string;
  history: UsageHistoryDay[];
  discoveryHints?: ProbeResult[];
}

export interface CapabilitiesSummary {
  accountInformation: boolean;
  usage: boolean;
  usageHistory: boolean;
  spending: boolean;
  limits: boolean;
  modelUsage: boolean;
  tokenUsage: boolean;
  billingData: boolean;
}

export interface DashboardPayload {
  account: AccountInfoResponse;
  usage: UsageInfoResponse;
  spending: SpendingInfoResponse;
  usageHistory: UsageHistoryResponse;
  capabilities: CapabilitiesSummary;
  conclusion: PersonalKeyConclusion;
  discoverySummary: {
    tested: number;
    accessible: number;
    inaccessible: number;
    skipped: number;
  };
}

export interface PersonalKeyConclusion {
  accountData: 'AVAILABLE' | 'NOT AVAILABLE';
  usageData: 'AVAILABLE' | 'NOT AVAILABLE';
  usageLimits: 'AVAILABLE' | 'NOT AVAILABLE';
  remainingUsage: 'AVAILABLE' | 'NOT AVAILABLE';
  usageHistory: 'AVAILABLE' | 'NOT AVAILABLE';
  modelUsage: 'AVAILABLE' | 'NOT AVAILABLE';
  tokenUsage: 'AVAILABLE' | 'NOT AVAILABLE';
  spending: 'AVAILABLE' | 'NOT AVAILABLE';
  billingData: 'AVAILABLE' | 'NOT AVAILABLE';
  multiEmployeeDashboard: 'YES' | 'NO' | 'PARTIALLY';
  multiEmployeeExplanation: string;
}

export interface DebugInspection {
  endpoint: string;
  method: CursorHttpMethod;
  status: number | null;
  responseHeaders: Record<string, string>;
  rawResponse: unknown;
  normalizedResponse: unknown;
  message: string;
  responseTime: number;
}
