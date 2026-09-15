'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import {
  apiGet,
  type DashboardPayload,
  type DiscoveryPayload,
  type UsageMetric,
} from '@/lib/api';
import { metricLabel } from '@/lib/utils';
import { Badge, Button, Card, CardContent, CardHeader, CardTitle } from '@/components/ui/primitives';

function MetricLine({ label, metric }: { label: string; metric: UsageMetric }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-zinc-100 py-2 text-sm last:border-0">
      <span className="text-zinc-500">{label}</span>
      <span className="max-w-[60%] text-right text-zinc-900">
        {metricLabel(metric)}
        {!metric.available && metric.reason ? (
          <span className="mt-0.5 block text-xs text-zinc-400">{metric.reason}</span>
        ) : null}
      </span>
    </div>
  );
}

function CapRow({ label, ok }: { label: string; ok: boolean }) {
  return (
    <div className="flex items-center justify-between border-b border-zinc-100 py-2 text-sm last:border-0">
      <span>{label}</span>
      <span aria-label={ok ? 'available' : 'unavailable'}>{ok ? '✅' : '❌'}</span>
    </div>
  );
}

export default function HomePage() {
  const [data, setData] = useState<DashboardPayload | null>(null);
  const [discovery, setDiscovery] = useState<DiscoveryPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [dash, disc] = await Promise.all([
        apiGet<DashboardPayload>('/cursor/dashboard'),
        apiGet<DiscoveryPayload>('/cursor/discovery'),
      ]);
      setData(dash);
      setDiscovery(disc);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const planText =
    data?.account.plan && typeof data.account.plan === 'object'
      ? metricLabel(data.account.plan)
      : data?.account.plan
        ? String(data.account.plan)
        : 'Not available through this API';

  return (
    <main className="mx-auto min-h-screen max-w-5xl px-4 py-10 sm:px-6">
      <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-teal-800">
            Research POC
          </p>
          <h1 className="mt-1 font-[family-name:var(--font-display)] text-3xl tracking-tight text-zinc-900 sm:text-4xl">
            Cursor Personal Account
          </h1>
          <p className="mt-2 max-w-xl text-sm text-zinc-600">
            Discover what a single personal Cursor API key can actually retrieve — no scraping,
            no passwords, server-side key only.
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => void load()} disabled={loading}>
            {loading ? 'Probing…' : 'Re-run discovery'}
          </Button>
          <Link
            href="/debug"
            className="inline-flex items-center rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50"
          >
            Debug inspector
          </Link>
        </div>
      </header>

      {error ? (
        <Card className="mb-6 border-rose-200 bg-rose-50">
          <CardContent className="text-sm text-rose-800">
            {error}
            <p className="mt-2 text-xs">
              Ensure the NestJS backend is running on port 3001 and{' '}
              <code className="rounded bg-white/70 px-1">CURSOR_API_KEY</code> is set in{' '}
              <code className="rounded bg-white/70 px-1">.env</code>.
            </p>
          </CardContent>
        </Card>
      ) : null}

      {discovery && !discovery.configured ? (
        <Card className="mb-6 border-amber-200 bg-amber-50">
          <CardContent className="text-sm text-amber-900">
            Backend is running but <strong>CURSOR_API_KEY</strong> is empty. Copy{' '}
            <code>.env.example</code> → <code>.env</code> and add your key from Cursor Dashboard →
            API Keys.
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-5 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Account</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Row label="Email" value={data?.account.email ?? '—'} />
            <Row label="User ID" value={data?.account.userId ?? '—'} />
            <Row label="Plan" value={planText} />
            <Row label="Account Type" value={data?.account.accountType ?? '—'} />
            <Row label="API key name" value={data?.account.apiKeyName ?? '—'} />
            {data?.account.note ? (
              <p className="pt-2 text-xs text-zinc-500">{data.account.note}</p>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Usage</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-3">
              <p className="mb-1 text-xs text-zinc-500">Current Usage</p>
              <div className="h-3 overflow-hidden rounded bg-zinc-100">
                <div className="h-full w-0 bg-teal-700/40" title="No percentage available" />
              </div>
              <p className="mt-1 text-xs text-zinc-400">
                Progress bar omitted — percentage not exposed by personal API
              </p>
            </div>
            {data ? (
              <>
                <MetricLine label="Used" metric={data.usage.currentUsage} />
                <MetricLine label="Remaining" metric={data.usage.remainingUsage} />
                <MetricLine label="Limit" metric={data.usage.usageLimits} />
                <MetricLine label="Tokens" metric={data.usage.tokenCounts} />
              </>
            ) : (
              <p className="text-sm text-zinc-500">Loading…</p>
            )}
            {data?.usage.note ? (
              <p className="mt-3 text-xs text-zinc-500">{data.usage.note}</p>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Spending</CardTitle>
          </CardHeader>
          <CardContent>
            {data ? (
              <>
                <MetricLine label="Current" metric={data.spending.currentSpending} />
                <MetricLine label="Monthly" metric={data.spending.monthlySpending} />
                <MetricLine label="Limit" metric={data.spending.remainingBudget} />
              </>
            ) : (
              <p className="text-sm text-zinc-500">Loading…</p>
            )}
            {data?.spending.reason ? (
              <p className="mt-3 text-xs text-zinc-500">{data.spending.reason}</p>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Models</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-zinc-600">
              {data?.usage.modelUsage.available
                ? metricLabel(data.usage.modelUsage)
                : 'Not available through this API'}
            </p>
            <p className="mt-2 text-xs text-zinc-400">
              Model request/token/cost tables require Enterprise Analytics (
              <code>/analytics/by-user/models</code>). Cloud Agents{' '}
              <code>GET /v1/models</code> only lists model IDs for launching agents — not usage.
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-5">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>API Capabilities</CardTitle>
          {data?.discoverySummary ? (
            <span className="text-xs text-zinc-500">
              Probed {data.discoverySummary.tested} · accessible{' '}
              {data.discoverySummary.accessible} · failed {data.discoverySummary.inaccessible}
            </span>
          ) : null}
        </CardHeader>
        <CardContent>
          {data ? (
            <>
              <CapRow label="Account information" ok={data.capabilities.accountInformation} />
              <CapRow label="Usage" ok={data.capabilities.usage} />
              <CapRow label="Usage history" ok={data.capabilities.usageHistory} />
              <CapRow label="Spending" ok={data.capabilities.spending} />
              <CapRow label="Limits" ok={data.capabilities.limits} />
              <CapRow label="Model usage" ok={data.capabilities.modelUsage} />
              <CapRow label="Token usage" ok={data.capabilities.tokenUsage} />
              <CapRow label="Billing data" ok={data.capabilities.billingData} />
            </>
          ) : null}
        </CardContent>
      </Card>

      <Card className="mt-5">
        <CardHeader>
          <CardTitle>Discovery results (documented endpoints only)</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-200 text-xs uppercase tracking-wide text-zinc-500">
                <th className="py-2 pr-3">Endpoint</th>
                <th className="py-2 pr-3">Status</th>
                <th className="py-2 pr-3">Result</th>
                <th className="py-2">Availability</th>
              </tr>
            </thead>
            <tbody>
              {discovery?.results.map((r) => (
                <tr key={`${r.method}-${r.endpoint}`} className="border-b border-zinc-100">
                  <td className="py-2 pr-3 font-mono text-xs">
                    {r.method} {r.endpoint}
                  </td>
                  <td className="py-2 pr-3">
                    {r.skipped ? (
                      <Badge variant="muted">skipped</Badge>
                    ) : (
                      <Badge variant={r.accessible ? 'success' : 'danger'}>
                        {r.status ?? '—'}
                      </Badge>
                    )}
                  </td>
                  <td className="py-2 pr-3 text-xs text-zinc-600">{r.message}</td>
                  <td className="py-2 text-xs text-zinc-500">{r.availability}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {data?.conclusion ? (
        <Card className="mt-5 border-teal-900/20 bg-gradient-to-br from-teal-950 to-zinc-900 text-teal-50">
          <CardHeader className="border-teal-800/40">
            <CardTitle className="text-teal-50">PERSONAL API KEY CAPABILITIES</CardTitle>
          </CardHeader>
          <CardContent className="font-mono text-sm leading-7">
            <pre className="whitespace-pre-wrap">{`Account data:       ${data.conclusion.accountData}
Usage data:         ${data.conclusion.usageData}
Usage limits:       ${data.conclusion.usageLimits}
Remaining usage:    ${data.conclusion.remainingUsage}
Usage history:      ${data.conclusion.usageHistory}
Model usage:        ${data.conclusion.modelUsage}
Token usage:        ${data.conclusion.tokenUsage}
Spending:           ${data.conclusion.spending}
Billing data:       ${data.conclusion.billingData}`}</pre>
            <p className="mt-4 font-sans text-sm text-teal-100/90">
              CAN THIS BE USED TO BUILD A MULTI-EMPLOYEE COMPANY CURSOR USAGE DASHBOARD?
            </p>
            <p className="mt-1 font-sans text-lg font-semibold text-white">
              {data.conclusion.multiEmployeeDashboard}
            </p>
            <p className="mt-2 font-sans text-sm text-teal-100/80">
              {data.conclusion.multiEmployeeExplanation}
            </p>
          </CardContent>
        </Card>
      ) : null}
    </main>
  );
}

function Row({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex justify-between gap-4 border-b border-zinc-100 py-2 last:border-0">
      <span className="text-zinc-500">{label}</span>
      <span className="text-right text-zinc-900">{value}</span>
    </div>
  );
}
