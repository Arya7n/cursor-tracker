import { NextRequest } from 'next/server';
import { registerDevice } from '@/lib/store';

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Record<string, unknown>;
    const secret =
      req.headers.get('x-enrollment-secret') ||
      (typeof body.enrollmentSecret === 'string' ? body.enrollmentSecret : '');

    const result = await registerDevice({
      enrollmentSecret: secret,
      hostname: String(body.hostname || 'unknown-pc'),
      os: String(body.os || 'unknown'),
      architecture: String(body.architecture || 'unknown'),
      agentVersion: String(body.agentVersion || '0.1.0'),
      cursorVersion:
        typeof body.cursorVersion === 'string' ? body.cursorVersion : null,
      email: typeof body.email === 'string' ? body.email : null,
      plan: typeof body.plan === 'string' ? body.plan : null,
    });

    return Response.json({
      employeeId: result.employee.id,
      deviceId: result.device.id,
      deviceToken: result.deviceToken,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Register failed';
    const status = message.includes('Invalid enrollment') ? 401 : 400;
    return Response.json({ error: message }, { status });
  }
}
