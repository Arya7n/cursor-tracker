const {
  app,
  BrowserWindow,
  Tray,
  Menu,
  nativeImage,
  ipcMain,
  shell,
} = require('electron');
const path = require('node:path');
const fs = require('node:fs');
const { spawn } = require('node:child_process');
const os = require('node:os');

const TICK_MS = 20 * 60 * 1000;
const CONFIG_DIR = path.join(os.homedir(), '.cursor-usage-agent');
const CONFIG_PATH = path.join(CONFIG_DIR, 'config.json');

let mainWindow = null;
let tray = null;
let tickTimer = null;
let agentBusy = false;

function agentRoot() {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'agent');
  }
  return path.join(__dirname, '..', 'agent');
}

function extraBinDirs() {
  const home = os.homedir();
  const dirs = [
    '/opt/homebrew/bin',
    '/usr/local/bin',
    '/usr/bin',
    path.join(home, '.volta', 'bin'),
    path.join(home, '.asdf', 'shims'),
    path.join(home, '.local', 'share', 'fnm', 'aliases', 'default', 'bin'),
  ];
  if (process.platform === 'win32') {
    dirs.push(path.join(process.env.ProgramFiles || 'C:\\Program Files', 'nodejs'));
    dirs.push(path.join(process.env.LOCALAPPDATA || '', 'Programs', 'nodejs'));
  }
  const nvm = path.join(home, '.nvm', 'versions', 'node');
  try {
    if (fs.existsSync(nvm)) {
      for (const ver of fs.readdirSync(nvm)) {
        dirs.push(path.join(nvm, ver, 'bin'));
      }
    }
  } catch {
    /* ignore */
  }
  return dirs.filter(Boolean);
}

function envWithNodeBins() {
  const sep = path.delimiter;
  const extra = extraBinDirs().join(sep);
  return {
    ...process.env,
    PATH: extra ? `${extra}${sep}${process.env.PATH || ''}` : process.env.PATH,
  };
}

function agentBundlePath() {
  const candidates = [
    path.join(process.resourcesPath || '', 'agent', 'desktop-agent.cjs'),
    path.join(__dirname, 'resources', 'desktop-agent.cjs'),
    path.join(agentRoot(), 'dist', 'desktop-agent.cjs'),
  ];
  return candidates.find((p) => p && fs.existsSync(p)) || null;
}

function loadConfig() {
  try {
    if (!fs.existsSync(CONFIG_PATH)) return null;
    return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
  } catch {
    return null;
  }
}

function saveConfig(partial) {
  fs.mkdirSync(CONFIG_DIR, { recursive: true });
  const prev = loadConfig() || {};
  const next = { ...prev, ...partial };
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(next, null, 2), 'utf8');
  return next;
}

function createTrayIcon() {
  const iconPath = path.join(__dirname, 'assets', 'tray.png');
  if (fs.existsSync(iconPath)) {
    return nativeImage.createFromPath(iconPath);
  }
  // 16x16 teal square fallback
  const size = 16;
  const buf = Buffer.alloc(size * size * 4);
  for (let i = 0; i < size * size; i++) {
    buf[i * 4] = 15;
    buf[i * 4 + 1] = 118;
    buf[i * 4 + 2] = 110;
    buf[i * 4 + 3] = 255;
  }
  return nativeImage.createFromBuffer(buf, { width: size, height: size });
}

