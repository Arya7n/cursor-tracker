import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

const PUBLIC_PATHS = [
  '/api/agents/register',
  '/api/agents/heartbeat',
  '/api/usage/report',
  '/install',
  '/bootstrap.ps1',
  '/bootstrap.sh',
  '/employee-kit',
];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return NextResponse.next();
  }

  const user = process.env.ADMIN_USER;
  const password = process.env.ADMIN_PASSWORD;
  if (!user || !password) {
    return NextResponse.next();
  }

  const header = req.headers.get('authorization') || '';
  const ok = header.startsWith('Basic ')
    ? validBasic(header.slice(6), user, password)
    : false;

  if (ok) return NextResponse.next();

  return new NextResponse('Admin login required', {
    status: 401,
    headers: { 'WWW-Authenticate': 'Basic realm="Cursor Usage Admin"' },
  });
}

function validBasic(b64: string, user: string, password: string): boolean {
  try {
    const decoded = atob(b64);
    const idx = decoded.indexOf(':');
    if (idx < 0) return false;
    return decoded.slice(0, idx) === user && decoded.slice(idx + 1) === password;
  } catch {
    return false;
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
