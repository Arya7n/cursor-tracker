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
      <header className="fixed inset-x-0 top-0 z-50 border-b border-zinc-200/80 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-6xl min-w-0 items-center justify-between gap-2 px-3 sm:h-16 sm:gap-4 sm:px-6">
          <Link href="/" className="flex min-w-0 items-center gap-2 sm:gap-2.5">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-teal-800 text-xs font-bold text-white">
              CU
            </span>
            <span className="min-w-0 leading-tight">
              <span className="block truncate text-sm font-semibold text-zinc-900">
                Cursor Usage
              </span>
              <span className="hidden text-[11px] uppercase tracking-[0.16em] text-teal-800 sm:block">
                Company hub
              </span>
            </span>
          </Link>
          <div className="flex shrink-0 items-center gap-2">
            <nav className="flex items-center gap-0.5 rounded-full bg-zinc-100/80 p-0.5 sm:gap-1 sm:p-1">
              {links.map((link) => {
                const active =
                  link.href === '/'
                    ? pathname === '/' || pathname.startsWith('/developers')
                    : pathname.startsWith(link.href);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`rounded-full px-2.5 py-1.5 text-xs font-medium transition sm:px-3.5 sm:text-sm ${
                      active
                        ? 'bg-white text-zinc-900 shadow-sm'
                        : 'text-zinc-500 hover:text-zinc-800'
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
              className="rounded-full border border-zinc-200 bg-white px-2.5 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50 sm:px-3 sm:text-sm"
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
