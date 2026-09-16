import { NextRequest, NextResponse } from 'next/server';
import {
  createSessionToken,
  sessionCookieOptions,
  validateAdminCredentials,
  adminCredentialsConfigured,
} from '@/lib/admin-session';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  if (!adminCredentialsConfigured()) {
    return NextResponse.json(
      { error: 'Admin credentials are not configured on this hub.' },
      { status: 503 },
    );
  }

  const body = (await req.json().catch(() => ({}))) as {
    username?: string;
    password?: string;
  };
  const username = String(body.username || '');
  const password = String(body.password || '');

  if (!validateAdminCredentials(username, password)) {
    return NextResponse.json(
      { error: 'Invalid username or password' },
      { status: 401 },
    );
  }

  const token = await createSessionToken(username);
  const res = NextResponse.json({ ok: true });
  const cookie = sessionCookieOptions(token);
  res.cookies.set(cookie);
  return res;
}
