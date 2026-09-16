import { NextRequest } from 'next/server';
import { myUsage } from '@/lib/store';

export const dynamic = 'force-dynamic';

function bearer(req: NextRequest): string | null {
  const h = req.headers.get('authorization') || '';
  const m = /^Bearer\s+(.+)$/i.exec(h);
  return m?.[1] ?? null;
}

export async function GET(req: NextRequest) {
  const token = bearer(req);
  if (!token) {
    return Response.json({ error: 'Missing device token' }, { status: 401 });
  }
  try {
    const data = await myUsage(token);
    return Response.json(data);
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unauthorized';
    return Response.json({ error: message }, { status: 401 });
  }
}
