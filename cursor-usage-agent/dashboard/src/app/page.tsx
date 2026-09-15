'use client';

import { useCallback, useEffect, useState } from 'react';

type DeveloperRow = {
  id: string;
  email: string;
  name: string;
  plan: string | null;
  usedUsd: number | null;
  remainingUsd: number | null;
  limitUsd: number | null;
  percent: number | null;
  lastSeenAt: string | null;
  deviceCount: number;
};

type Overview = {
  totals: {
    developers: number;
    activeDevelopers: number;
    devices: number;
    averageUsagePercent: number | null;
    highestUsagePercent: number | null;
    lowestUsagePercent: number | null;
    totalUsedUsd: number | null;
  };
  developers: DeveloperRow[];
};

function money(v: number | null) {
  if (v == null) return '—';
  return `$${v.toFixed(2)}`;
}

function pct(v: number | null) {
  if (v == null) return '—';
  return `${v.toFixed(1)}%`;
}

export default function AdminDashboard() {
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/analytics/overview', { cache: 'no-store' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
      setData(json as Overview);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, []);

  const syncThisPc = useCallback(async () => {
    setSyncing(true);
    setError(null);
    try {
      const res = await fetch('/api/hub/sync-local', { method: 'POST' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Sync failed');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Sync failed');
    } finally {
      setSyncing(false);
    }
  }, [load]);

  useEffect(() => {
    void load();
  }, [load]);

  const t = data?.totals;

  return (
    <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-800">
            Company hub
          </p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-zinc-900">
            Cursor Usage
          </h1>
          <p className="mt-2 max-w-xl text-sm text-zinc-600">
            Usage from every enrolled developer PC.{' '}
            <a href="/install" className="text-teal-800 underline">
              Employee install page
            </a>{' '}
            (no zip — they download from this dashboard).
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => void syncThisPc()}
            disabled={syncing}
            className="rounded-md bg-teal-800 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50"
          >
            {syncing ? 'Syncing this PC…' : 'Sync this PC'}
          </button>
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className="rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50 disabled:opacity-50"
          >
            {loading ? 'Loading…' : 'Refresh'}
          </button>
        </div>
      </header>

      {error ? (
        <div className="mb-6 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {error}
        </div>
      ) : null}

      <section className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Stat label="Total developers" value={t?.developers ?? 0} />
        <Stat label="Active developers" value={t?.activeDevelopers ?? 0} />
        <Stat
          label="Average usage"
          value={pct(t?.averageUsagePercent ?? null)}
        />
        <Stat
          label="Highest usage"
          value={pct(t?.highestUsagePercent ?? null)}
        />
        <Stat
          label="Lowest usage"
          value={pct(t?.lowestUsagePercent ?? null)}
        />
      </section>

      <section className="overflow-hidden rounded-xl border border-zinc-200 bg-white/90 shadow-sm">
        <div className="border-b border-zinc-100 px-5 py-3">
          <h2 className="text-sm font-semibold text-zinc-900">Developers</h2>
        </div>
        {!data?.developers.length ? (
          <p className="px-5 py-8 text-sm text-zinc-500">
            Waiting for agent data. Click <strong>Sync this PC</strong>, or
            enroll another developer machine with{' '}
            <code>npm run enroll -- --server http://THIS_PC:3000 --secret …</code>
          </p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-100 text-xs uppercase tracking-wide text-zinc-500">
                <th className="px-5 py-2">Developer</th>
                <th className="px-3 py-2">Plan</th>
                <th className="px-3 py-2">Usage</th>
                <th className="px-3 py-2">Remaining</th>
                <th className="px-5 py-2">Last sync</th>
              </tr>
            </thead>
            <tbody>
              {data.developers.map((d) => (
                <tr key={d.id} className="border-b border-zinc-50">
                  <td className="px-5 py-3">
                    <a
                      className="font-medium text-teal-800 hover:underline"
                      href={`/developers/${d.id}`}
                    >
                      {d.name}
                    </a>
                    <div className="text-xs text-zinc-500">{d.email}</div>
                  </td>
                  <td className="px-3 py-3">{d.plan ?? '—'}</td>
                  <td className="px-3 py-3">
                    {money(d.usedUsd)}
                    <span className="ml-2 text-xs text-zinc-500">
                      {pct(d.percent)}
                    </span>
                  </td>
                  <td className="px-3 py-3">{money(d.remainingUsd)}</td>
                  <td className="px-5 py-3 text-xs text-zinc-500">
                    {d.lastSeenAt
                      ? new Date(d.lastSeenAt).toLocaleString()
                      : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white/90 px-4 py-3 shadow-sm">
      <p className="text-xs text-zinc-500">{label}</p>
      <p className="mt-1 text-xl font-semibold text-zinc-900">{value}</p>
    </div>
  );
}
