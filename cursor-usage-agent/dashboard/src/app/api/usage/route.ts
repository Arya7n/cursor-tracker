import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';

const execFileAsync = promisify(execFile);

export async function GET() {
  const agentDir = path.resolve(process.cwd(), '..', 'agent');
  try {
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
      return Response.json(
        { error: 'Agent returned no JSON', preview: text.slice(0, 500) },
        { status: 502 },
      );
    }

    const report = JSON.parse(text.slice(start, end + 1));
    return Response.json(report);
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to run agent';
    return Response.json({ error: message }, { status: 500 });
  }
}
