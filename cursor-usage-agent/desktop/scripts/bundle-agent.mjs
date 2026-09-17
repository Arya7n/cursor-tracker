import { spawnSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const here = dirname(fileURLToPath(import.meta.url));
const agentDir = join(here, '..', '..', 'agent');
const outfile = join(here, '..', 'resources', 'desktop-agent.cjs');
mkdirSync(dirname(outfile), { recursive: true });

const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const install = spawnSync(npmCmd, ['install', '--omit=dev'], {
  cwd: agentDir,
  stdio: 'inherit',
  shell: process.platform === 'win32',
});
if (install.status !== 0) {
  process.exit(install.status ?? 1);
}

await build({
  absWorkingDir: agentDir,
  entryPoints: ['src/main.ts'],
  bundle: true,
  platform: 'node',
  format: 'cjs',
  target: 'node22',
  outfile,
  logLevel: 'info',
});

console.log('Bundled agent →', outfile);