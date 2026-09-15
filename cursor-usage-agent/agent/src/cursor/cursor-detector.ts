import { execFile } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import type { CursorInstallInfo } from './types.js';

const execFileAsync = promisify(execFile);

const WINDOWS_CANDIDATES = [
  join(process.env.LOCALAPPDATA || '', 'Programs', 'cursor', 'Cursor.exe'),
  join(process.env.LOCALAPPDATA || '', 'Programs', 'Cursor', 'Cursor.exe'),
  join(process.env.PROGRAMFILES || '', 'Cursor', 'Cursor.exe'),
];

/**
 * Detect Cursor IDE installation on the local machine (Windows first).
 * Read-only: does not modify Cursor files or configuration.
 */
export async function detectCursorInstall(): Promise<CursorInstallInfo> {
  const platform = process.platform;
  if (platform === 'win32') {
    return detectWindows();
  }
  // Stubs for later expansion
  return {
    installed: false,
    version: null,
    executablePath: null,
    processRunning: false,
    processCount: 0,
    cliAgentAvailable: false,
    cliAgentPath: null,
    cliAgentVersion: null,
  };
}

async function detectWindows(): Promise<CursorInstallInfo> {
  let executablePath: string | null = null;
  for (const candidate of WINDOWS_CANDIDATES) {
    if (candidate && existsSync(candidate)) {
      executablePath = candidate;
      break;
    }
  }

  let version: string | null = null;
  if (executablePath) {
    const pkg = join(
      executablePath.replace(/Cursor\.exe$/i, ''),
      'resources',
      'app',
      'package.json',
    );
    if (existsSync(pkg)) {
      try {
        const parsed = JSON.parse(readFileSync(pkg, 'utf8')) as {
          version?: string;
        };
        version = parsed.version ?? null;
      } catch {
        version = null;
      }
    }
  }

  const { processRunning, processCount } = await detectCursorProcess();
  const cli = await detectAgentCli();

  return {
    installed: Boolean(executablePath),
    version,
    executablePath,
    processRunning,
    processCount,
    cliAgentAvailable: cli.available,
    cliAgentPath: cli.path,
    cliAgentVersion: cli.version,
  };
}

async function detectCursorProcess(): Promise<{
  processRunning: boolean;
  processCount: number;
}> {
  try {
    const { stdout } = await execFileAsync(
      'tasklist',
      ['/FI', 'IMAGENAME eq Cursor.exe', '/FO', 'CSV', '/NH'],
      { windowsHide: true },
    );
    const lines = stdout
      .split(/\r?\n/)
      .map((l: string) => l.trim())
      .filter((l: string) => /Cursor\.exe/i.test(l));
    return { processRunning: lines.length > 0, processCount: lines.length };
  } catch {
    return { processRunning: false, processCount: 0 };
  }
}

export async function detectAgentCli(): Promise<{
  available: boolean;
  path: string | null;
  version: string | null;
}> {
  const candidates = [
    join(process.env.LOCALAPPDATA || '', 'cursor-agent', 'cursor-agent.ps1'),
    join(homedir(), '.local', 'bin', 'cursor-agent.ps1'),
    join(homedir(), '.local', 'bin', 'agent.cmd'),
  ];

  let path: string | null = null;
  for (const c of candidates) {
    if (c && existsSync(c)) {
      path = c;
      break;
    }
  }

  if (!path) {
    return { available: false, path: null, version: null };
  }

  try {
    const version = await runAgentCli(path, ['--version']);
    return {
      available: true,
      path,
      version: version.trim().split(/\r?\n/)[0] || null,
    };
  } catch {
    return { available: true, path, version: null };
  }
}

/**
 * Run the official Cursor Agent CLI wrapper safely (no shell interpolation of secrets).
 */
export async function runAgentCli(
  scriptPath: string,
  args: string[],
  opts?: { env?: NodeJS.ProcessEnv; timeoutMs?: number },
): Promise<string> {
  if (scriptPath.endsWith('.ps1')) {
    const { stdout, stderr } = await execFileAsync(
      'powershell.exe',
      ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', scriptPath, ...args],
      {
        windowsHide: true,
        timeout: opts?.timeoutMs ?? 45_000,
        env: { ...process.env, ...opts?.env },
        maxBuffer: 2 * 1024 * 1024,
      },
    );
    return `${stdout}${stderr}`.trim();
  }

  const { stdout, stderr } = await execFileAsync(scriptPath, args, {
    windowsHide: true,
    timeout: opts?.timeoutMs ?? 45_000,
    env: { ...process.env, ...opts?.env },
    maxBuffer: 2 * 1024 * 1024,
  });
  return `${stdout}${stderr}`.trim();
}
