'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

function toEncodedCommand(script: string): string {
  const bytes = new Uint8Array(script.length * 2);
  for (let i = 0; i < script.length; i++) {
    const code = script.charCodeAt(i);
    bytes[i * 2] = code & 0xff;
    bytes[i * 2 + 1] = code >> 8;
  }
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export default function EmployeeInstallPage() {
  const [origin, setOrigin] = useState('');
  const [secret, setSecret] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState(
    '/downloads/CursorUsageSetup-latest.exe',
  );
  const [configError, setConfigError] = useState<string | null>(null);
  const [os, setOs] = useState<'windows' | 'mac'>('windows');
  const [hasWindowsApp, setHasWindowsApp] = useState(false);
  const [showCli, setShowCli] = useState(false);

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch('/api/install-config', { cache: 'no-store' });
        const json = (await res.json()) as {
          enrollmentSecret?: string;
          windowsDownloadUrl?: string;
          error?: string;
        };
        if (!res.ok) {
          throw new Error(json.error || `HTTP ${res.status}`);
        }
        if (!cancelled) {
          setSecret(json.enrollmentSecret || null);
          if (json.windowsDownloadUrl) setDownloadUrl(json.windowsDownloadUrl);
          setConfigError(null);
        }
      } catch (e) {
        if (!cancelled) {
          setSecret(null);
          setConfigError(
            e instanceof Error ? e.message : 'Could not load install config',
          );
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        // External GitHub Release URLs are assumed available.
        if (/^https?:\/\//i.test(downloadUrl)) {
          if (!cancelled) setHasWindowsApp(true);
          return;
        }
        const res = await fetch(downloadUrl, {
          method: 'HEAD',
          cache: 'no-store',
        });
        if (!cancelled) setHasWindowsApp(res.ok);
      } catch {
        if (!cancelled) setHasWindowsApp(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [downloadUrl]);

  const ready = Boolean(origin && secret);

  const winCmd = useMemo(() => {
    if (!ready || !secret) return '';
    const script = [
      "$ProgressPreference = 'SilentlyContinue'",
      `$server = '${origin}'`,
      `$secret = '${secret.replace(/'/g, "''")}'`,
      "$path = Join-Path $env:TEMP 'cursor-usage-bootstrap.ps1'",
      "Invoke-WebRequest -Uri \"$server/bootstrap.ps1\" -Headers @{ 'ngrok-skip-browser-warning' = '1' } -OutFile $path",
      '& powershell.exe -NoProfile -ExecutionPolicy Bypass -File $path -Server $server -Secret $secret',
    ].join('; ');
    return `powershell.exe -NoProfile -ExecutionPolicy Bypass -EncodedCommand ${toEncodedCommand(script)}`;
  }, [origin, ready, secret]);

  const macCmd = useMemo(() => {
    if (!ready || !secret) return '';
    const safeSecret = secret.replace(/'/g, `'\\''`);
    return `curl -fsSL -H "ngrok-skip-browser-warning: 1" ${origin}/bootstrap.sh -o /tmp/cursor-usage-bootstrap.sh && bash /tmp/cursor-usage-bootstrap.sh '${origin}' '${safeSecret}'`;
  }, [origin, ready, secret]);

  return (
    <main className="mx-auto w-full max-w-3xl px-3 py-6 sm:px-6 sm:py-8">
      <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 sm:text-3xl">
        Install Cursor Usage
      </h1>
      <p className="mt-2 max-w-xl text-sm leading-6 text-zinc-600">
        Download the desktop app for your PC. It starts with Windows, syncs
        Cursor usage in the background, and appears on the{' '}
        <Link href="/" className="font-medium text-teal-800 underline">
          team dashboard
        </Link>
        .
      </p>

      <ol className="mt-6 grid gap-3 sm:grid-cols-3">
        <Step
          n="1"
          title="Download"
          body="Get the Windows app from this page (macOS app coming next)."
        />
        <Step
          n="2"
          title="Stay signed in"
          body="Cursor Desktop must be signed in as the developer on this PC."
        />
        <Step
          n="3"
          title="Connect"
          body="Open the app, paste this hub URL, load the secret, then Enroll & sync."
        />
      </ol>

      {configError ? (
        <div className="mt-6 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {configError}
        </div>
      ) : null}

      <section className="mt-8 overflow-hidden rounded-2xl border border-zinc-200/80 bg-white/90 shadow-sm">
        <div className="flex gap-1 overflow-x-auto border-b border-zinc-100 p-2">
          {(['windows', 'mac'] as const).map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => setOs(id)}
              className={`min-w-0 flex-1 rounded-lg px-3 py-2 text-sm font-medium sm:flex-none ${
                os === id
                  ? 'bg-teal-800 text-white'
                  : 'text-zinc-600 hover:bg-zinc-100'
              }`}
            >
              {id === 'windows' ? 'Windows' : 'macOS'}
            </button>
          ))}
        </div>
        <div className="p-4 sm:p-5">
          {os === 'windows' ? (
            <div className="space-y-4">
              {hasWindowsApp ? (
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-sm font-semibold text-zinc-900">
                      Desktop app
                    </h2>
                    <p className="mt-1 text-xs text-zinc-500">
                      Installer for Windows x64. After install, open Cursor Usage
                      from the Start menu.
                    </p>
                  </div>
                  <a
                    href={downloadUrl}
                    className="inline-flex items-center justify-center rounded-lg bg-teal-800 px-4 py-2.5 text-sm font-medium text-white hover:bg-teal-700"
                  >
                    Download for Windows
                  </a>
                </div>
              ) : (
                <p className="text-sm text-zinc-600">
                  Windows installer is not published on this hub yet. Build it
                  with <code className="text-xs">npm run dist:publish</code> in{' '}
                  <code className="text-xs">cursor-usage-agent/desktop</code>,
                  or use the CLI fallback below.
                </p>
              )}
              {origin ? (
                <p className="rounded-xl bg-zinc-50 px-3 py-2 text-xs text-zinc-600">
                  Hub URL to paste in the app:{' '}
                  <code className="break-all text-zinc-900">{origin}</code>
                </p>
              ) : null}
            </div>
          ) : (
            <p className="text-sm text-zinc-600">
              macOS desktop app is not ready yet. Use the CLI installer below for
              now.
            </p>
          )}
        </div>
      </section>

      <section className="mt-6">
        <button
          type="button"
          onClick={() => setShowCli((v) => !v)}
          className="text-sm font-medium text-teal-800 underline"
        >
          {showCli ? 'Hide CLI installer' : 'Advanced: CLI installer'}
        </button>
        {showCli ? (
          <div className="mt-3 overflow-hidden rounded-2xl border border-zinc-200/80 bg-white/90 p-4 shadow-sm sm:p-5">
            {!ready ? (
              <p className="text-sm text-zinc-500">
                {configError
                  ? 'Fix the hub config, then refresh this page.'
                  : 'Preparing install command…'}
              </p>
            ) : os === 'windows' ? (
              <CommandBlock
                title="Command Prompt or PowerShell"
                hint="Requires Node.js 22. Pastes a one-liner that downloads and enrolls the legacy agent."
                command={winCmd}
              />
            ) : (
              <CommandBlock
                title="Terminal"
                hint="Requires Node.js 22. Downloads the agent and sets a Launch Agent."
                command={macCmd}
              />
            )}
          </div>
        ) : null}
      </section>
    </main>
  );
}

function Step({ n, title, body }: { n: string; title: string; body: string }) {
  return (
    <li className="rounded-2xl border border-zinc-200/80 bg-white/90 p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-teal-800">
        Step {n}
      </p>
      <p className="mt-1 text-sm font-semibold text-zinc-900">{title}</p>
      <p className="mt-1 text-xs leading-5 text-zinc-500">{body}</p>
    </li>
  );
}

function CommandBlock({
  title,
  hint,
  command,
}: {
  title: string;
  hint: string;
  command: string;
}) {
  const [copied, setCopied] = useState(false);
  return (
    <section>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-zinc-900">{title}</h2>
          <p className="mt-1 text-xs text-zinc-500">{hint}</p>
        </div>
        <button
          type="button"
          className="w-full shrink-0 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-50 sm:w-auto"
          onClick={async () => {
            await navigator.clipboard.writeText(command);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1500);
          }}
        >
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre className="mt-3 max-w-full overflow-x-auto rounded-xl bg-zinc-950 p-3 text-[11px] leading-6 break-all text-zinc-100 whitespace-pre-wrap sm:p-4 sm:text-xs">
        {command}
      </pre>
    </section>
  );
}
