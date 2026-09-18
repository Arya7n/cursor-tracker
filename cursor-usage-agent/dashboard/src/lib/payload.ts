export function buildSyncPayload(report: Record<string, unknown>) {
  const account = (report.account || {}) as Record<string, unknown>;
  const cursor = (report.cursor || {}) as Record<string, unknown>;
  const machine = (report.machine || {}) as Record<string, unknown>;
  const usage = (report.usage || {}) as Record<string, unknown>;
  const current = (usage.current || {}) as Record<string, unknown>;
  const remaining = (usage.remaining || {}) as Record<string, unknown>;
  const percentage = (usage.percentage || {}) as Record<string, unknown>;
  const billing = (usage.billingCycle || {}) as Record<string, unknown>;
  const spending = (usage.spending || {}) as Record<string, unknown>;
  const onDemand = flattenOnDemand(spending);

  return {
    timestamp: report.timestamp,
    agentVersion: report.agentVersion,
    cursorVersion: cursor.version ?? null,
    hostname: machine.hostname ?? null,
    os: machine.os ?? null,
    email: account.identifier ?? null,
    plan: account.plan ?? billing.planName ?? null,
    usage: {
      available: Boolean(usage.available),
      usedUsd: current.usedUsd ?? null,
      includedUsedUsd: current.includedUsedUsd ?? null,
      bonusUsedUsd: current.bonusUsedUsd ?? null,
      remainingUsd: remaining.remainingUsd ?? null,
      limitUsd: remaining.limitUsd ?? null,
      totalPercentUsed: percentage.totalPercentUsed ?? null,
      autoPercentUsed: percentage.autoPercentUsed ?? null,
      apiPercentUsed: percentage.apiPercentUsed ?? null,
      displayMessage: current.displayMessage ?? null,
      ...onDemand,
    },
    billingCycle: {
      start: billing.start ?? null,
      end: billing.end ?? null,
    },
    spending: {
      planPrice: spending.planPrice ?? null,
      planUsedUsd: spending.planUsedUsd ?? null,
      ...onDemand,
    },
  };
}

function num(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

function flattenOnDemand(spending: Record<string, unknown>) {
  const nested =
    spending.onDemand && typeof spending.onDemand === 'object'
      ? (spending.onDemand as Record<string, unknown>)
      : {};
  const used = num(nested.individualUsedUsd) ?? num(spending.onDemandUsedUsd);
  const limit = num(nested.individualLimitUsd) ?? num(spending.onDemandLimitUsd);
  const remaining =
    num(nested.individualRemainingUsd) ??
    num(spending.onDemandRemainingUsd) ??
    (used != null && limit != null
      ? Math.max(0, Math.round((limit - used) * 100) / 100)
      : null);
  const percent =
    num(nested.percentUsed) ??
    num(spending.onDemandPercentUsed) ??
    (used != null && limit != null && limit > 0
      ? Math.round((used / limit) * 1000) / 10
      : null);
  const limitType =
    typeof nested.limitType === 'string'
      ? nested.limitType
      : typeof spending.onDemandLimitType === 'string'
        ? spending.onDemandLimitType
        : null;
  const enabled =
    typeof nested.enabled === 'boolean'
      ? nested.enabled
      : typeof spending.onDemandEnabled === 'boolean'
        ? spending.onDemandEnabled
        : limit != null && limit > 0
          ? true
          : null;
  return {
    onDemandUsedUsd: used,
    onDemandLimitUsd: limit,
    onDemandRemainingUsd: remaining,
    onDemandPercentUsed: percent,
    onDemandLimitType: limitType,
    onDemandEnabled: enabled,
  };
}
