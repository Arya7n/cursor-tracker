import { copyFileSync, mkdirSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const releaseDir = join(process.cwd(), 'release');
const destDir = join(process.cwd(), '..', 'dashboard', 'public', 'downloads');

if (!existsSync(releaseDir)) {
  console.error('No release/ folder. Run npm run dist first.');
  process.exit(1);
}

mkdirSync(destDir, { recursive: true });

const artifacts = readdirSync(releaseDir).filter(
  (name) =>
    name.endsWith('.exe') ||
    name.endsWith('.dmg') ||
    name.endsWith('.AppImage') ||
    name.endsWith('.zip'),
);

if (!artifacts.length) {
  console.error('No installer artifacts found in release/');
  process.exit(1);
}

for (const name of artifacts) {
  const from = join(releaseDir, name);
  const to = join(destDir, name);
  copyFileSync(from, to);
  console.log('Published', to);
}

const latest = artifacts.find((n) => n.endsWith('.exe')) || artifacts[0];
copyFileSync(join(destDir, latest), join(destDir, 'CursorUsageSetup-latest.exe'));
console.log('Also wrote CursorUsageSetup-latest.exe');
