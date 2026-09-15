#!/usr/bin/env bash
set -euo pipefail

SERVER="${1:?Usage: bash bootstrap.sh https://dashboard-url ENROLLMENT_SECRET}"
SECRET="${2:?}"
SERVER="${SERVER%/}"

if ! command -v node >/dev/null 2>&1; then
  echo "Install Node.js 22 LTS from https://nodejs.org then retry."
  exit 1
fi

TMP="$(mktemp -d /tmp/cursor-usage-kit.XXXXXX)"
echo "Downloading installer from $SERVER (no zip)..."

export CURSOR_USAGE_BOOTSTRAP_SERVER="$SERVER"
export CURSOR_USAGE_BOOTSTRAP_TMP="$TMP"
node <<'NODE'
const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');

const server = process.env.CURSOR_USAGE_BOOTSTRAP_SERVER;
const tmp = process.env.CURSOR_USAGE_BOOTSTRAP_TMP;
const headers = { 'ngrok-skip-browser-warning': '1' };

function get(url) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https:') ? https : http;
    const req = lib.get(url, { headers }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        get(new URL(res.headers.location, url).href).then(resolve, reject);
        return;
      }
      if (res.statusCode !== 200) {
        reject(new Error(`${url} -> HTTP ${res.statusCode}`));
        return;
      }
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks)));
    });
    req.on('error', reject);
  });
}

(async () => {
  const manifest = JSON.parse((await get(`${server}/employee-kit/manifest.json`)).toString('utf8'));
  for (const rel of manifest.files) {
    const base = rel.split('/').pop() || rel;
    if (rel === 'manifest.json' || base.startsWith('.')) continue;
    const dest = path.join(tmp, ...rel.split('/'));
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, await get(`${server}/employee-kit/${rel}`));
  }
})().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
NODE

chmod +x "$TMP/install.sh"
"$TMP/install.sh" "$SERVER" "$SECRET"
