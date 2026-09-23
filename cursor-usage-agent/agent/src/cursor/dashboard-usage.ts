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
    /** Matches Settings → Plan & Usage On-Demand toggle. Null if unknown. */
    enabled: boolean | null;
    individualLimitUsd: number | null;
    individualUsedUsd: number | null;
    individualRemainingUsd: number | null;
    percentUsed: number | null;
    limitType: string | null;
  };
  rawSafe: Record<string, unknown>;
}

function centsToUsd(cents: unknown): number | null {
  if (typeof cents !== 'number' || Number.isNaN(cents)) return null;
  return Math.round(cents) / 100;
}

function ratioPercent(used: number | null, limit: number | null): number | null {
  if (used == null || limit == null || limit <= 0) return null;
  return Math.round((used / limit) * 1000) / 10;
}

function asBool(v: unknown): boolean | null {
  return typeof v === 'boolean' ? v : null;
}

/** Cursor encodes Unlimited as 2^31-1 (or another huge sentinel), not a real cap. */
function realUsdCap(usd: number | null): number | null {
  if (usd == null || !Number.isFinite(usd) || usd <= 0) return null;
  if (usd >= 1_000_000) return null;
  return usd;
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
    const [usageRes, planRes, hardRes] = await Promise.all([
      postDashboard('GetCurrentPeriodUsage', token),
      postDashboard('GetPlanInfo', token),
      postDashboard('GetHardLimit', token),
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
    const hardOk =
      hardRes.ok && hardRes.body && typeof hardRes.body === 'object';
    const hardLimit = hardOk ? (hardRes.body as Record<string, unknown>) : {};
    const planInfo =
      planRes.ok && planRes.body && typeof planRes.body === 'object'
        ? ((planRes.body as Record<string, unknown>).planInfo as
            | Record<string, unknown>
            | undefined)
        : undefined;

    const includedUsed = centsToUsd(planUsage.includedSpend);
    const bonusUsedUsd = centsToUsd(planUsage.bonusSpend);
    const usedUsd = centsToUsd(planUsage.totalSpend);
    const limit =
      centsToUsd(planUsage.limit) ??
      centsToUsd(planInfo?.includedAmountCents) ??
      null;
    const remaining =
      centsToUsd(planUsage.remaining) ??
      (includedUsed != null && limit != null
        ? Math.max(0, Math.round((limit - includedUsed) * 100) / 100)
        : null);

    const onDemandUsedUsd = centsToUsd(spendLimit.individualUsed);
    const hardLimitUsd = realUsdCap(
      typeof hardLimit.hardLimit === 'number' ? hardLimit.hardLimit : null,
    );
    const onDemandLimitUsd = realUsdCap(
      centsToUsd(spendLimit.individualLimit) ?? hardLimitUsd,
    );
    const onDemandRemainingUsd =
      centsToUsd(spendLimit.individualRemaining) ??
      (onDemandUsedUsd != null && onDemandLimitUsd != null
        ? Math.max(0, Math.round((onDemandLimitUsd - onDemandUsedUsd) * 100) / 100)
        : null);
    // Settings On-Demand toggle is GetHardLimit.noUsageBasedAllowed
    // (true = Disabled). A missing monthly cap means Unlimited, not Off.
    const blocked = hardOk ? asBool(hardLimit.noUsageBasedAllowed) : null;
    const onDemandEnabled: boolean | null = hardOk
      ? blocked !== true
      : asBool(spendLimit.enabled) ??
        asBool(spendLimit.isEnabled) ??
        asBool(spendLimit.onDemandEnabled) ??
        (onDemandLimitUsd != null && onDemandLimitUsd > 0 ? true : null);

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
      usedUsd: usedUsd,
      includedUsedUsd: includedUsed,
      bonusUsedUsd: bonusUsedUsd,
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
        enabled: onDemandEnabled,
        individualLimitUsd: onDemandLimitUsd,
        individualUsedUsd: onDemandUsedUsd,
        individualRemainingUsd: onDemandRemainingUsd,
        percentUsed: ratioPercent(onDemandUsedUsd, onDemandLimitUsd),
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
          enabled: spendLimit.enabled ?? spendLimit.isEnabled ?? spendLimit.onDemandEnabled ?? null,
          individualLimit: spendLimit.individualLimit,
          individualUsed: spendLimit.individualUsed,
          individualRemaining: spendLimit.individualRemaining,
        },
        hardLimit: {
          hardLimit: hardLimit.hardLimit ?? null,
          noUsageBasedAllowed: hardLimit.noUsageBasedAllowed ?? null,
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
      reason:
        'Fetched via DashboardService GetCurrentPeriodUsage + GetPlanInfo + GetHardLimit',
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
