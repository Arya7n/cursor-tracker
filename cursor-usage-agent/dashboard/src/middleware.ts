import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import {
  COOKIE_NAME,
  adminCredentialsConfigured,
  verifySessionToken,
} from '@/lib/admin-session';

const PUBLIC_PATHS = [
  '/api/agents/register',
  '/api/agents/heartbeat',
  '/api/agents/me',
  '/api/usage/report',
  '/api/install-config',
  '/api/auth/login',
  '/api/auth/logout',
  '/install',
  '/bootstrap.ps1',
  '/bootstrap.sh',
  '/employee-kit',
  '/downloads',
];

function safeNext(raw: string | null): string {
  if (!raw || !raw.startsWith('/') || raw.startsWith('//')) return '/';
  if (raw.startsWith('/login')) return '/';
  return raw;
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return NextResponse.next();
  }

  if (!adminCredentialsConfigured()) {
    return NextResponse.next();
  }

  const token = req.cookies.get(COOKIE_NAME)?.value;
  const session = await verifySessionToken(token);

  // Logged-in users hitting /login go straight to the dashboard.
  if (pathname === '/login') {
    if (session) {
      return NextResponse.redirect(
        new URL(safeNext(req.nextUrl.searchParams.get('next')), req.url),
      );
    }
    return NextResponse.next();
  }

  if (session) {
    return NextResponse.next();
  }

  const wantsJson =
    pathname.startsWith('/api/') ||
    req.headers.get('accept')?.includes('application/json');

  if (wantsJson) {
    return NextResponse.json({ error: 'Admin login required' }, { status: 401 });
  }

  const login = new URL('/login', req.url);
  login.searchParams.set('next', pathname);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
