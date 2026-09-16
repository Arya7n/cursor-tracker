'use client';

import { FormEvent, useMemo, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

function LoginForm() {
  const search = useSearchParams();
  const nextPath = useMemo(() => {
    const n = search.get('next');
    if (!n || !n.startsWith('/') || n.startsWith('//') || n.startsWith('/login')) {
      return '/';
    }
    return n;
  }, [search]);

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ username, password }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        error?: string;
        redirectTo?: string;
      };
      if (!res.ok) throw new Error(json.error || 'Login failed');
      // Hard navigation so the session cookie is always sent on the next request.
      window.location.assign(json.redirectTo || nextPath || '/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
      setLoading(false);
    }
  }

  return (
    <main className="relative mx-auto flex min-h-screen w-full max-w-6xl flex-col justify-center px-4 py-12 sm:px-6">
      <div className="grid items-center gap-10 lg:grid-cols-[1.15fr_0.85fr]">
        <section className="anim-rise hidden lg:block">
          <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-teal-800">
            Cursor Usage
          </p>
          <h1 className="mt-4 max-w-xl text-5xl font-semibold tracking-tight text-zinc-900">
            Fleet telemetry for your Cursor seats.
          </h1>
          <p className="mt-4 max-w-md text-base leading-7 text-zinc-600">
            Sign in to watch plan usage across enrolled machines — live sync,
            per-developer meters, and install links for the team.
          </p>
          <div className="mt-8 flex flex-wrap gap-3 font-mono text-[11px] uppercase tracking-[0.18em] text-teal-900/70">
            <span className="rounded-lg border border-teal-900/10 bg-white/60 px-3 py-2">
              agents · 20m
            </span>
            <span className="rounded-lg border border-teal-900/10 bg-white/60 px-3 py-2">
              neon · postgres
            </span>
            <span className="rounded-lg border border-teal-900/10 bg-white/60 px-3 py-2">
              desktop · sync
            </span>
          </div>
        </section>

        <section className="panel panel-scan anim-rise anim-rise-delay-1 rounded-2xl p-6 sm:p-8">
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-teal-800">
            Admin access
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-900 lg:hidden">
            Cursor Usage
          </h2>
          <h2 className="mt-2 hidden text-2xl font-semibold tracking-tight text-zinc-900 lg:block">
            Sign in
          </h2>
          <p className="mt-2 text-sm leading-6 text-zinc-600">
            Enter your hub credentials to open the team console.
          </p>

          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <label className="block text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">
              Username
              <input
                autoFocus
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="mt-2 w-full rounded-xl border border-teal-900/10 bg-white/90 px-3 py-2.5 font-sans text-sm font-medium text-zinc-900 outline-none ring-teal-700/25 focus:ring-2"
                required
              />
            </label>
            <label className="block text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">
              Password
              <input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-2 w-full rounded-xl border border-teal-900/10 bg-white/90 px-3 py-2.5 font-sans text-sm font-medium text-zinc-900 outline-none ring-teal-700/25 focus:ring-2"
                required
              />
            </label>

            {error ? (
              <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
                {error}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-teal-800 px-4 py-3 text-sm font-semibold text-white shadow-[0_10px_28px_rgba(15,118,110,0.28)] hover:bg-teal-700 disabled:opacity-50"
            >
              {loading ? 'Authenticating…' : 'Enter dashboard'}
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-zinc-500">
            Installing on a developer PC?{' '}
            <Link href="/install" className="font-semibold text-teal-800 underline-offset-2 hover:underline">
              Open install
            </Link>
          </p>
        </section>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto max-w-md px-4 py-16 text-sm text-zinc-500">
          Loading…
        </main>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