function runAgent(command) {
  return new Promise((resolve, reject) => {
    if (agentBusy) {
      reject(new Error('Agent is already running a job'));
      return;
    }
    const bundle = agentBundlePath();
    const entryTs = path.join(agentRoot(), 'src', 'main.ts');
    let args;
    let cwd;
    if (bundle) {
      args = ['--experimental-sqlite', bundle, command];
      cwd = path.dirname(bundle);
    } else if (fs.existsSync(entryTs)) {
      args = ['--experimental-sqlite', '--import', 'tsx', entryTs, command];
      cwd = agentRoot();
    } else {
      reject(
        new Error(
          'Agent bundle not found. Rebuild the desktop app with npm run dist:mac / dist:win.',
        ),
      );
      return;
    }

    agentBusy = true;
    const child = spawn(process.execPath, args, {
      cwd,
      env: {
        ...envWithNodeBins(),
        ELECTRON_RUN_AS_NODE: '1',
        NODE_ENV: process.env.NODE_ENV || 'production',
      },
      windowsHide: true,
    });

    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d) => {
      stdout += d.toString();
    });
    child.stderr.on('data', (d) => {
      stderr += d.toString();
    });
    child.on('error', (err) => {
      agentBusy = false;
      reject(err);
    });
    child.on('close', (code) => {
      agentBusy = false;
      if (code === 0) resolve({ stdout, stderr });
      else {
        const msg = (stderr || stdout || `Agent exited with code ${code}`).trim();
        reject(new Error(msg.slice(0, 800)));
      }
    });
  });
}

async function ensureAgentDeps() {
  if (agentBundlePath()) return;
  if (app.isPackaged) {
    throw new Error(
      'This Mac/Windows build is missing the bundled agent. Rebuild with npm run dist:mac (or dist:win) and install that new DMG/exe. Enroll does not use npm.',
    );
  }
}

function sendStatus(extra = {}) {
  const cfg = loadConfig();
  const payload = {
    enrolled: Boolean(cfg?.deviceToken && cfg?.serverUrl),
    serverUrl: cfg?.serverUrl || '',
    lastSyncAt: cfg?.lastSyncAt || null,
    employeeId: cfg?.employeeId || null,
    openAtLogin: app.getLoginItemSettings().openAtLogin,
    ...extra,
  };
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('status', payload);
  }
  return payload;
}

async function fetchMyUsage() {
  const cfg = loadConfig();
  if (!cfg?.serverUrl || !cfg?.deviceToken) {
    throw new Error('Not enrolled yet');
  }
  const res = await fetch(`${cfg.serverUrl.replace(/\/$/, '')}/api/agents/me`, {
    headers: {
      Authorization: `Bearer ${cfg.deviceToken}`,
      'ngrok-skip-browser-warning': '1',
    },
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json.error || `Could not load usage (HTTP ${res.status})`);
  }
  sendStatus({ myUsage: json, myUsageError: null });
  return json;
}

async function doEnroll({ serverUrl, enrollmentSecret }) {
  const url = String(serverUrl || '').trim().replace(/\/$/, '');
  const secret = String(enrollmentSecret || '').trim();
  if (!url || !secret) throw new Error('Hub URL and enrollment secret are required');

  saveConfig({ serverUrl: url, enrollmentSecret: secret });
  await ensureAgentDeps();
  process.env.CURSOR_USAGE_SERVER = url;
  process.env.CURSOR_USAGE_ENROLLMENT_SECRET = secret;
  const result = await runAgent('enroll');
  await runAgent('sync').catch(() => null);
  let myUsage = null;
  try {
    myUsage = await fetchMyUsage();
  } catch (e) {
    sendStatus({
      message: 'Enrolled, but could not load your usage yet',
      myUsageError: e instanceof Error ? e.message : 'Load failed',
      error: true,
    });
  }
  sendStatus({
    message: 'Enrolled and synced',
    lastOutput: result.stdout.slice(-500),
    myUsage,
    myUsageError: null,
  });
  return sendStatus({ myUsage });
}

