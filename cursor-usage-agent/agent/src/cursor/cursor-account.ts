import {
  detectAgentCli,
  runAgentCli,
} from './cursor-detector.js';
import { fetchPlanUsageSnapshot } from './dashboard-usage.js';
import { readLocalIdentity } from './local-session.js';
import type { AccountInfo, DiscoverySourceResult } from './types.js';
import { redactSecrets } from '../security/redact.js';

/**
 * Account detection: prefer IDE local identity + plan info; fall back to Agent CLI.
 * Never exposes tokens.
 */
export async function detectAccount(): Promise<{
  account: AccountInfo;
  discovery: DiscoverySourceResult;
}> {
  const local = readLocalIdentity();
  const planLive = await fetchPlanUsageSnapshot();
  const planName =
    planLive.snapshot?.planName ||
    (local.membershipType
      ? local.membershipType.charAt(0).toUpperCase() + local.membershipType.slice(1)
      : null);

  if (local.email || local.hasAccessToken) {
    const fields = [
      ...(local.email ? ['cachedEmail'] : []),
      ...(local.membershipType ? ['stripeMembershipType'] : []),
      ...(planName ? ['planName'] : []),
    ];
    return {
      account: {
        status: local.email ? 'AVAILABLE' : 'UNKNOWN',
        authenticated: Boolean(local.email || local.hasAccessToken),
        identifier: local.email,
        plan: planName ?? 'UNKNOWN',
        source: 'Cursor IDE local session + DashboardService/GetPlanInfo',
        fields,
        reason: local.email
          ? 'Signed-in Cursor IDE account detected'
          : 'IDE token present but email not cached',
      },
      discovery: {
        source: 'IDE state.vscdb (non-secret fields) + GetPlanInfo',
        available: Boolean(local.email),
        fields,
        reason: 'Local IDE identity for the logged-in developer',
        rawSafeSummary: redactSecrets({
          email: local.email,
          membershipType: local.membershipType,
          subscriptionStatus: local.subscriptionStatus,
          planName,
          hasAccessToken: local.hasAccessToken,
        }),
      },
    };
  }

  const cli = await detectAgentCli();
  if (!cli.available || !cli.path) {
    return {
      account: {
        status: 'NOT AVAILABLE',
        authenticated: false,
        identifier: null,
        plan: null,
        source: null,
        fields: [],
        reason: 'Cursor IDE not signed in and Agent CLI not available',
      },
      discovery: {
        source: 'IDE session / agent CLI',
        available: false,
        fields: [],
        reason: 'No local identity',
      },
    };
  }

  let statusJson: Record<string, unknown> | null = null;
  let aboutJson: Record<string, unknown> | null = null;
  try {
    const raw = await runAgentCli(cli.path, ['status', '--format', 'json']);
    statusJson = safeJson(raw);
  } catch {
    /* ignore */
  }
  try {
    const raw = await runAgentCli(cli.path, ['about', '--format', 'json']);
    aboutJson = safeJson(raw);
  } catch {
    /* ignore */
  }

  const isAuthenticated =
    typeof statusJson?.isAuthenticated === 'boolean'
      ? statusJson.isAuthenticated
      : null;
  const email =
    typeof aboutJson?.userEmail === 'string' && aboutJson.userEmail
      ? aboutJson.userEmail
      : null;

  return {
    account: {
      status: email ? 'AVAILABLE' : 'NOT AVAILABLE',
      authenticated: isAuthenticated,
      identifier: email,
      plan:
        aboutJson?.subscriptionTier != null
          ? String(aboutJson.subscriptionTier)
          : 'UNKNOWN',
      source: 'official Cursor Agent CLI',
      fields: email ? ['userEmail'] : [],
      reason: email
        ? 'CLI authenticated'
        : 'Sign in to Cursor Desktop (or run `agent login`) to enable usage tracking',
    },
    discovery: {
      source: 'agent status / about',
      available: Boolean(email),
      fields: email ? ['userEmail'] : [],
      reason: 'CLI fallback',
    },
  };
}

function safeJson(text: string): Record<string, unknown> | null {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start < 0 || end < start) return null;
  try {
    return JSON.parse(text.slice(start, end + 1)) as Record<string, unknown>;
  } catch {
    return null;
  }
}
