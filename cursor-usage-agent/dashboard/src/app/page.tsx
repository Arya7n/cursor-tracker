'use client';

import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { UsageBar, OnDemandStatus } from '@/components/UsageMeter';
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
  onDemandUsedUsd: number | null;
  onDemandLimitUsd: number | null;
  onDemandRemainingUsd: number | null;
  onDemandPercent: number | null;
  onDemandEnabled: boolean;
  afterIncludedUsd: number | null;
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
    onDemandDevelopers?: number;
  };
  developers: DeveloperRow[];
};

type SortId = 'name' | 'usage' | 'ondemand' | 'sync';
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
  const [removingId, setRemovingId] = useState<string | null>(null);
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
          ? `Asked ${devices} devices to report. This PC updates now; others on their next 20-minute check-in.`
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

  const removeDeveloper = useCallback(
    async (d: DeveloperRow) => {
      const ok = window.confirm(
        `Remove ${d.name} from the hub?\n\nThis clears their dashboard data. If their PC agent is still installed, they will show up again on the next sync.`,
      );
      if (!ok) return;
      setRemovingId(d.id);
      setError(null);
      try {
        const res = await fetch(`/api/developers/${d.id}`, { method: 'DELETE' });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json.error || 'Remove failed');
        await load(true);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Remove failed');
      } finally {
        setRemovingId(null);
      }
    },
    [load],
  );

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
      if (sort === 'ondemand') {
        const on = (v: DeveloperRow) => (v.onDemandEnabled ? 1 : 0);
        const extra = (v: DeveloperRow) => v.afterIncludedUsd ?? v.onDemandPercent ?? -1;
        return on(b) - on(a) || extra(b) - extra(a);
      }
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
      <div className="anim-rise mb-6 flex flex-col gap-4 sm:mb-8 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <p className="status-live font-mono text-[11px] uppercase tracking-[0.22em] text-teal-800">
            live console
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-900 sm:text-4xl">
            Team usage
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-zinc-600">
            Included Cursor usage for the current billing cycle, plus whether
            on-demand spending is enabled in Cursor this cycle.
          </p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center">
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-zinc-500 sm:mr-1">
            {updatedAt
              ? `updated ${relativeTime(new Date(updatedAt).toISOString())}`
              : '—'}
          </p>
          <div className="grid grid-cols-2 gap-2 sm:flex">
            <button
              type="button"
              onClick={() => void syncNow()}
              disabled={syncing}
              className="rounded-xl bg-teal-800 px-3 py-2.5 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(15,118,110,0.25)] hover:bg-teal-700 disabled:opacity-50 sm:px-4"
            >
              {syncing ? 'Syncing…' : 'Sync now'}
            </button>
            <button
              type="button"
              onClick={() => void load()}
              disabled={loading}
              className="rounded-xl border border-teal-900/15 bg-white/80 px-3 py-2.5 text-sm font-semibold text-zinc-800 hover:border-teal-700/30 hover:bg-white disabled:opacity-50 sm:px-4"
            >
              {loading ? 'Loading…' : 'Refresh'}
            </button>
          </div>
        </div>
      </div>

      {syncNote ? (
        <div className="anim-fade mb-6 rounded-xl border border-teal-200/80 bg-teal-50/90 px-4 py-3 text-sm text-teal-900">
          {syncNote}
        </div>
      ) : null}

      {error ? (
        <div className="anim-fade mb-6 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {error}
        </div>
      ) : null}

      <section className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Developers"
          value={String(t?.developers ?? 0)}
          hint={`${t?.activeDevelopers ?? 0} reported in the last 24h`}
          delay="anim-rise-delay-1"
        />
        <StatCard
          label="Average usage"
          value={formatPct(t?.averageUsagePercent ?? null)}
          hint="Team average for this cycle"
          delay="anim-rise-delay-2"
        />
        <StatCard
          label="On-demand"
          value={
            (t?.onDemandDevelopers ?? 0) > 0 ? 'On' : 'Off'
          }
          hint={
            t?.developers
              ? `${t.onDemandDevelopers ?? 0} of ${t.developers} enabled this cycle`
              : 'Waiting for the first sync'
          }
          delay="anim-rise-delay-3"
        />
        <StatCard
          label="Devices"
          value={String(t?.devices ?? rows.reduce((n, d) => n + d.deviceCount, 0))}
          hint="Enrolled machines"
          delay="anim-rise-delay-4"
        />
      </section>

      <section className="panel anim-rise anim-rise-delay-4 rounded-2xl">
        <div className="flex flex-col gap-3 border-b border-teal-900/8 px-3 py-3 sm:px-5 md:flex-row md:items-end md:justify-between">
          <h2 className="text-sm font-semibold tracking-tight text-zinc-900 md:mb-2">
            Developers
          </h2>
          <div className="grid w-full grid-cols-2 gap-2 md:flex md:w-auto md:flex-nowrap md:items-end md:gap-2.5">
            <label className="col-span-2 min-w-0 md:w-56" htmlFor="team-search">
              <span className="mb-1 block font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-400">
                Search
              </span>
              <input
                id="team-search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Name, email, plan"
                className="w-full min-w-0 rounded-xl border border-teal-900/10 bg-white/90 px-3 py-2 text-sm font-medium text-zinc-800 outline-none ring-teal-700/25 placeholder:text-zinc-400 hover:border-teal-700/25 focus:ring-2"
              />
            </label>
            <ToolbarSelect
              label="Sort"
              value={sort}
              onChange={(v) => setSort(v as SortId)}
              className="md:w-[9.5rem]"
              options={[
                { value: 'name', label: 'Name' },
                { value: 'usage', label: 'Usage' },
                { value: 'ondemand', label: 'On-demand' },
                { value: 'sync', label: 'Last sync' },
              ]}
            />
            <ToolbarSelect
              label="Rows"
              value={String(pageSize)}
              onChange={(v) => {
                setPageSize(v === 'all' ? 'all' : (Number(v) as PageSize));
              }}
              className="md:w-[6.75rem]"
              options={PAGE_SIZES.map((n) => ({
                value: String(n),
                label: n === 'all' ? 'All' : String(n),
              }))}
            />
          </div>
        </div>

        <div className="overflow-hidden rounded-b-2xl">

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
            <ul className="divide-y divide-teal-900/6 md:hidden">
              {paged.map((d) => (
                <li key={d.id}>
                  <DeveloperCard
                    developer={d}
                    onOpen={() => router.push(`/developers/${d.id}`)}
                    onRemove={() => void removeDeveloper(d)}
                    removing={removingId === d.id}
                  />
                </li>
              ))}
            </ul>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[52rem] text-left text-sm">
                <thead>
                  <tr className="border-b border-teal-900/8 font-mono text-[10px] uppercase tracking-[0.16em] text-zinc-400">
                    <th className="px-5 py-3 font-medium">Developer</th>
                    <th className="px-3 py-3 font-medium">Plan</th>
                    <th className="px-3 py-3 font-medium">Cycle</th>
                    <th className="px-3 py-3 font-medium">Usage</th>
                    <th className="px-3 py-3 font-medium">On-demand</th>
                    <th className="px-5 py-3 font-medium">Last sync</th>
                    <th className="px-4 py-3 font-medium">
                      <span className="sr-only">Remove</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {paged.map((d) => (
                    <DeveloperTableRow
                      key={d.id}
                      developer={d}
                      onOpen={() => router.push(`/developers/${d.id}`)}
                      onRemove={() => void removeDeveloper(d)}
                      removing={removingId === d.id}
                    />
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex flex-col gap-3 border-t border-teal-900/8 px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
              <p className="text-center font-mono text-[11px] uppercase tracking-[0.12em] text-zinc-500 sm:text-left">
                {total === 0 ? 'No rows' : `Showing ${from}–${to} of ${total}`}
              </p>
              <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage <= 1 || pageSize === 'all'}
                  className="rounded-xl border border-teal-900/15 bg-white/80 px-3 py-2 text-sm font-medium text-zinc-800 hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Back
                </button>
                <span className="whitespace-nowrap text-center font-mono text-[11px] tabular-nums text-zinc-500">
                  {currentPage} / {pageCount}
                </span>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                  disabled={currentPage >= pageCount || pageSize === 'all'}
                  className="rounded-xl border border-teal-900/15 bg-white/80 px-3 py-2 text-sm font-medium text-zinc-800 hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
        </div>
      </section>
    </main>
  );
}

