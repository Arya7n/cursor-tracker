import { cpSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync, existsSync } from 'node:fs';
import { basename, join, relative } from 'node:path';

const root = process.env.KIT_ROOT || join(process.cwd(), '..');
const agentSrc = process.env.AGENT_SRC || join(root, 'agent');
const packWin = process.env.PACK_WIN || join(root, 'packaging', 'windows');
const packMac = process.env.PACK_MAC || join(root, 'packaging', 'macos');
const dest = join(process.cwd(), 'public', 'employee-kit');

function skipEntry(name) {
  return (
    name === 'node_modules' ||
    name === 'dist' ||
    name === 'manifest.json' ||
    name.startsWith('.')
  );
}

function walk(dir, acc = []) {
  for (const name of readdirSync(dir)) {
    if (skipEntry(name)) continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, acc);
    else acc.push(p);
  }
  return acc;
}

if (!existsSync(join(agentSrc, 'package.json'))) {
  console.error('Agent not found at', agentSrc);
  process.exit(1);
}

if (existsSync(dest)) rmSync(dest, { recursive: true, force: true });
mkdirSync(join(dest, 'agent'), { recursive: true });
cpSync(agentSrc, join(dest, 'agent'), {
  recursive: true,
  filter: (src) => {
    const name = basename(src);
    return name !== 'node_modules' && name !== 'dist' && !name.startsWith('.');
  },
});
cpSync(join(packWin, 'install.ps1'), join(dest, 'install.ps1'));
cpSync(join(packWin, 'uninstall.ps1'), join(dest, 'uninstall.ps1'));
cpSync(join(packWin, 'README.txt'), join(dest, 'README.txt'));
if (existsSync(packMac)) {
  mkdirSync(join(dest, 'macos'), { recursive: true });
  cpSync(join(packMac, 'install.sh'), join(dest, 'install.sh'));
  cpSync(join(packMac, 'uninstall.sh'), join(dest, 'uninstall.sh'));
  cpSync(join(packMac, 'install.sh'), join(dest, 'macos', 'install.sh'));
  cpSync(join(packMac, 'uninstall.sh'), join(dest, 'macos', 'uninstall.sh'));
  cpSync(join(packMac, 'bootstrap.sh'), join(dest, 'macos', 'bootstrap.sh'));
  if (existsSync(join(packMac, 'README.txt'))) {
    cpSync(join(packMac, 'README.txt'), join(dest, 'macos', 'README.txt'));
  }
}

const files = walk(dest).map((f) => relative(dest, f).replaceAll('\\', '/'));
writeFileSync(join(dest, 'manifest.json'), JSON.stringify({ files }, null, 2));

function writeLf(file) {
  if (!file.endsWith('.sh')) return;
  const text = readFileSync(file, 'utf8').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  writeFileSync(file, text, 'utf8');
}
function writePs1Bom(file) {
  if (!file.endsWith('.ps1')) return;
  const text = readFileSync(file, 'utf8').replace(/\u2014/g, '-').replace(/\u2013/g, '-');
  writeFileSync(file, `\uFEFF${text.replace(/^\uFEFF/, '')}`, 'utf8');
}
for (const f of walk(dest)) {
  writeLf(f);
  writePs1Bom(f);
}

const publicBootstrap = join(process.cwd(), 'public', 'bootstrap.sh');
if (existsSync(join(packMac, 'bootstrap.sh'))) {
  const text = readFileSync(join(packMac, 'bootstrap.sh'), 'utf8')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n');
  writeFileSync(publicBootstrap, text, 'utf8');
}

console.log('Published employee kit:', dest, `(${files.length} files)`);
