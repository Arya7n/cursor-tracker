import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';
import { enrollmentSecret, registerDevice, saveUsageReport } from '@/lib/store';
import { buildSyncPayload } from '@/lib/payload';

const execFileAsync = promisify(execFile);

async function runLocalReport(): Promise<Record<string, unknown>> {
  const agentDir = path.resolve(process.cwd(), '..', 'agent');
  const { stdout, stderr } = await execFileAsync(
    process.execPath,
    ['--experimental-sqlite', '--import', 'tsx', 'src/main.ts', 'report'],
    {
      cwd: agentDir,
      timeout: 90_000,
      maxBuffer: 4 * 1024 * 1024,
      windowsHide: true,
      env: { ...process.env },
    },
  );
  const text = `${stdout}\n${stderr}`.trim();
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start < 0 || end < start) {
    throw new Error('Local agent returned no JSON');
  }
  return JSON.parse(text.slice(start, end + 1)) as Record<string, unknown>;
}

/** Enroll this dashboard host as a developer device and ingest a live scan. */
export async function POST() {
  try {
    const report = await runLocalReport();
    const machine = (report.machine || {}) as Record<string, unknown>;
    const account = (report.account || {}) as Record<string, unknown>;
    const cursor = (report.cursor || {}) as Record<string, unknown>;

    const enrolled = await registerDevice({
      enrollmentSecret: enrollmentSecret(),
      hostname: String(machine.hostname || 'dashboard-host'),
      os: String(machine.os || 'unknown'),
      architecture: String(machine.architecture || 'unknown'),
      agentVersion: String(report.agentVersion || '0.1.0'),
      cursorVersion:
        typeof cursor.version === 'string' ? cursor.version : null,
      email: typeof account.identifier === 'string' ? account.identifier : null,
      plan: typeof account.plan === 'string' ? account.plan : null,
    });

    const payload = buildSyncPayload(report);
    await saveUsageReport(enrolled.deviceToken, payload);

    return Response.json({
      ok: true,
      employeeId: enrolled.employee.id,
      deviceId: enrolled.device.id,
      email: enrolled.employee.email,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Local sync failed';
    return Response.json({ error: message }, { status: 500 });
  }
}
