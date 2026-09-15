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
    },
    billingCycle: {
      start: billing.start ?? null,
      end: billing.end ?? null,
    },
    spending: {
      planPrice: spending.planPrice ?? null,
      planUsedUsd: spending.planUsedUsd ?? null,
    },
  };
}
