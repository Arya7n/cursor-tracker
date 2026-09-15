'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { UsageBar } from '@/components/UsageMeter';
import {
  cycleLabel,
  daysLeft,
  formatPct,
  initials,
  relativeTime,
} from '@/lib/format';

type DeveloperRow = {
  id: string;
  email: string;
  name: string;
  plan: string | null;
  percent: number | null;
  autoPercent: number | null;
  apiPercent: number | null;
  displayMessage: string | null;
  billingCycleStart: string | null;
  billingCycleEnd: string | null;
  lastSeenAt: string | null;
  deviceCount: number;
  cursorVersion: string | null;
};

type Overview = {
  totals: {
    developers: number;
    activeDevelopers: number;
    devices?: number;
    averageUsagePercent: number | null;
  };
  developers: DeveloperRow[];
};

type SortId = 'name' | 'usage' | 'sync';
type PageSize = 5 | 10 | 25 | 50 | 'all';
const PAGE_SIZES: PageSize[] = [5, 10, 25, 50, 'all'];

export default function AdminDashboard() {
  const router = useRouter();
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncNote, setSyncNote] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<SortId>('name');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<PageSize>(10);
  const [updatedAt, setUpdatedAt] = useState<number | null>(null);
  const [, setTick] = useState(0);

  const load = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/analytics/overview', { cache: 'no-store' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
      setData(json as Overview);
      setUpdatedAt(Date.now());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, []);

  const syncNow = useCallback(async () => {
    setSyncing(true);
    setError(null);
    setSyncNote(null);
    try {
      const res = await fetch('/api/hub/sync-now', { method: 'POST' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Sync failed');
      const devices = Number(json.deviceCount) || 0;
      setSyncNote(
        devices > 1
          ? `Asked ${devices} devices to report. This PC updates now; others check in within a minute.`
          : 'This PC synced. Other enrolled PCs report when their agent checks in.',
      );
      await load(true);
      setSyncing(false);
      for (let i = 0; i < 6; i += 1) {
        await new Promise((r) => window.setTimeout(r, 4000));
        await load(true);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Sync failed');
    } finally {
      setSyncing(false);
    }
  }, [load]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const refresh = window.setInterval(() => void load(true), 60_000);
    const tick = window.setInterval(() => setTick((n) => n + 1), 30_000);
    return () => {
      window.clearInterval(refresh);
      window.clearInterval(tick);
    };
  }, [load]);

  const rows = data?.developers ?? [];

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const next = rows.filter((d) => {
      if (!q) return true;
      return `${d.name} ${d.email} ${d.plan ?? ''}`.toLowerCase().includes(q);
    });
    next.sort((a, b) => {
      if (sort === 'usage') return (b.percent ?? -1) - (a.percent ?? -1);
      if (sort === 'sync') {
        return (
          new Date(b.lastSeenAt ?? 0).getTime() -
          new Date(a.lastSeenAt ?? 0).getTime()
        );
      }
      return a.name.localeCompare(b.name);
    });
    return next;
  }, [rows, query, sort]);

  const total = filtered.length;
  const size = pageSize === 'all' ? Math.max(total, 1) : pageSize;
  const pageCount = Math.max(1, Math.ceil(total / size));
  const currentPage = Math.min(page, pageCount);
  const from = total === 0 ? 0 : (currentPage - 1) * size + 1;
  const to = Math.min(currentPage * size, total);
  const paged = pageSize === 'all' ? filtered : filtered.slice((currentPage - 1) * size, currentPage * size);

  useEffect(() => {
    setPage(1);
  }, [query, sort, pageSize]);

  useEffect(() => {
    if (page > pageCount) setPage(pageCount);
  }, [page, pageCount]);

  const t = data?.totals;

  return (
    <main className="mx-auto w-full max-w-6xl px-3 py-6 sm:px-6 sm:py-8">
      <div className="mb-6 flex flex-col gap-4 sm:mb-8 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 sm:text-3xl">
            Team usage
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-zinc-600">
            Included Cursor usage for the current billing cycle. Same % the IDE
            shows. Agents report about every 20 minutes.
          </p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center">
          <p className="text-xs text-zinc-500 sm:mr-1">
            {updatedAt
              ? `Updated ${relativeTime(new Date(updatedAt).toISOString())}`
              : '—'}
          </p>
          <div className="grid grid-cols-2 gap-2 sm:flex">
            <button
              type="button"
              onClick={() => void syncNow()}
              disabled={syncing}
              className="rounded-lg bg-teal-800 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-teal-700 disabled:opacity-50 sm:px-4"
            >
              {syncing ? 'Syncing…' : 'Sync now'}
            </button>
            <button
              type="button"
              onClick={() => void load()}
              disabled={loading}
              className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50 disabled:opacity-50 sm:px-4"
            >
              {loading ? 'Loading…' : 'Refresh'}
            </button>
          </div>
        </div>
      </div>

      {syncNote ? (
        <div className="mb-6 rounded-xl border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-900">
          {syncNote}
        </div>
      ) : null}

      {error ? (
        <div className="mb-6 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {error}
        </div>
      ) : null}

      <section className="mb-6 grid gap-3 sm:grid-cols-3">
        <StatCard
          label="Developers"
          value={String(t?.developers ?? 0)}
          hint={`${t?.activeDevelopers ?? 0} reported in the last 24h`}
        />
        <StatCard
          label="Average usage"
          value={formatPct(t?.averageUsagePercent ?? null)}
          hint="Team average for this cycle"
        />
        <StatCard
          label="Devices"
          value={String(t?.devices ?? rows.reduce((n, d) => n + d.deviceCount, 0))}
          hint="Enrolled machines"
        />
      </section>

      <section className="overflow-hidden rounded-2xl border border-zinc-200/80 bg-white/90 shadow-sm">
        <div className="flex flex-col gap-3 border-b border-zinc-100 px-3 py-3 sm:px-5 md:flex-row md:items-center md:justify-between">
          <h2 className="text-sm font-semibold text-zinc-900">Developers</h2>
          <div className="grid w-full grid-cols-2 gap-2 md:flex md:w-auto md:flex-wrap md:items-center">
            <label className="sr-only" htmlFor="team-search">
              Search developers
            </label>
            <input
              id="team-search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search name, email, plan"
              className="col-span-2 w-full min-w-0 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm outline-none ring-teal-700/30 placeholder:text-zinc-400 focus:ring-2 md:w-56"
            />
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortId)}
              className="min-w-0 rounded-lg border border-zinc-200 bg-white px-2.5 py-2 text-sm text-zinc-700"
            >
              <option value="name">Sort: name</option>
              <option value="usage">Sort: usage</option>
              <option value="sync">Sort: last sync</option>
            </select>
            <label className="flex min-w-0 items-center gap-1.5 text-sm text-zinc-600">
              <span className="shrink-0">Rows</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  const v = e.target.value;
                  setPageSize(v === 'all' ? 'all' : (Number(v) as PageSize));
                }}
                className="min-w-0 flex-1 rounded-lg border border-zinc-200 bg-white px-2.5 py-2 text-sm text-zinc-700"
              >
                {PAGE_SIZES.map((n) => (
                  <option key={String(n)} value={n}>
                    {n === 'all' ? 'All' : n}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        {loading && !data ? (
          <p className="px-4 py-10 text-sm text-zinc-500 sm:px-5">Loading team…</p>
        ) : !rows.length ? (
          <EmptyState />
        ) : !filtered.length ? (
          <p className="px-4 py-10 text-sm text-zinc-500 sm:px-5">
            No developers match this search.
          </p>
        ) : (
          <>
            <ul className="divide-y divide-zinc-100 md:hidden">
              {paged.map((d) => (
                <li key={d.id}>
                  <DeveloperCard
                    developer={d}
                    onOpen={() => router.push(`/developers/${d.id}`)}
                  />
                </li>
              ))}
            </ul>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[44rem] text-left text-sm">
                <thead>
                  <tr className="border-b border-zinc-100 text-[11px] uppercase tracking-wide text-zinc-400">
                    <th className="px-5 py-2.5 font-medium">Developer</th>
                    <th className="px-3 py-2.5 font-medium">Plan</th>
                    <th className="px-3 py-2.5 font-medium">Cycle</th>
                    <th className="px-3 py-2.5 font-medium">Usage</th>
                    <th className="px-5 py-2.5 font-medium">Last sync</th>
                  </tr>
                </thead>
                <tbody>
                  {paged.map((d) => (
                    <DeveloperTableRow
                      key={d.id}
                      developer={d}
                      onOpen={() => router.push(`/developers/${d.id}`)}
                    />
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex flex-col gap-3 border-t border-zinc-100 px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
              <p className="text-center text-xs text-zinc-500 sm:text-left">
                {total === 0 ? 'No rows' : `Showing ${from}–${to} of ${total}`}
              </p>
              <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage <= 1 || pageSize === 'all'}
                  className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Back
                </button>
                <span className="whitespace-nowrap text-center text-xs tabular-nums text-zinc-500">
                  Page {currentPage} of {pageCount}
                </span>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                  disabled={currentPage >= pageCount || pageSize === 'all'}
                  className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </section>
    </main>
  );
}

function cycleLeftLabel(end: string | null) {
  const left = daysLeft(end);
  if (left == null) return '—';
  if (left === 0) return 'Resets today';
  return `${left} day${left === 1 ? '' : 's'} left`;
}

function DeveloperCard({
  developer: d,
  onOpen,
}: {
  developer: DeveloperRow;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex w-full flex-col gap-3 px-3 py-4 text-left hover:bg-teal-50/60 sm:px-4"
    >
      <div className="flex items-start gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-teal-100 text-[11px] font-semibold text-teal-900">
          {initials(d.name)}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-medium text-zinc-900">{d.name}</span>
          <span className="block break-all text-xs text-zinc-500">{d.email}</span>
        </span>
        <span className="shrink-0 rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-700">
          {d.plan ?? '—'}
        </span>
      </div>
      <UsageBar percent={d.percent} />
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs text-zinc-500">
        <span>{cycleLabel(d.billingCycleStart, d.billingCycleEnd)}</span>
        <span>{cycleLeftLabel(d.billingCycleEnd)}</span>
        <span className="w-full sm:w-auto">Last sync {relativeTime(d.lastSeenAt)}</span>
      </div>
    </button>
  );
}

function DeveloperTableRow({
  developer: d,
  onOpen,
}: {
  developer: DeveloperRow;
  onOpen: () => void;
}) {
  return (
    <tr
      tabIndex={0}
      role="link"
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen();
        }
      }}
      className="cursor-pointer border-b border-zinc-50 outline-none transition hover:bg-teal-50/60 focus:bg-teal-50/80"
    >
      <td className="px-5 py-3.5">
        <div className="flex items-center gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-teal-100 text-[11px] font-semibold text-teal-900">
            {initials(d.name)}
          </span>
          <span className="min-w-0">
            <span className="block font-medium text-zinc-900">{d.name}</span>
            <span className="block truncate text-xs text-zinc-500">
              {d.email}
              {d.cursorVersion ? ` · Cursor ${d.cursorVersion}` : ''}
            </span>
          </span>
        </div>
      </td>
      <td className="px-3 py-3.5">
        <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-700">
          {d.plan ?? '—'}
        </span>
      </td>
      <td className="px-3 py-3.5 text-zinc-600">
        <div>{cycleLabel(d.billingCycleStart, d.billingCycleEnd)}</div>
        <div className="text-xs text-zinc-400">{cycleLeftLabel(d.billingCycleEnd)}</div>
      </td>
      <td className="px-3 py-3.5">
        <UsageBar percent={d.percent} className="min-w-[8.5rem]" />
      </td>
      <td className="whitespace-nowrap px-5 py-3.5 text-zinc-600">
        {relativeTime(d.lastSeenAt)}
      </td>
    </tr>
  );
}

function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="rounded-2xl border border-zinc-200/80 bg-white/90 px-4 py-4 shadow-sm min-w-0">
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
        {label}
      </p>
      <p className="mt-1 font-mono text-2xl font-semibold tabular-nums text-zinc-900">
        {value}
      </p>
      <p className="mt-1 text-xs leading-5 text-zinc-500">{hint}</p>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="px-5 py-12 text-center">
      <p className="text-sm font-medium text-zinc-800">Waiting for the first sync</p>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-zinc-500">
        Click <strong>Sync now</strong>, or send teammates to the{' '}
        <a href="/install" className="text-teal-800 underline">
          install page
        </a>
        . Rows appear after the agent reports once.
      </p>
    </div>
  );
}
