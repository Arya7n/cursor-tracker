import { NextRequest } from 'next/server';
import { heartbeat } from '@/lib/store';

function bearer(req: NextRequest): string | null {
  const h = req.headers.get('authorization') || '';
  const m = /^Bearer\s+(.+)$/i.exec(h);
  return m?.[1] ?? null;
}

export async function POST(req: NextRequest) {
  const token = bearer(req);
  if (!token) {
    return Response.json({ error: 'Missing device token' }, { status: 401 });
  }
  try {
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const device = await heartbeat(
      token,
      typeof body.agentVersion === 'string' ? body.agentVersion : undefined,
    );
    return Response.json({
      ok: true,
      deviceId: device.id,
      lastSeenAt: device.lastSeenAt,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Heartbeat failed';
    return Response.json({ error: message }, { status: 401 });
  }
}
