import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const here = dirname(fileURLToPath(import.meta.url));
const outfile = join(here, '..', 'resources', 'desktop-agent.cjs');
mkdirSync(dirname(outfile), { recursive: true });

await build({
  absWorkingDir: join(here, '..', '..', 'agent'),
  entryPoints: ['src/main.ts'],
  bundle: true,
  platform: 'node',
  format: 'cjs',
  target: 'node22',
  outfile,
  logLevel: 'info',
});

console.log('Bundled agent →', outfile);
