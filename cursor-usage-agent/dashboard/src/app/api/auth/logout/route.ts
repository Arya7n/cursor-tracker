import { NextResponse } from 'next/server';
import { clearSessionCookieOptions } from '@/lib/admin-session';

export const dynamic = 'force-dynamic';

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(clearSessionCookieOptions());
  return res;
}