async function doSync() {
  const cfg = loadConfig();
  if (!cfg?.serverUrl || !cfg?.enrollmentSecret) {
    throw new Error('Not enrolled yet');
  }
  await ensureAgentDeps();
  process.env.CURSOR_USAGE_SERVER = cfg.serverUrl;
  process.env.CURSOR_USAGE_ENROLLMENT_SECRET = cfg.enrollmentSecret;
  const result = await runAgent('sync');
  let myUsage = null;
  try {
    myUsage = await fetchMyUsage();
  } catch {
    myUsage = null;
  }
  sendStatus({
    message: 'Sync complete',
    lastOutput: result.stdout.slice(-500),
    myUsage,
  });
  return sendStatus({ myUsage });
}
async function doTick() {
  const cfg = loadConfig();
  if (!cfg?.serverUrl || !cfg?.deviceToken) return;
  try {
    await ensureAgentDeps();
    process.env.CURSOR_USAGE_SERVER = cfg.serverUrl;
    process.env.CURSOR_USAGE_ENROLLMENT_SECRET = cfg.enrollmentSecret;
    await runAgent('tick');
    let myUsage = null;
    try {
      myUsage = await fetchMyUsage();
    } catch {
      myUsage = null;
    }
    sendStatus({ message: 'Background tick ok', myUsage });
  } catch (e) {
    sendStatus({
      message: e instanceof Error ? e.message : 'Tick failed',
      error: true,
    });
  }
}

function scheduleTicks() {
  if (tickTimer) clearInterval(tickTimer);
  tickTimer = setInterval(() => {
    void doTick();
  }, TICK_MS);
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 440,
    height: 720,
    minWidth: 380,
    minHeight: 560,
    show: false,
    title: 'Cursor Usage',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    sendStatus();
  });

  mainWindow.on('close', (e) => {
    if (!app.isQuitting) {
      e.preventDefault();
      mainWindow.hide();
    }
  });
}

function createTray() {
  tray = new Tray(createTrayIcon());
  tray.setToolTip('Cursor Usage');
  const menu = Menu.buildFromTemplate([
    {
      label: 'Open',
      click: () => {
        if (!mainWindow) createWindow();
        mainWindow.show();
        mainWindow.focus();
        sendStatus();
      },
    },
    {
      label: 'Sync now',
      click: () => {
        void doSync().catch((err) =>
          sendStatus({ message: err.message, error: true }),
        );
      },
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        app.isQuitting = true;
        app.quit();
      },
    },
  ]);
  tray.setContextMenu(menu);
  tray.on('double-click', () => {
    if (!mainWindow) createWindow();
    mainWindow.show();
  });
}

function registerIpc() {
  ipcMain.handle('get-status', () => sendStatus());
  ipcMain.handle('enroll', async (_e, payload) => doEnroll(payload));
  ipcMain.handle('sync', async () => doSync());
  ipcMain.handle('get-my-usage', async () => fetchMyUsage());
  ipcMain.handle('set-open-at-login', (_e, enabled) => {
    app.setLoginItemSettings({
      openAtLogin: Boolean(enabled),
      path: process.execPath,
      args: app.isPackaged ? [] : ['.'],
    });
    return sendStatus();
  });
  ipcMain.handle('open-external', (_e, url) => {
    if (typeof url === 'string' && /^https?:\/\//i.test(url)) {
      void shell.openExternal(url);
    }
  });
  ipcMain.handle('fetch-install-secret', async (_e, serverUrl) => {
    const base = String(serverUrl || '').trim().replace(/\/$/, '');
    if (!base) throw new Error('Hub URL required');
    const res = await fetch(`${base}/api/install-config`, {
      headers: { 'ngrok-skip-browser-warning': '1' },
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
    return json.enrollmentSecret;
  });
}

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
  });

  app.whenReady().then(() => {
    registerIpc();
    createTray();
    createWindow();
    app.setLoginItemSettings({
      openAtLogin: true,
      path: process.execPath,
      args: app.isPackaged ? [] : ['.'],
    });
    scheduleTicks();
    const cfg = loadConfig();
    if (cfg?.deviceToken) {
      void doTick();
      void fetchMyUsage().catch(() => null);
    }
  });

  app.on('before-quit', () => {
    app.isQuitting = true;
    if (tickTimer) clearInterval(tickTimer);
  });

  app.on('window-all-closed', (e) => {
    e.preventDefault();
  });
}
