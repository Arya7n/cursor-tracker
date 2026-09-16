'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { formatPct, initials, relativeTime } from '@/lib/format';

type Row = {
  id: string;
  name: string;
  email: string;
  plan: string | null;
  percent: number | null;
  lastSeenAt: string | null;
};

export default function AdminTrendsIndexPage() {
  const params = useParams<{ secret: string }>();
  const router = useRouter();
  const secret = params.secret;
  const [rows, setRows] = useState<Row[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  useEffect(() => {
    fetch('/api/analytics/overview', { cache: 'no-store' })
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Failed');
        setRows((json.developers || []) as Row[]);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed'));
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((d) =>
      `${d.name} ${d.email} ${d.plan ?? ''}`.toLowerCase().includes(q),
    );
  }, [rows, query]);

  return (
    <main className="mx-auto w-full max-w-4xl px-3 py-6 sm:px-6 sm:py-8">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-teal-800">
        Admin
      </p>
      <h1 className="mt-1 text-2xl font-semibold tracking-tight text-zinc-900">
        Usage trends
      </h1>
      <p className="mt-2 max-w-xl text-sm leading-6 text-zinc-600">
        Sync history and trend charts. This page is not linked from the team hub.
      </p>

      {error ? (
        <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {error}
        </p>
      ) : null}

      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search developer"
        className="mt-6 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm outline-none ring-teal-700/30 placeholder:text-zinc-400 focus:ring-2 sm:max-w-xs"
      />

      <ul className="mt-4 overflow-hidden rounded-2xl border border-zinc-200/80 bg-white/90 shadow-sm">
        {filtered.map((d) => (
          <li key={d.id} className="border-b border-zinc-100 last:border-0">
            <button
              type="button"
              onClick={() =>
                router.push(`/ops/${secret}/developers/${d.id}`)
              }
              className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-teal-50/60"
            >
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-teal-100 text-[11px] font-semibold text-teal-900">
                {initials(d.name)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium text-zinc-900">
                  {d.name}
                </span>
                <span className="block truncate text-xs text-zinc-500">
                  {d.email} · {d.plan ?? '—'} · last sync {relativeTime(d.lastSeenAt)}
                </span>
              </span>
              <span className="font-mono text-sm font-semibold tabular-nums text-zinc-800">
                {formatPct(d.percent)}
              </span>
            </button>
          </li>
        ))}
        {!filtered.length ? (
          <li className="px-4 py-8 text-sm text-zinc-500">No developers.</li>
        ) : null}
      </ul>
    </main>
  );
}
