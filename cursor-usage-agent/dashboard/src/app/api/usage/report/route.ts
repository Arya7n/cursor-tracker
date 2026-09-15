import { NextRequest } from 'next/server';
import { saveUsageReport } from '@/lib/store';

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
    const body = (await req.json()) as Record<string, unknown>;
    const saved = await saveUsageReport(token, body);
    return Response.json({
      ok: true,
      employeeId: saved.employee.id,
      deviceId: saved.device.id,
      snapshotId: saved.snapshot.id,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Report failed';
    return Response.json({ error: message }, { status: 401 });
  }
}
