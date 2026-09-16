'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

const links = [
  { href: '/', label: 'Team' },
  { href: '/install', label: 'Install' },
];

export function AppHeader() {
  const pathname = usePathname();
  const router = useRouter();

  if (pathname === '/login') {
    return null;
  }

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.replace('/login');
    router.refresh();
  }

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-50 border-b border-teal-900/10 bg-[#f7fbf9]/80 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-6xl min-w-0 items-center justify-between gap-2 px-3 sm:h-16 sm:gap-4 sm:px-6">
          <Link href="/" className="group flex min-w-0 items-center gap-2.5">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-teal-800 text-[11px] font-bold tracking-wide text-white shadow-[0_8px_20px_rgba(15,118,110,0.28)] transition group-hover:scale-[1.03]">
              CU
            </span>
            <span className="min-w-0 leading-tight">
              <span className="block truncate text-sm font-semibold tracking-tight text-zinc-900">
                Cursor Usage
              </span>
              <span className="hidden font-mono text-[10px] uppercase tracking-[0.22em] text-teal-800/80 sm:block">
                telemetry hub
              </span>
            </span>
          </Link>
          <div className="flex shrink-0 items-center gap-2">
            <nav className="flex items-center gap-1 rounded-xl border border-teal-900/10 bg-white/70 p-1">
              {links.map((link) => {
                const active =
                  link.href === '/'
                    ? pathname === '/' || pathname.startsWith('/developers')
                    : pathname.startsWith(link.href);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold tracking-wide transition sm:text-sm ${
                      active
                        ? 'bg-teal-800 text-white'
                        : 'text-zinc-500 hover:bg-teal-50 hover:text-teal-900'
                    }`}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </nav>
            <button
              type="button"
              onClick={() => void logout()}
              className="rounded-xl border border-zinc-200/90 bg-white/80 px-3 py-1.5 text-xs font-medium text-zinc-600 hover:border-teal-700/30 hover:text-teal-900 sm:text-sm"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>
      <div className="h-14 sm:h-16" aria-hidden />
    </>
  );
}
