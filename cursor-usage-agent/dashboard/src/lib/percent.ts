import { inCurrentBillingCycle } from './format';

/** Percent Cursor actually paints in the IDE usage UI. */
export function cursorUsagePercent(
  usage: Record<string, unknown> | null | undefined,
): number | null {
  if (!usage) return null;
  const auto = num(usage.autoPercentUsed);
  const api = num(usage.apiPercentUsed);
  const total = num(usage.totalPercentUsed);

  if (auto != null && api != null && api > 0 && auto > 0) {
    return total ?? auto;
  }
  if (auto != null && (api == null || api === 0)) return auto;
  if (api != null && (auto == null || auto === 0)) return api;
  return total ?? auto ?? api;
}

export function onDemandPercentUsed(
  used: number | null | undefined,
  limit: number | null | undefined,
): number | null {
  if (
    used == null ||
    limit == null ||
    !Number.isFinite(used) ||
    !Number.isFinite(limit) ||
    limit <= 0
  ) {
    return null;
  }
  return Math.round((used / limit) * 1000) / 10;
}

export type OnDemandSpend = {
  on: boolean;
  inCurrentCycle: boolean;
  /** On-demand $ used this cycle — only from Cursor spend-limit meters. */
  afterIncludedUsd: number | null;
  percent: number | null;
  limitUsd: number | null;
  usedUsd: number | null;
  remainingUsd: number | null;
  enabled: boolean;
};

const off = (inCurrentCycle: boolean): OnDemandSpend => ({
  on: false,
  inCurrentCycle,
  afterIncludedUsd: null,
  percent: null,
  limitUsd: null,
  usedUsd: null,
  remainingUsd: null,
  enabled: false,
});

/**
 * Matches Cursor Settings → Plan & Usage → On-Demand Spending.
 * Bonus/included plan dollars are not on-demand. On/Off follows the
 * Settings toggle (GetHardLimit). Unlimited (no cap) is still On.
 */
export function pickOnDemand(
  usage: Record<string, unknown> | null | undefined,
  cycle?: { start?: string | null; end?: string | null } | null,
): OnDemandSpend {
  const inCurrentCycle = inCurrentBillingCycle(cycle?.start, cycle?.end);
  if (!usage || !inCurrentCycle) return off(inCurrentCycle);

  const used = num(usage.onDemandUsedUsd);
  const rawLimit = num(usage.onDemandLimitUsd);
  const limit =
    rawLimit != null && rawLimit > 0 && rawLimit < 1_000_000 ? rawLimit : null;
  const remaining = num(usage.onDemandRemainingUsd);
  const flagged =
    typeof usage.onDemandEnabled === 'boolean' ? usage.onDemandEnabled : null;
  const enabled = flagged === true || (flagged == null && limit != null && limit > 0);
  if (!enabled) return off(true);

  const percent =
    num(usage.onDemandPercentUsed) ?? onDemandPercentUsed(used, limit);
  const spent = used != null && used > 0 ? used : null;

  return {
    on: true,
    inCurrentCycle: true,
    afterIncludedUsd: spent,
    percent,
    limitUsd: limit,
    usedUsd: used,
    remainingUsd: remaining,
    enabled: true,
  };
}

function num(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}
