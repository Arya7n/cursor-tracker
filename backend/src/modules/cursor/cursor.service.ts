import { Injectable } from '@nestjs/common';
import { CursorClient } from './cursor.client';
import { buildDocumentedEndpointCatalog } from './cursor.endpoints';
import {
  redactSecrets,
  responseShape,
  statusMessage,
} from './cursor.redact';
import {
  AccountInfoResponse,
  CapabilitiesSummary,
  DashboardPayload,
  DebugInspection,
  DocumentedEndpointSpec,
  PersonalKeyConclusion,
  ProbeResult,
  SpendingInfoResponse,
  UnavailableMetric,
  UsageHistoryDay,
  UsageHistoryResponse,
  UsageInfoResponse,
  UsageMetric,
} from './cursor.types';

const unavailable = (reason: string): UnavailableMetric => ({
  available: false,
  reason,
});

@Injectable()
export class CursorService {
  constructor(private readonly client: CursorClient) {}

  async discover(): Promise<{
    configured: boolean;
    baseUrl: string;
    results: ProbeResult[];
    capabilities: CapabilitiesSummary;
    conclusion: PersonalKeyConclusion;
  }> {
    const results = await this.probeAllDocumentedEndpoints();
    const account = await this.getAccountFromCacheOrFetch();
    const usage = this.buildUsageFromProbes(results);
    const spending = this.buildSpendingFromProbes(results);
    const history = await this.buildHistoryFromProbes(results);
    const capabilities = this.buildCapabilities(account, usage, spending, history);
    const conclusion = this.buildConclusion(capabilities);

    return {
      configured: this.client.isConfigured(),
      baseUrl: this.client.getBaseUrl(),
      results,
      capabilities,
      conclusion,
    };
  }

  private async probeAllDocumentedEndpoints(): Promise<ProbeResult[]> {
    const catalog = buildDocumentedEndpointCatalog();
    const results: ProbeResult[] = [];

    for (const spec of catalog) {
      if (spec.skipLiveProbe) {
        results.push(this.skippedProbe(spec));
        continue;
      }
      results.push(await this.probe(spec));
    }

    const agentsAccessible = results.some(
      (r) => r.endpoint === '/v1/agents' && r.accessible,
    );
    if (agentsAccessible) {
      const list = await this.client.request('GET', '/v1/agents', {
        query: { limit: 1 },
      });
      const id = this.extractFirstAgentId(list.body);
      if (id) {
        const usageSpec: DocumentedEndpointSpec = {
          endpoint: `/v1/agents/${id}/usage`,
          method: 'GET',
          availability: 'Cloud Agents API (personal / service-account keys)',
          purpose:
            'Per-cloud-agent token usage (not account-wide IDE / subscription usage)',
          docsUrl: 'https://cursor.com/docs/cloud-agent/api/endpoints',
        };
        results.push(await this.probe(usageSpec));
      }
    }

    return results;
  }

  private async getAccountFromCacheOrFetch(): Promise<AccountInfoResponse> {
    return this.getAccount();
  }

  async getAccount(): Promise<AccountInfoResponse> {
    if (!this.client.isConfigured()) {
      return {
        available: false,
        reason: 'CURSOR_API_KEY is not configured on the server',
        plan: unavailable('Not confirmed / unavailable'),
        organizationOrTeam: unavailable('Not confirmed / unavailable'),
      };
    }

    const response = await this.client.request('GET', '/v1/me');
    if (!response.ok || typeof response.body !== 'object' || response.body === null) {
      // Try legacy
      const legacy = await this.client.request('GET', '/v0/me');
      if (!legacy.ok || typeof legacy.body !== 'object' || legacy.body === null) {
        return {
          available: false,
          reason: statusMessage(response.status || legacy.status),
          plan: unavailable('Not exposed by this endpoint'),
          organizationOrTeam: unavailable('Not exposed by this endpoint'),
        };
      }
      return this.normalizeAccount(legacy.body as Record<string, unknown>, '/v0/me');
    }

    return this.normalizeAccount(response.body as Record<string, unknown>, '/v1/me');
  }

  async getUsage(): Promise<UsageInfoResponse> {
    const hints = await this.probeAllDocumentedEndpoints();
    return this.buildUsageFromProbes(hints);
  }

  async getSpending(): Promise<SpendingInfoResponse> {
    const hints = await this.probeAllDocumentedEndpoints();
    return this.buildSpendingFromProbes(hints);
  }

