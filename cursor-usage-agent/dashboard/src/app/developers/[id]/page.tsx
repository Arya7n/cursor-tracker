'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { UsageBar, UsageRing } from '@/components/UsageMeter';
import { cursorUsagePercent, pickOnDemand } from '@/lib/percent';
import {
  asNumber,
  asRecord,
  asString,
  cycleLabel,
  daysLeft,
  formatUsd,
  initials,
  relativeTime,
} from '@/lib/format';

type Device = {
  id: string;
  deviceName: string;
  operatingSystem: string;
  architecture: string;
  agentVersion: string;
  cursorVersion: string | null;
  lastSeenAt: string;
};

type Snapshot = {
  id: string;
  timestamp: string;
  plan: string | null;
  billingCycle: { start?: string; end?: string } | null;
  usage: Record<string, unknown> | null;
};

export default function DeveloperDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [removing, setRemoving] = useState(false);

  useEffect(() => {
    if (!params.id) return;
    setLoading(true);
    fetch(`/api/developers/${params.id}`, { cache: 'no-store' })
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Not found');
        setData(json);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed'))
      .finally(() => setLoading(false));
  }, [params.id]);

  const employee = data?.employee as { name?: string; email?: string } | undefined;
  const snapshots = ((data?.snapshots as Snapshot[]) || []).slice();
  const devices = (data?.devices as Device[]) || [];
  const latest = snapshots[0];
  const usage = asRecord(latest?.usage);
  const cycle = latest?.billingCycle;
  const plan = asString(latest?.plan) || asString(usage.planName) || null;
  const lastSeen = devices
    .map((d) => d.lastSeenAt)
    .filter(Boolean)
    .sort()
    .at(-1);
  const percent = cursorUsagePercent(usage);
  const left = daysLeft(cycle?.end);
  const autoPercent = asNumber(usage.autoPercentUsed);
  const apiPercent = asNumber(usage.apiPercentUsed);
  const onDemand = pickOnDemand(usage, cycle);

  async function removeFromHub() {
    if (!params.id) return;
    const label = employee?.name || employee?.email || 'this developer';
    const ok = window.confirm(
      `Remove ${label} from the hub?\n\nThis clears their dashboard data. If their PC agent is still installed, they will show up again on the next sync.`,
    );
    if (!ok) return;
    setRemoving(true);
    setError(null);
    try {
      const res = await fetch(`/api/developers/${params.id}`, { method: 'DELETE' });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Remove failed');
      router.push('/');
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Remove failed');
      setRemoving(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-4xl px-3 py-6 sm:px-6 sm:py-8">
      <div className="flex items-center justify-between gap-3">
        <Link href="/" className="text-sm font-medium text-teal-800 hover:underline">
          ← Team
        </Link>
        {data ? (
          <button
            type="button"
            onClick={() => void removeFromHub()}
            disabled={removing}
            className="text-sm font-medium text-zinc-500 hover:text-rose-700 disabled:opacity-50"
          >
            {removing ? 'Removing…' : 'Remove from hub'}
          </button>
        ) : null}
      </div>

      {error ? (
        <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {error}
        </p>
      ) : null}

      {loading && !data ? (
        <p className="mt-8 text-sm text-zinc-500">Loading developer…</p>
      ) : (
        <>
          <header className="mt-5 flex min-w-0 items-start gap-3 sm:gap-4">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-teal-800 text-sm font-semibold text-white sm:h-12 sm:w-12">
              {initials(employee?.name || '?')}
            </span>
            <div className="min-w-0">
              <h1 className="break-words text-xl font-semibold tracking-tight text-zinc-900 sm:text-2xl">
                {employee?.name ?? 'Developer'}
              </h1>
              <p className="break-all text-sm text-zinc-500">{employee?.email}</p>
            </div>
          </header>

          {!latest?.usage ? (
            <p className="mt-8 rounded-2xl border border-dashed border-zinc-300 bg-white/70 px-5 py-10 text-center text-sm text-zinc-500">
              Waiting for this machine to sync.
            </p>
          ) : (
            <section className="mt-8 rounded-2xl border border-zinc-200/80 bg-white/90 p-4 shadow-sm sm:p-6">
              <UsageRing
                percent={percent}
                caption="Matches the included usage % in Cursor"
              />
              <dl className="mt-5 grid gap-3 sm:grid-cols-3">
                <Fact label="Plan" value={plan ?? '—'} />
                <Fact
                  label="Cycle"
                  value={cycleLabel(cycle?.start, cycle?.end)}
                  hint={
                    left == null
                      ? undefined
                      : left === 0
                        ? 'Resets today'
                        : `${left} days left`
                  }
                />
                <Fact label="Last sync" value={relativeTime(lastSeen)} />
              </dl>
            </section>
          )}

          {(autoPercent != null || apiPercent != null) && (
            <section className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-zinc-200/80 bg-white/90 p-4 shadow-sm">
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-500">
                  Auto / included
                </p>
                <UsageBar percent={autoPercent} />
              </div>
              <div className="rounded-2xl border border-zinc-200/80 bg-white/90 p-4 shadow-sm">
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-500">
                  API usage
                </p>
                <UsageBar percent={apiPercent} />
              </div>
            </section>
          )}

          {latest?.usage ? (
            <section className="mt-4 rounded-2xl border border-zinc-200/80 bg-white/90 p-4 shadow-sm sm:p-5">
              <h2 className="text-sm font-semibold text-zinc-900">On-demand</h2>
              <dl className="mt-4 grid gap-3 sm:grid-cols-2">
                <Fact
                  label="Status"
                  value={onDemand.on ? 'On' : 'Off'}
                  hint={
                    onDemand.inCurrentCycle
                      ? 'This billing cycle only'
                      : 'No report for the current billing cycle'
                  }
                />
                {onDemand.on && onDemand.percent != null ? (
                  <Fact
                    label="Of on-demand cap"
                    value={formatUsd(onDemand.usedUsd)}
                    hint={`${onDemand.percent.toFixed(1)}% of ${formatUsd(onDemand.limitUsd)} this cycle`}
                  />
                ) : onDemand.on && onDemand.afterIncludedUsd != null ? (
                  <Fact
                    label="On-demand used"
                    value={formatUsd(onDemand.afterIncludedUsd)}
                    hint="This billing cycle"
                  />
                ) : (
                  <Fact
                    label="On-demand used"
                    value="—"
                    hint={
                      onDemand.on
                        ? 'Enabled this cycle, no on-demand spend reported'
                        : 'On-demand spending is disabled in Cursor'
                    }
                  />
                )}
              </dl>
            </section>
          ) : null}

          <section className="mt-4 rounded-2xl border border-zinc-200/80 bg-white/90 p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-zinc-900">Devices</h2>
            <ul className="mt-3 space-y-2">
              {devices.map((d) => (
                <li
                  key={d.id}
                  className="flex min-w-0 flex-col gap-1 rounded-xl border border-zinc-100 px-3 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="break-words font-medium text-zinc-900">{d.deviceName}</p>
                    <p className="break-words text-xs text-zinc-500">
                      {d.operatingSystem} · {d.architecture}
                      {d.cursorVersion ? ` · Cursor ${d.cursorVersion}` : ''}
                      {` · agent ${d.agentVersion}`}
                    </p>
                  </div>
                  <p className="text-xs text-zinc-500">{relativeTime(d.lastSeenAt)}</p>
                </li>
              ))}
              {!devices.length ? (
                <li className="text-sm text-zinc-500">No devices enrolled.</li>
              ) : null}
            </ul>
          </section>
        </>
      )}
    </main>
  );
}

function Fact({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-xl bg-zinc-50 px-3 py-3">
      <dt className="text-[11px] uppercase tracking-wide text-zinc-400">{label}</dt>
      <dd className="mt-1 break-words text-sm font-medium text-zinc-900">{value}</dd>
      {hint ? <p className="mt-0.5 text-xs text-zinc-500">{hint}</p> : null}
    </div>
  );
}
