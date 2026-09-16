'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Sparkline, UsageBar } from '@/components/UsageMeter';
import { cursorUsagePercent } from '@/lib/percent';
import {
  asNumber,
  asRecord,
  asString,
  formatPct,
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
  usage: Record<string, unknown> | null;
};

export default function AdminDeveloperTrendPage() {
  const params = useParams<{ secret: string; id: string }>();
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!params.id) return;
    setLoading(true);
    fetch(`/api/admin/developers/${params.id}`, {
      cache: 'no-store',
      headers: { 'x-admin-route-secret': params.secret || '' },
    })
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
  const autoPercent = asNumber(usage.autoPercentUsed);
  const apiPercent = asNumber(usage.apiPercentUsed);
  const history = useMemo(
    () =>
      [...snapshots]
        .reverse()
        .map((s) => cursorUsagePercent(asRecord(s.usage)))
        .filter((n): n is number => n != null),
    [snapshots],
  );

  return (
    <main className="mx-auto w-full max-w-4xl px-3 py-6 sm:px-6 sm:py-8">
      <Link
        href={`/ops/${params.secret}`}
        className="text-sm font-medium text-teal-800 hover:underline"
      >
        ← Trends
      </Link>

      {error ? (
        <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {error}
        </p>
      ) : null}

      {loading && !data ? (
        <p className="mt-8 text-sm text-zinc-500">Loading trends…</p>
      ) : (
        <>
          <header className="mt-5 flex min-w-0 items-start gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-teal-800 text-sm font-semibold text-white">
              {initials(employee?.name || '?')}
            </span>
            <div className="min-w-0">
              <h1 className="break-words text-xl font-semibold text-zinc-900">
                {employee?.name ?? 'Developer'}
              </h1>
              <p className="break-all text-sm text-zinc-500">{employee?.email}</p>
              <p className="mt-1 text-xs text-zinc-400">
                {asString(latest?.plan) || '—'} · {formatPct(cursorUsagePercent(usage))}
              </p>
            </div>
          </header>

          <div className="mt-8 grid gap-4">
            {(autoPercent != null || apiPercent != null) && (
              <section className="grid gap-3 sm:grid-cols-2">
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

            <section className="rounded-2xl border border-zinc-200/80 bg-white/90 p-5 shadow-sm">
              <h2 className="text-sm font-semibold text-zinc-900">Recent trend</h2>
              <p className="mt-1 text-xs text-zinc-500">
                Included usage from the last {snapshots.length} sync
                {snapshots.length === 1 ? '' : 's'}
              </p>
              <div className="mt-3">
                <Sparkline points={history} />
              </div>
              {snapshots.length ? (
                <ol className="mt-4 max-h-64 space-y-2 overflow-auto text-sm">
                  {snapshots.map((s) => (
                    <li
                      key={s.id}
                      className="flex flex-col gap-1 rounded-lg bg-zinc-50 px-3 py-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3"
                    >
                      <span className="break-words text-zinc-500">
                        {new Date(s.timestamp).toLocaleString()}
                      </span>
                      <span className="font-mono text-xs font-semibold tabular-nums text-zinc-800">
                        {formatPct(cursorUsagePercent(asRecord(s.usage)))}
                      </span>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="mt-4 text-sm text-zinc-500">No sync history yet.</p>
              )}
            </section>

            <section className="rounded-2xl border border-zinc-200/80 bg-white/90 p-5 shadow-sm">
              <h2 className="text-sm font-semibold text-zinc-900">Devices</h2>
              <ul className="mt-3 space-y-2">
                {devices.map((d) => (
                  <li
                    key={d.id}
                    className="flex min-w-0 flex-col gap-1 rounded-xl border border-zinc-100 px-3 py-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <p className="break-words font-medium text-zinc-900">
                        {d.deviceName}
                      </p>
                      <p className="break-words text-xs text-zinc-500">
                        {d.operatingSystem} · {d.architecture}
                        {d.cursorVersion ? ` · Cursor ${d.cursorVersion}` : ''}
                        {` · agent ${d.agentVersion}`}
                      </p>
                    </div>
                    <p className="text-xs text-zinc-500">
                      {relativeTime(d.lastSeenAt)}
                    </p>
                  </li>
                ))}
                {!devices.length ? (
                  <li className="text-sm text-zinc-500">No devices enrolled.</li>
                ) : null}
              </ul>
            </section>
          </div>
        </>
      )}
    </main>
  );
}