  async getUsageHistory(): Promise<UsageHistoryResponse> {
    const hints = await this.probeAllDocumentedEndpoints();
    return this.buildHistoryFromProbes(hints);
  }

  async getDashboard(): Promise<DashboardPayload> {
    const discovery = await this.discover();
    return {
      account: await this.getAccount(),
      usage: this.buildUsageFromProbes(discovery.results),
      spending: this.buildSpendingFromProbes(discovery.results),
      usageHistory: await this.buildHistoryFromProbes(discovery.results),
      capabilities: discovery.capabilities,
      conclusion: discovery.conclusion,
      discoverySummary: {
        tested: discovery.results.filter((r) => !r.skipped).length,
        accessible: discovery.results.filter((r) => r.accessible).length,
        inaccessible: discovery.results.filter(
          (r) => !r.accessible && !r.skipped,
        ).length,
        skipped: discovery.results.filter((r) => r.skipped).length,
      },
    };
  }

  private buildUsageFromProbes(hints: ProbeResult[]): UsageInfoResponse {
    const adminUsage = hints.find(
      (r) => r.endpoint === '/teams/daily-usage-data',
    );
    const agentUsage = hints.find(
      (r) => r.endpoint.includes('/usage') && r.endpoint.includes('/agents/'),
    );

    const accountWideAvailable = Boolean(adminUsage?.accessible);
    const cloudAgentTokensAvailable = Boolean(agentUsage?.accessible);

    if (!accountWideAvailable && !cloudAgentTokensAvailable) {
      return {
        available: false,
        reason:
          'No documented personal-key endpoint exposes account-wide Cursor IDE usage. Admin `/teams/daily-usage-data` requires Enterprise admin keys.',
        note:
          'Cloud Agents API documents only per-agent token usage via GET /v1/agents/{id}/usage — not subscription monthly usage.',
        currentUsage: unavailable('Not exposed by personal Cloud Agents API'),
        monthlyUsage: unavailable('Not exposed by personal Cloud Agents API'),
        dailyUsage: unavailable('Not exposed by personal Cloud Agents API'),
        usageLimits: unavailable('Not exposed by personal Cloud Agents API'),
        remainingUsage: unavailable('Not exposed by personal Cloud Agents API'),
        premiumUsage: unavailable('Not exposed by personal Cloud Agents API'),
        requestCounts: unavailable('Not exposed by personal Cloud Agents API'),
        tokenCounts: unavailable(
          'Account-wide token counts not exposed; only optional per-cloud-agent usage',
        ),
        modelUsage: unavailable('Not exposed by personal Cloud Agents API'),
        agentUsage: unavailable(
          'Account-wide agent usage not exposed; list agents only',
        ),
        composerUsage: unavailable('Not confirmed / unavailable'),
        chatUsage: unavailable('Not confirmed / unavailable'),
        tabUsage: unavailable('Not confirmed / unavailable'),
        discoveryHints: [adminUsage, agentUsage].filter(Boolean) as ProbeResult[],
      };
    }

    if (accountWideAvailable && adminUsage) {
      return {
        available: true,
        note:
          'Admin /teams/daily-usage-data was accessible (typically Enterprise admin key). Payload shape recorded in discovery.',
        currentUsage: {
          available: true,
          value: adminUsage.responseShape,
          source: '/teams/daily-usage-data',
        },
        monthlyUsage: {
          available: true,
          value: adminUsage.responseShape,
          source: '/teams/daily-usage-data',
        },
        dailyUsage: {
          available: true,
          value: adminUsage.responseShape,
          source: '/teams/daily-usage-data',
        },
        usageLimits: unavailable('Not exposed by this endpoint'),
        remainingUsage: unavailable('Not exposed by this endpoint'),
        premiumUsage: unavailable('Not exposed by this endpoint'),
        requestCounts: {
          available: true,
          value: adminUsage.responseShape,
          source: '/teams/daily-usage-data',
        },
        tokenCounts: unavailable('Prefer /teams/filtered-usage-events for costs'),
        modelUsage: unavailable('See Analytics API for model breakdown'),
        agentUsage: unavailable('Not exposed by this endpoint'),
        composerUsage: unavailable('Not confirmed / unavailable'),
        chatUsage: unavailable('Not confirmed / unavailable'),
        tabUsage: unavailable('Not confirmed / unavailable'),
        discoveryHints: [adminUsage],
      };
    }

    return {
      available: true,
      note:
        'Only per-cloud-agent token usage is available (not IDE Tab/Chat/Composer subscription usage).',
      currentUsage: unavailable('Account-wide current usage not exposed'),
      monthlyUsage: unavailable('Account-wide monthly usage not exposed'),
      dailyUsage: unavailable('Account-wide daily usage not exposed'),
      usageLimits: unavailable('Not exposed by personal Cloud Agents API'),
      remainingUsage: unavailable('Not exposed by personal Cloud Agents API'),
      premiumUsage: unavailable('Not exposed by personal Cloud Agents API'),
      requestCounts: unavailable('Not exposed by personal Cloud Agents API'),
      tokenCounts: cloudAgentTokensAvailable
        ? {
            available: true,
            value: agentUsage?.responseShape,
            source: agentUsage?.endpoint,
          }
        : unavailable('No agent usage probe succeeded'),
      modelUsage: unavailable('Not exposed by personal Cloud Agents API'),
      agentUsage: cloudAgentTokensAvailable
        ? {
            available: true,
            value: agentUsage?.responseShape,
            source: agentUsage?.endpoint,
          }
        : unavailable('Not available'),
      composerUsage: unavailable('Not confirmed / unavailable'),
      chatUsage: unavailable('Not confirmed / unavailable'),
      tabUsage: unavailable('Not confirmed / unavailable'),
      cloudAgentTokenUsage: cloudAgentTokensAvailable
        ? {
            available: true,
            value: agentUsage?.responseShape,
            source: agentUsage?.endpoint,
          }
        : unavailable('No cloud agents or usage endpoint inaccessible'),
      discoveryHints: [agentUsage].filter(Boolean) as ProbeResult[],
    };
  }

