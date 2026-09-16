import { NextRequest, NextResponse } from 'next/server';
import { COOKIE_NAME, clearSessionCookieOptions } from '@/lib/admin-session';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const secure = req.nextUrl.protocol === 'https:';
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE_NAME, '', clearSessionCookieOptions(secure));
  return res;
}
