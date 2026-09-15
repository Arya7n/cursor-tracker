'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { cursorUsagePercent } from '@/lib/percent';

export default function DeveloperDetailPage() {
  const params = useParams<{ id: string }>();
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!params.id) return;
    fetch(`/api/developers/${params.id}`, { cache: 'no-store' })
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Not found');
        setData(json);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed'));
  }, [params.id]);

  const employee = data?.employee as
    | { name?: string; email?: string }
    | undefined;
  const snapshots = (data?.snapshots as Array<Record<string, unknown>>) || [];
  const latest = snapshots[0];
  const usage = latest?.usage as Record<string, unknown> | undefined;
  const cycle = latest?.billingCycle as
    | { start?: string; end?: string }
    | undefined;
  const plan =
    (typeof latest?.plan === 'string' && latest.plan) ||
    (typeof usage?.planName === 'string' && usage.planName) ||
    null;
  const devices = (data?.devices as Array<{ lastSeenAt?: string }>) || [];
  const lastSeen = devices
    .map((d) => d.lastSeenAt)
    .filter(Boolean)
    .sort()
    .at(-1);
  const percent = cursorUsagePercent(usage);

  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <Link href="/" className="text-sm text-teal-800 hover:underline">
        ← All developers
      </Link>
      {error ? <p className="mt-4 text-sm text-rose-700">{error}</p> : null}
      <h1 className="mt-4 text-2xl font-semibold text-zinc-900">
        {employee?.name ?? 'Developer'}
      </h1>
      <p className="text-sm text-zinc-500">{employee?.email}</p>

      {!usage ? (
        <p className="mt-6 text-sm text-zinc-500">Waiting for agent data</p>
      ) : (
        <dl className="mt-6 space-y-2 rounded-xl border border-zinc-200 bg-white p-5 text-sm">
          <Row label="Plan" value={plan ?? '—'} />
          <Row
            label="Cycle"
            value={
              cycle?.start && cycle?.end
                ? `${new Date(cycle.start).toLocaleDateString()} – ${new Date(cycle.end).toLocaleDateString()}`
                : '—'
            }
          />
          <Row
            label="Usage"
            value={percent != null ? `${percent.toFixed(1)}%` : '—'}
          />
          <Row
            label="Last sync"
            value={lastSeen ? new Date(lastSeen).toLocaleString() : '—'}
          />
        </dl>
      )}
    </main>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-zinc-100 py-2 last:border-0">
      <dt className="text-zinc-500">{label}</dt>
      <dd className="font-medium text-right">{value}</dd>
    </div>
  );
}