  private buildSpendingFromProbes(hints: ProbeResult[]): SpendingInfoResponse {
    const spend = hints.find((r) => r.endpoint === '/teams/spend');

    if (!spend?.accessible) {
      return {
        available: false,
        reason:
          'Spending endpoints are documented under the Enterprise Admin API (`POST /teams/spend`). Not available via personal Cloud Agents API key.',
        note: 'No documented personal-key spending or billing endpoint was found.',
        currentSpending: unavailable('Not exposed by personal Cloud Agents API'),
        monthlySpending: unavailable('Not exposed by personal Cloud Agents API'),
        usageBasedSpending: unavailable('Not exposed by personal Cloud Agents API'),
        subscriptionCost: unavailable('Not confirmed / unavailable'),
        perModelCost: unavailable('Not confirmed / unavailable'),
        remainingBudget: unavailable('Not confirmed / unavailable'),
        billingCycle: unavailable('Not confirmed / unavailable'),
        discoveryHints: spend ? [spend] : [],
      };
    }

    return {
      available: true,
      note: 'Returned by Enterprise Admin API /teams/spend',
      currentSpending: {
        available: true,
        value: spend.responseShape,
        source: '/teams/spend',
      },
      monthlySpending: {
        available: true,
        value: spend.responseShape,
        source: '/teams/spend',
      },
      usageBasedSpending: {
        available: true,
        value: spend.responseShape,
        source: '/teams/spend',
      },
      subscriptionCost: unavailable('Not exposed by this endpoint'),
      perModelCost: unavailable('Not exposed by this endpoint'),
      remainingBudget: {
        available: true,
        value: spend.responseShape,
        source: '/teams/spend',
      },
      billingCycle: {
        available: true,
        value: spend.responseShape,
        source: '/teams/spend',
      },
      discoveryHints: [spend],
    };
  }

  private async buildHistoryFromProbes(
    hints: ProbeResult[],
  ): Promise<UsageHistoryResponse> {
    const daily = hints.find((r) => r.endpoint === '/teams/daily-usage-data');
    const events = hints.find(
      (r) => r.endpoint === '/teams/filtered-usage-events',
    );

    if (!daily?.accessible && !events?.accessible) {
      return {
        available: false,
        reason:
          'Historical usage is documented on Enterprise Admin endpoints only. No personal-key usage history endpoint is documented.',
        history: [],
        discoveryHints: [daily, events].filter(Boolean) as ProbeResult[],
      };
    }

    const history: UsageHistoryDay[] = [];
    if (daily?.accessible) {
      const body = await this.client.request('POST', '/teams/daily-usage-data', {
        body: {
          startDate: Date.now() - 30 * 24 * 60 * 60 * 1000,
          endDate: Date.now(),
        },
      });
      history.push(...this.normalizeHistoryFromDaily(body.body));
    }

    return {
      available: history.length > 0,
      reason:
        history.length === 0
          ? 'Endpoint accessible but no normalizable history rows returned'
          : undefined,
      note: 'Normalized only from fields Cursor actually returned',
      history,
      discoveryHints: [daily, events].filter(Boolean) as ProbeResult[],
    };
  }