function ToolbarSelect({
  label,
  value,
  onChange,
  options,
  className = '',
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  className?: string;
}) {
  const id = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value) ?? options[0];

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className={`relative min-w-0 ${className}`}>
      <span
        id={`${id}-label`}
        className="mb-1 block font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-400"
      >
        {label}
      </span>
      <button
        type="button"
        id={id}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-labelledby={`${id}-label`}
        onClick={() => setOpen((v) => !v)}
        className={`flex w-full min-w-0 items-center justify-between gap-2 rounded-xl border bg-white/90 py-2 pl-3 pr-2.5 text-left text-sm font-medium outline-none ring-teal-700/25 hover:border-teal-700/30 focus:ring-2 ${
          open
            ? 'border-teal-700/40 text-zinc-900 shadow-[0_0_0_3px_rgba(15,118,110,0.12)]'
            : 'border-teal-900/10 text-zinc-800'
        }`}
      >
        <span className="truncate">{selected?.label}</span>
        <svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
          aria-hidden
          className={`shrink-0 text-teal-800/70 transition-transform duration-200 ${
            open ? 'rotate-180' : ''
          }`}
        >
          <path
            d="M2.5 4.25 6 7.75l3.5-3.5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      {open ? (
        <ul
          role="listbox"
          aria-labelledby={`${id}-label`}
          className="absolute right-0 z-30 mt-1.5 min-w-full overflow-hidden rounded-xl border border-teal-900/10 bg-white/95 py-1 shadow-[0_16px_40px_rgba(12,26,23,0.12)] backdrop-blur-md"
        >
          {options.map((opt) => {
            const active = opt.value === value;
            return (
              <li key={opt.value} role="option" aria-selected={active}>
                <button
                  type="button"
                  onClick={() => {
                    onChange(opt.value);
                    setOpen(false);
                  }}
                  className={`flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm transition-colors ${
                    active
                      ? 'bg-teal-50 font-semibold text-teal-900'
                      : 'font-medium text-zinc-700 hover:bg-teal-50/70 hover:text-zinc-900'
                  }`}
                >
                  {opt.label}
                  {active ? (
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 14 14"
                      fill="none"
                      aria-hidden
                      className="shrink-0 text-teal-800"
                    >
                      <path
                        d="M2.5 7.2 5.6 10.2 11.5 3.8"
                        stroke="currentColor"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
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
  onRemove,
  removing,
}: {
  developer: DeveloperRow;
  onOpen: () => void;
  onRemove: () => void;
  removing: boolean;
}) {
  return (
    <div className="px-3 py-4 sm:px-4">
      <button
        type="button"
        onClick={onOpen}
        className="flex w-full flex-col gap-3 text-left hover:opacity-90"
      >
        <div className="flex items-start gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-teal-800/10 font-mono text-[11px] font-semibold text-teal-900">
            {initials(d.name)}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate font-medium text-zinc-900">{d.name}</span>
            <span className="block break-all text-xs text-zinc-500">{d.email}</span>
          </span>
          <span className="shrink-0 rounded-lg border border-teal-900/10 bg-white/80 px-2.5 py-0.5 font-mono text-[11px] font-medium text-zinc-700">
            {d.plan ?? '—'}
          </span>
        </div>
        <UsageBar percent={d.percent} />
        <OnDemandStatus
          on={d.onDemandEnabled}
          percent={d.onDemandPercent}
        />
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs text-zinc-500">
          <span>{cycleLabel(d.billingCycleStart, d.billingCycleEnd)}</span>
          <span>{cycleLeftLabel(d.billingCycleEnd)}</span>
          <span className="w-full sm:w-auto">Last sync {relativeTime(d.lastSeenAt)}</span>
        </div>
      </button>
      <button
        type="button"
        onClick={onRemove}
        disabled={removing}
        className="mt-3 text-xs font-medium text-zinc-500 hover:text-rose-700 disabled:opacity-50"
      >
        {removing ? 'Removing…' : 'Remove from hub'}
      </button>
    </div>
  );
}

function DeveloperTableRow({
  developer: d,
  onOpen,
  onRemove,
  removing,
}: {
  developer: DeveloperRow;
  onOpen: () => void;
  onRemove: () => void;
  removing: boolean;
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
      className="cursor-pointer border-b border-teal-900/5 outline-none transition hover:bg-teal-50/70 focus:bg-teal-50/90"
    >
      <td className="px-5 py-3.5">
        <div className="flex items-center gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-teal-800/10 font-mono text-[11px] font-semibold text-teal-900">
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
        <span className="rounded-lg border border-teal-900/10 bg-white/80 px-2.5 py-0.5 font-mono text-[11px] font-medium text-zinc-700">
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
      <td className="px-3 py-3.5">
        <OnDemandStatus
          on={d.onDemandEnabled}
          percent={d.onDemandPercent}
        />
      </td>
      <td className="whitespace-nowrap px-5 py-3.5 text-zinc-600">
        {relativeTime(d.lastSeenAt)}
      </td>
      <td
        className="px-4 py-3.5 text-right"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onRemove}
          disabled={removing}
          className="text-xs font-medium text-zinc-400 hover:text-rose-700 disabled:opacity-50"
        >
          {removing ? 'Removing…' : 'Remove'}
        </button>
      </td>
    </tr>
  );
}

function StatCard({
  label,
  value,
  hint,
  delay = '',
}: {
  label: string;
  value: string;
  hint: string;
  delay?: string;
}) {
  return (
    <div className={`panel anim-rise ${delay} min-w-0 rounded-2xl px-4 py-4`}>
      <p className="font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-teal-800/80">
        {label}
      </p>
      <p className="mt-2 font-mono text-2xl font-semibold tracking-tight tabular-nums text-zinc-900">
        {value}
      </p>
      <p className="mt-1 text-xs leading-5 text-zinc-500">{hint}</p>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="px-5 py-12 text-center">
      <p className="text-sm font-semibold text-zinc-800">Waiting for the first sync</p>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-zinc-500">
        Click <strong>Sync now</strong>, or send teammates to the{' '}
        <a href="/install" className="font-semibold text-teal-800 underline-offset-2 hover:underline">
          install page
        </a>
        . Rows appear after the agent reports once.
      </p>
    </div>
  );
}
