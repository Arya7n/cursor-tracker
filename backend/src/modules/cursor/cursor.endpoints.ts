import { DocumentedEndpointSpec } from './cursor.types';

/**
 * ONLY documented Cursor endpoints relevant to personal-key capability research.
 * Sources:
 * - https://cursor.com/docs/api
 * - https://cursor.com/docs/cloud-agent/api/endpoints
 * - https://cursor.com/docs/cloud-agent/api/v0
 * - https://cursor.com/docs/account/teams/admin-api
 * - https://cursor.com/docs/account/teams/analytics-api
 *
 * Do not add undocumented paths.
 */
export function buildDocumentedEndpointCatalog(): DocumentedEndpointSpec[] {
  const now = Date.now();
  const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;

  return [
    // ── Cloud Agents API (personal user API keys documented) ───────────────
    {
      endpoint: '/v1/me',
      method: 'GET',
      availability: 'Cloud Agents API (personal / service-account keys)',
      purpose: 'API key / authenticated user metadata',
      docsUrl: 'https://cursor.com/docs/cloud-agent/api/endpoints',
    },
    {
      endpoint: '/v1/models',
      method: 'GET',
      availability: 'Cloud Agents API (personal / service-account keys)',
      purpose: 'List models available for Cloud Agents',
      docsUrl: 'https://cursor.com/docs/cloud-agent/api/endpoints',
    },
    {
      endpoint: '/v1/agents',
      method: 'GET',
      availability: 'Cloud Agents API (personal / service-account keys)',
      purpose: 'List cloud agents for the authenticated user',
      docsUrl: 'https://cursor.com/docs/cloud-agent/api/endpoints',
    },
    {
      endpoint: '/v1/repositories',
      method: 'GET',
      availability: 'Cloud Agents API (personal / service-account keys)',
      purpose:
        'List GitHub repositories (strict rate limits: 1/min, 30/hour)',
      docsUrl: 'https://cursor.com/docs/cloud-agent/api/endpoints',
    },
    {
      endpoint: '/v0/me',
      method: 'GET',
      availability: 'Cloud Agents API (personal / service-account keys)',
      purpose: 'Legacy API key info',
      docsUrl: 'https://cursor.com/docs/cloud-agent/api/v0',
    },
    {
      endpoint: '/v0/models',
      method: 'GET',
      availability: 'Cloud Agents API (personal / service-account keys)',
      purpose: 'Legacy list of recommended model IDs',
      docsUrl: 'https://cursor.com/docs/cloud-agent/api/v0',
    },
    {
      endpoint: '/v0/agents',
      method: 'GET',
      availability: 'Cloud Agents API (personal / service-account keys)',
      purpose: 'Legacy list cloud agents',
      docsUrl: 'https://cursor.com/docs/cloud-agent/api/v0',
    },
    {
      endpoint: '/v1/agents/{id}/usage',
      method: 'GET',
      availability: 'Documented but requires resource ID',
      purpose:
        'Per-cloud-agent token usage (NOT account-wide monthly usage). Probe runs only if an agent ID is discovered.',
      skipLiveProbe: true,
      skipReason:
        'Requires a concrete agent id; probed dynamically after GET /v1/agents when available',
      docsUrl: 'https://cursor.com/docs/cloud-agent/api/endpoints',
    },

    // ── Admin API (Enterprise) — probe to confirm personal key cannot access ─
    {
      endpoint: '/teams/members',
      method: 'GET',
      availability: 'Admin API (Enterprise team admin keys)',
      purpose: 'Team member roster',
      docsUrl: 'https://cursor.com/docs/account/teams/admin-api',
    },
    {
      endpoint: '/teams/daily-usage-data',
      method: 'POST',
      availability: 'Admin API (Enterprise team admin keys)',
      purpose: 'Team daily usage metrics (account-wide usage)',
      body: {
        startDate: thirtyDaysAgo,
        endDate: now,
      },
      docsUrl: 'https://cursor.com/docs/account/teams/admin-api',
    },
    {
      endpoint: '/teams/spend',
      method: 'POST',
      availability: 'Admin API (Enterprise team admin keys)',
      purpose: 'Team spending for current billing cycle',
      body: {
        page: 1,
        pageSize: 10,
      },
      docsUrl: 'https://cursor.com/docs/account/teams/admin-api',
    },
    {
      endpoint: '/teams/filtered-usage-events',
      method: 'POST',
      availability: 'Admin API (Enterprise team admin keys)',
      purpose: 'Filtered usage events / request costs',
      body: {
        startDate: thirtyDaysAgo,
        endDate: now,
        page: 1,
        pageSize: 10,
      },
      docsUrl: 'https://cursor.com/docs/account/teams/admin-api',
    },

    // ── Analytics API (Enterprise) ─────────────────────────────────────────
    {
      endpoint: '/analytics/team/dau',
      method: 'GET',
      availability: 'Analytics API (Enterprise team admin keys)',
      purpose: 'Team daily active users',
      docsUrl: 'https://cursor.com/docs/account/teams/analytics-api',
    },
    {
      endpoint: '/analytics/by-user/models',
      method: 'GET',
      availability: 'Analytics API (Enterprise team admin keys)',
      purpose: 'Model usage broken down by user',
      docsUrl: 'https://cursor.com/docs/account/teams/analytics-api',
    },
  ];
}