  async getDebugInspections(): Promise<DebugInspection[]> {
    const results = await this.probeAllDocumentedEndpoints();
    return results
      .filter((r) => !r.skipped)
      .map((r) => ({
        endpoint: r.endpoint,
        method: r.method,
        status: r.status,
        responseHeaders: r.responseHeaders ?? {},
        rawResponse: r.rawResponse ?? r.errorBody ?? r.responseShape,
        normalizedResponse: {
          accessible: r.accessible,
          message: r.message,
          availability: r.availability,
          purpose: r.purpose,
          responseShape: r.responseShape,
        },
        message: r.message,
        responseTime: r.responseTime,
      }));
  }

  /**
   * Re-fetch a single documented path for the debug inspector with full raw body.
   */
  async inspectEndpoint(
    endpoint: string,
    method: 'GET' | 'POST' = 'GET',
  ): Promise<DebugInspection> {
    const catalog = buildDocumentedEndpointCatalog();
    const spec = catalog.find(
      (s) => s.endpoint === endpoint && s.method === method,
    );

    const response = await this.client.request(method, endpoint, {
      body: spec?.body,
      query:
        endpoint === '/analytics/team/dau' ||
        endpoint === '/analytics/by-user/models'
          ? { startDate: '7d', endDate: 'today' }
          : endpoint === '/v1/agents' || endpoint === '/v0/agents'
            ? { limit: 5 }
            : undefined,
    });

    return {
      endpoint,
      method,
      status: response.status || null,
      responseHeaders: response.headers,
      rawResponse: redactSecrets(response.body),
      normalizedResponse: {
        message: statusMessage(response.status || null),
        accessible: response.ok,
        shape: responseShape(redactSecrets(response.body)),
      },
      message: statusMessage(response.status || null),
      responseTime: response.responseTimeMs,
    };
  }

  private async probe(spec: DocumentedEndpointSpec): Promise<ProbeResult> {
    if (!this.client.isConfigured()) {
      return {
        endpoint: spec.endpoint,
        method: spec.method,
        authentication: 'API key',
        status: 401,
        accessible: false,
        responseTime: 0,
        responseShape: { error: 'CURSOR_API_KEY not configured' },
        message: 'Authentication failed',
        availability: spec.availability,
        purpose: spec.purpose,
        docsUrl: spec.docsUrl,
      };
    }

    const query =
      spec.endpoint === '/analytics/team/dau' ||
      spec.endpoint === '/analytics/by-user/models'
        ? { startDate: '7d', endDate: 'today' }
        : spec.endpoint === '/v1/agents' || spec.endpoint === '/v0/agents'
          ? { limit: 5 }
          : undefined;

    const response = await this.client.request(spec.method, spec.endpoint, {
      body: spec.body,
      query,
      timeoutMs: spec.endpoint.includes('repositories') ? 60_000 : 30_000,
    });

    const status = response.status || null;
    const accessible = Boolean(response.ok);
    const redacted = redactSecrets(response.body);

    return {
      endpoint: spec.endpoint,
      method: spec.method,
      authentication: 'API key',
      status,
      accessible,
      responseTime: response.responseTimeMs,
      responseShape: accessible ? responseShape(redacted) : redacted,
      rawResponse: redacted,
      message: statusMessage(status),
      availability: spec.availability,
      purpose: spec.purpose,
      docsUrl: spec.docsUrl,
      errorBody: accessible ? undefined : redacted,
      responseHeaders: response.headers,
    };
  }

  private skippedProbe(spec: DocumentedEndpointSpec): ProbeResult {
    return {
      endpoint: spec.endpoint,
      method: spec.method,
      authentication: 'API key',
      status: null,
      accessible: false,
      responseTime: 0,
      responseShape: { skipped: true },
      message: spec.skipReason || 'Skipped',
      availability: spec.availability,
      purpose: spec.purpose,
      docsUrl: spec.docsUrl,
      skipped: true,
      skipReason: spec.skipReason,
    };
  }

