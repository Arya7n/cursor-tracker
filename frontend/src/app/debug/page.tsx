'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { apiGet, type DebugInspection } from '@/lib/api';
import { Badge, Button, Card, CardContent, CardHeader, CardTitle } from '@/components/ui/primitives';

export default function DebugPage() {
  const [items, setItems] = useState<DebugInspection[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiGet<DebugInspection[]>('/cursor/debug');
      setItems(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load debug data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <main className="mx-auto min-h-screen max-w-4xl px-4 py-10 sm:px-6">
      <header className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-teal-800">
            Developer only
          </p>
          <h1 className="mt-1 font-[family-name:var(--font-display)] text-3xl text-zinc-900">
            Raw Response Inspector
          </h1>
          <p className="mt-2 text-sm text-zinc-600">
            Secrets (API keys, Authorization, cookies, tokens) are redacted server-side before
            display.
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => void load()} disabled={loading}>
            {loading ? 'Loading…' : 'Refresh'}
          </Button>
          <Link
            href="/"
            className="inline-flex items-center rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50"
          >
            Dashboard
          </Link>
        </div>
      </header>

      {error ? (
        <Card className="mb-6 border-rose-200 bg-rose-50">
          <CardContent className="text-sm text-rose-800">{error}</CardContent>
        </Card>
      ) : null}

      <div className="space-y-4">
        {items.map((item) => (
          <Card key={`${item.method}-${item.endpoint}`} className="overflow-hidden">
            <CardHeader className="bg-zinc-50">
              <div className="flex flex-wrap items-center gap-2">
                <CardTitle className="font-mono text-xs sm:text-sm">
                  {item.method} {item.endpoint}
                </CardTitle>
                <Badge
                  variant={
                    item.status && item.status >= 200 && item.status < 300
                      ? 'success'
                      : 'danger'
                  }
                >
                  Status: {item.status ?? '—'}
                </Badge>
                <span className="text-xs text-zinc-500">{item.responseTime} ms</span>
              </div>
              <p className="mt-1 text-xs text-zinc-500">{item.message}</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <section>
                <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  Response headers (redacted)
                </h3>
                <pre className="overflow-x-auto rounded-md bg-zinc-950 p-3 text-xs text-zinc-100">
                  {JSON.stringify(item.responseHeaders, null, 2)}
                </pre>
              </section>
              <section>
                <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  Raw Response
                </h3>
                <pre className="overflow-x-auto rounded-md bg-zinc-950 p-3 text-xs text-zinc-100">
                  {JSON.stringify(item.rawResponse, null, 2)}
                </pre>
              </section>
              <section>
                <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  Normalized response
                </h3>
                <pre className="overflow-x-auto rounded-md bg-zinc-900 p-3 text-xs text-teal-100">
                  {JSON.stringify(item.normalizedResponse, null, 2)}
                </pre>
              </section>
            </CardContent>
          </Card>
        ))}
      </div>
    </main>
  );
}
