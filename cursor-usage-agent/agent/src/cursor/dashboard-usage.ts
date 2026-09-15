import { readAccessTokenEphemeral } from './local-session.js';

const DASHBOARD_BASE = 'https://api2.cursor.sh/aiserver.v1.DashboardService';

export interface PlanUsageSnapshot {
  billingCycleStart: string | null;
  billingCycleEnd: string | null;
  planName: string | null;
  planPrice: string | null;
  includedAmountCents: number | null;
  /** Amounts in USD (converted from cents) */
  usedUsd: number | null;
  includedUsedUsd: number | null;
  bonusUsedUsd: number | null;
  limitUsd: number | null;
  remainingUsd: number | null;
  totalPercentUsed: number | null;
  autoPercentUsed: number | null;
  apiPercentUsed: number | null;
  displayMessage: string | null;
  autoDisplayMessage: string | null;
  apiDisplayMessage: string | null;
  onDemand: {
    individualLimitUsd: number | null;
    individualUsedUsd: number | null;
    individualRemainingUsd: number | null;
    limitType: string | null;
  };
  rawSafe: Record<string, unknown>;
}

function centsToUsd(cents: unknown): number | null {
  if (typeof cents !== 'number' || Number.isNaN(cents)) return null;
  return Math.round(cents) / 100;
}

function msToIso(ms: unknown): string | null {
  const n = typeof ms === 'string' ? Number(ms) : typeof ms === 'number' ? ms : NaN;
  if (!Number.isFinite(n)) return null;
  return new Date(n).toISOString();
}

async function postDashboard(
  path: string,
  token: string,
): Promise<{ ok: boolean; status: number; body: unknown }> {
  const res = await fetch(`${DASHBOARD_BASE}/${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Connect-Protocol-Version': '1',
    },
    body: '{}',
  });
  const text = await res.text();
  let body: unknown = text;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = { error: 'non-json', preview: text.slice(0, 200) };
  }
  return { ok: res.ok, status: res.status, body };
}

/**
 * Fetch current-period plan usage using the same DashboardService
 * the Cursor IDE / CLI `/usage` view uses for the logged-in user.
 * Token is read ephemerally and never returned.
 */
export async function fetchPlanUsageSnapshot(): Promise<{
  available: boolean;
  reason: string;
  snapshot: PlanUsageSnapshot | null;
}> {
  const token = readAccessTokenEphemeral();
  if (!token) {
    return {
      available: false,
      reason:
        'No Cursor IDE access token found. Sign in to Cursor Desktop, then re-run scan.',
      snapshot: null,
    };
  }

  try {
    const [usageRes, planRes] = await Promise.all([
      postDashboard('GetCurrentPeriodUsage', token),
      postDashboard('GetPlanInfo', token),
    ]);

    if (!usageRes.ok || !usageRes.body || typeof usageRes.body !== 'object') {
      return {
        available: false,
        reason: `GetCurrentPeriodUsage failed (HTTP ${usageRes.status})`,
        snapshot: null,
      };
    }

    const usage = usageRes.body as Record<string, unknown>;
    const planUsage = (usage.planUsage || {}) as Record<string, unknown>;
    const spendLimit = (usage.spendLimitUsage || {}) as Record<string, unknown>;
    const planInfo =
      planRes.ok && planRes.body && typeof planRes.body === 'object'
        ? ((planRes.body as Record<string, unknown>).planInfo as
            | Record<string, unknown>
            | undefined)
        : undefined;

    const includedUsed = centsToUsd(planUsage.includedSpend);
    const limit =
      centsToUsd(planUsage.limit) ??
      centsToUsd(planInfo?.includedAmountCents) ??
      null;
    const remaining =
      centsToUsd(planUsage.remaining) ??
      (includedUsed != null && limit != null
        ? Math.max(0, Math.round((limit - includedUsed) * 100) / 100)
        : null);

    const snapshot: PlanUsageSnapshot = {
      billingCycleStart: msToIso(usage.billingCycleStart),
      billingCycleEnd: msToIso(usage.billingCycleEnd),
      planName: typeof planInfo?.planName === 'string' ? planInfo.planName : null,
      planPrice: typeof planInfo?.price === 'string' ? planInfo.price : null,
      includedAmountCents:
        typeof planInfo?.includedAmountCents === 'number'
          ? planInfo.includedAmountCents
          : typeof planUsage.limit === 'number'
            ? planUsage.limit
            : null,
      usedUsd: centsToUsd(planUsage.totalSpend),
      includedUsedUsd: includedUsed,
      bonusUsedUsd: centsToUsd(planUsage.bonusSpend),
      limitUsd: limit,
      remainingUsd: remaining,
      totalPercentUsed:
        typeof planUsage.totalPercentUsed === 'number'
          ? planUsage.totalPercentUsed
          : null,
      autoPercentUsed:
        typeof planUsage.autoPercentUsed === 'number'
          ? planUsage.autoPercentUsed
          : null,
      apiPercentUsed:
        typeof planUsage.apiPercentUsed === 'number'
          ? planUsage.apiPercentUsed
          : null,
      displayMessage:
        typeof usage.displayMessage === 'string' ? usage.displayMessage : null,
      autoDisplayMessage:
        typeof usage.autoModelSelectedDisplayMessage === 'string'
          ? usage.autoModelSelectedDisplayMessage
          : null,
      apiDisplayMessage:
        typeof usage.namedModelSelectedDisplayMessage === 'string'
          ? usage.namedModelSelectedDisplayMessage
          : null,
      onDemand: {
        individualLimitUsd: centsToUsd(spendLimit.individualLimit),
        individualUsedUsd: centsToUsd(spendLimit.individualUsed),
        individualRemainingUsd: centsToUsd(spendLimit.individualRemaining),
        limitType:
          typeof spendLimit.limitType === 'string' ? spendLimit.limitType : null,
      },
      rawSafe: {
        billingCycleStart: usage.billingCycleStart,
        billingCycleEnd: usage.billingCycleEnd,
        planUsage: {
          totalSpend: planUsage.totalSpend,
          includedSpend: planUsage.includedSpend,
          bonusSpend: planUsage.bonusSpend,
          limit: planUsage.limit,
          remaining: planUsage.remaining,
          autoPercentUsed: planUsage.autoPercentUsed,
          apiPercentUsed: planUsage.apiPercentUsed,
          totalPercentUsed: planUsage.totalPercentUsed,
        },
        spendLimitUsage: {
          limitType: spendLimit.limitType,
          individualLimit: spendLimit.individualLimit,
          individualUsed: spendLimit.individualUsed,
          individualRemaining: spendLimit.individualRemaining,
        },
        displayMessage: usage.displayMessage,
        planInfo: planInfo
          ? {
              planName: planInfo.planName,
              price: planInfo.price,
              includedAmountCents: planInfo.includedAmountCents,
              billingCycleEnd: planInfo.billingCycleEnd,
            }
          : null,
      },
    };

    return {
      available: true,
      reason: 'Fetched via DashboardService GetCurrentPeriodUsage + GetPlanInfo',
      snapshot,
    };
  } catch (e) {
    return {
      available: false,
      reason: e instanceof Error ? e.message : 'Usage fetch failed',
      snapshot: null,
    };
  }
}
