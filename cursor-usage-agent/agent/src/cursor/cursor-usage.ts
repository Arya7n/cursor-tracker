import { fetchPlanUsageSnapshot } from './dashboard-usage.js';
import { detectAgentCli, runAgentCli } from './cursor-detector.js';
import type {
  DiscoverySourceResult,
  UsageInfo,
  UsageMetric,
} from './types.js';

const unavailable = (reason: string): UsageMetric => ({
  status: 'NOT AVAILABLE',
  value: null,
  source: null,
  reason,
});

const available = (
  value: unknown,
  source: string,
  reason = 'OK',
): UsageMetric => ({
  status: 'AVAILABLE',
  value,
  source,
  reason,
});

const unknown = (reason: string, source: string | null = null): UsageMetric => ({
  status: 'UNKNOWN',
  value: null,
  source,
  reason,
});

/**
 * Usage discovery — prefers live DashboardService meters for the signed-in IDE user.
 */
export async function discoverUsage(): Promise<{
  usage: UsageInfo;
  discoveries: DiscoverySourceResult[];
}> {
  const discoveries: DiscoverySourceResult[] = [];
  const live = await fetchPlanUsageSnapshot();

  const usageDiscovery: DiscoverySourceResult = {
    source: 'DashboardService/GetCurrentPeriodUsage + GetPlanInfo + GetHardLimit',
    available: live.available,
    fields: live.available
      ? [
          'usedUsd',
          'remainingUsd',
          'limitUsd',
          'totalPercentUsed',
          'billingCycleStart',
          'billingCycleEnd',
          'planName',
          'onDemand',
        ]
      : [],
    reason: live.reason,
  };
  if (live.snapshot?.rawSafe) {
    usageDiscovery.rawSafeSummary = live.snapshot.rawSafe;
  }
  discoveries.push(usageDiscovery);

  discoveries.push({
    source: 'agent usage (CLI subcommand)',
    available: false,
    fields: [],
    reason: 'No top-level `agent usage` command; interactive `/usage` uses the same dashboard meters we call directly.',
  });

  const cli = await detectAgentCli();
  if (cli.available && cli.path) {
    try {
      await runAgentCli(cli.path, ['about', '--format', 'json']);
      discoveries.push({
        source: 'agent about --format json',
        available: true,
        fields: ['cliVersion'],
        reason: 'CLI reachable (account/plan preferred from IDE session + GetPlanInfo)',
      });
    } catch (e) {
      discoveries.push({
        source: 'agent about --format json',
        available: false,
        fields: [],
        reason: e instanceof Error ? e.message : 'about failed',
      });
    }
  }

  if (!live.available || !live.snapshot) {
    const usage: UsageInfo = {
      currentUsage: unavailable(live.reason),
      monthlyUsage: unavailable(live.reason),
      remainingUsage: unavailable(live.reason),
      usagePercentage: unavailable(live.reason),
      modelUsage: unavailable('Per-model usage breakdown not returned by GetCurrentPeriodUsage'),
      requestCounts: unavailable('Request-count buckets not returned for this plan type'),
      tokenCounts: unavailable('Account token totals not returned by this endpoint'),
      spending: unavailable(live.reason),
      billingCycle: unknown(live.reason),
      historicalUsage: unavailable('Historical events not collected in this version'),
      resetDate: unknown(live.reason),
      sources: discoveries,
    };
    return { usage, discoveries };
  }

  const s = live.snapshot;
  const source = 'DashboardService/GetCurrentPeriodUsage';

  const usage: UsageInfo = {
    currentUsage: available(
      {
        usedUsd: s.usedUsd,
        includedUsedUsd: s.includedUsedUsd,
        bonusUsedUsd: s.bonusUsedUsd,
        displayMessage: s.displayMessage,
        autoDisplayMessage: s.autoDisplayMessage,
        apiDisplayMessage: s.apiDisplayMessage,
      },
      source,
    ),
    monthlyUsage: available(
      {
        includedUsedUsd: s.includedUsedUsd,
        limitUsd: s.limitUsd,
        billingCycleStart: s.billingCycleStart,
        billingCycleEnd: s.billingCycleEnd,
      },
      source,
      'Current billing-period included usage',
    ),
    remainingUsage: available(
      {
        remainingUsd: s.remainingUsd,
        limitUsd: s.limitUsd,
      },
      source,
    ),
    usagePercentage: available(
      {
        totalPercentUsed: s.totalPercentUsed,
        autoPercentUsed: s.autoPercentUsed,
        apiPercentUsed: s.apiPercentUsed,
      },
      source,
    ),
    modelUsage: unavailable(
      'GetCurrentPeriodUsage does not include per-model request/token tables',
    ),
    requestCounts: unavailable(
      'Not provided for dollar-based Pro plans via this endpoint',
    ),
    tokenCounts: unavailable('Not provided by GetCurrentPeriodUsage'),
    spending: available(
      {
        planUsedUsd: s.usedUsd,
        includedUsedUsd: s.includedUsedUsd,
        bonusUsedUsd: s.bonusUsedUsd,
        onDemand: s.onDemand,
        planPrice: s.planPrice,
      },
      source,
    ),
    billingCycle: available(
      {
        start: s.billingCycleStart,
        end: s.billingCycleEnd,
        planName: s.planName,
      },
      source,
    ),
    historicalUsage: unavailable(
      'Not collected yet (optional GetAggregatedUsageEvents can be added later)',
    ),
    resetDate: available(
      { resetsAt: s.billingCycleEnd },
      source,
      'Billing cycle end / usage reset',
    ),
    sources: discoveries,
  };

  return { usage, discoveries };
}