  private normalizeAccount(
    body: Record<string, unknown>,
    sourceEndpoint: string,
  ): AccountInfoResponse {
    const safe = redactSecrets(body);
    return {
      available: true,
      sourceEndpoint,
      email: (safe.userEmail as string) ?? null,
      userId: (safe.userId as string | number) ?? null,
      apiKeyName: (safe.apiKeyName as string) ?? null,
      createdAt: (safe.createdAt as string) ?? null,
      userFirstName: (safe.userFirstName as string) ?? null,
      userLastName: (safe.userLastName as string) ?? null,
      accountType: safe.userEmail
        ? 'user-scoped API key'
        : 'service-account or team API key (no userEmail)',
      plan: unavailable(
        'Plan/subscription not returned by /v1/me or /v0/me',
      ),
      organizationOrTeam: unavailable(
        'Organization/team association not returned by /v1/me or /v0/me',
      ),
      rawFields: safe,
      note: 'Only fields documented on Cloud Agents API Key Info endpoints are returned.',
    };
  }

  private extractFirstAgentId(body: unknown): string | null {
    if (!body || typeof body !== 'object') {
      return null;
    }
    const agents = (body as { agents?: unknown }).agents;
    if (Array.isArray(agents) && agents.length > 0) {
      const first = agents[0] as { id?: string };
      return first.id ?? null;
    }
    // Shape summary path may not have IDs
    return null;
  }

  private normalizeHistoryFromDaily(body: unknown): UsageHistoryDay[] {
    if (!body || typeof body !== 'object') {
      return [];
    }
    const data = (body as { data?: unknown }).data;
    if (!Array.isArray(data)) {
      return [];
    }

    const byDay = new Map<string, UsageHistoryDay>();
    for (const row of data) {
      if (!row || typeof row !== 'object') continue;
      const r = row as Record<string, unknown>;
      const date =
        typeof r.day === 'string'
          ? r.day
          : typeof r.date === 'number'
            ? new Date(r.date).toISOString().slice(0, 10)
            : null;
      if (!date) continue;

      const existing = byDay.get(date) ?? { date };
      const reqs =
        Number(r.totalRequests ?? r.subscriptionIncludedReqs ?? 0) +
        Number(r.usageBasedReqs ?? 0) +
        Number(r.apiKeyReqs ?? 0);
      if (!Number.isNaN(reqs) && reqs > 0) {
        existing.requests = (existing.requests ?? 0) + reqs;
      }
      // Only attach fields Cursor provided
      for (const key of Object.keys(r)) {
        if (['day', 'date', 'email', 'userId', 'isActive'].includes(key)) {
          continue;
        }
        if (existing[key] === undefined) {
          existing[key] = r[key];
        }
      }
      byDay.set(date, existing);
    }

    return Array.from(byDay.values()).sort((a, b) =>
      a.date.localeCompare(b.date),
    );
  }

  private buildCapabilities(
    account: AccountInfoResponse,
    usage: UsageInfoResponse,
    spending: SpendingInfoResponse,
    history: UsageHistoryResponse,
  ): CapabilitiesSummary {
    const metricTrue = (m: UsageMetric) => m.available === true;
    return {
      accountInformation: account.available,
      usage: usage.available && metricTrue(usage.currentUsage),
      usageHistory: history.available && history.history.length > 0,
      spending: spending.available,
      limits: metricTrue(usage.usageLimits),
      modelUsage: metricTrue(usage.modelUsage),
      tokenUsage: metricTrue(usage.tokenCounts),
      billingData: spending.available,
    };
  }

  private buildConclusion(
    capabilities: CapabilitiesSummary,
  ): PersonalKeyConclusion {
    const yn = (v: boolean): 'AVAILABLE' | 'NOT AVAILABLE' =>
      v ? 'AVAILABLE' : 'NOT AVAILABLE';

    return {
      accountData: yn(capabilities.accountInformation),
      usageData: yn(capabilities.usage),
      usageLimits: yn(capabilities.limits),
      remainingUsage: yn(false),
      usageHistory: yn(capabilities.usageHistory),
      modelUsage: yn(capabilities.modelUsage),
      tokenUsage: yn(capabilities.tokenUsage),
      spending: yn(capabilities.spending),
      billingData: yn(capabilities.billingData),
      multiEmployeeDashboard: 'NO',
      multiEmployeeExplanation:
        'Official usage, spending, and analytics APIs are documented for Enterprise team/admin keys, not personal Cloud Agents API keys. A personal key can identify the key owner via /v1/me and operate Cloud Agents, but cannot retrieve company-wide IDE usage or billing. Building a multi-employee dashboard requires Enterprise Admin/Analytics API access (or collecting telemetry outside Cursor).',
    };
  }
}
