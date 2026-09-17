'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState, type ReactNode } from 'react';

type OsId = 'windows' | 'linux' | 'mac';

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

async function probeDownload(url: string): Promise<boolean> {
  if (/^https?:\/\//i.test(url)) return true;
  try {
    const res = await fetch(url, { method: 'HEAD', cache: 'no-store' });
    return res.ok;
  } catch {
    return false;
  }
}

export default function EmployeeInstallPage() {
  const [origin, setOrigin] = useState('');
  const [secret, setSecret] = useState<string | null>(null);
  const [windowsUrl, setWindowsUrl] = useState(
    '/downloads/CursorUsageSetup-latest.exe',
  );
  const [linuxUrl, setLinuxUrl] = useState(
    '/downloads/CursorUsage-latest.AppImage',
  );
  const [macUrl, setMacUrl] = useState('/downloads/CursorUsage-latest-mac.dmg');
  const [configError, setConfigError] = useState<string | null>(null);
  const [os, setOs] = useState<OsId>('windows');
  const [hasWindows, setHasWindows] = useState(false);
  const [hasLinux, setHasLinux] = useState(false);
  const [hasMac, setHasMac] = useState(false);
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
          linuxDownloadUrl?: string;
          macDownloadUrl?: string;
          error?: string;
        };
        if (!res.ok) {
          throw new Error(json.error || `HTTP ${res.status}`);
        }
        if (!cancelled) {
          setSecret(json.enrollmentSecret || null);
          if (json.windowsDownloadUrl) setWindowsUrl(json.windowsDownloadUrl);
          if (json.linuxDownloadUrl) setLinuxUrl(json.linuxDownloadUrl);
          if (json.macDownloadUrl) setMacUrl(json.macDownloadUrl);
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
      const [winOk, linuxOk, macOk] = await Promise.all([
        probeDownload(windowsUrl),
        probeDownload(linuxUrl),
        probeDownload(macUrl),
      ]);
      if (!cancelled) {
        setHasWindows(winOk);
        setHasLinux(linuxOk);
        setHasMac(macOk);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [windowsUrl, linuxUrl, macUrl]);

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

  const unixCmd = useMemo(() => {
    if (!ready || !secret) return '';
    const safeSecret = secret.replace(/'/g, `'\\''`);
    return `curl -fsSL -H "ngrok-skip-browser-warning: 1" ${origin}/bootstrap.sh -o /tmp/cursor-usage-bootstrap.sh && bash /tmp/cursor-usage-bootstrap.sh '${origin}' '${safeSecret}'`;
  }, [origin, ready, secret]);

  return (
    <main className="mx-auto w-full max-w-3xl px-3 py-6 sm:px-6 sm:py-8">
      <div className="anim-rise">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-teal-800">
          endpoint · install
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-900 sm:text-4xl">
          Install Cursor Usage
        </h1>
        <p className="mt-2 max-w-xl text-sm leading-6 text-zinc-600">
          Download the desktop app for Windows, Linux, or macOS. It syncs Cursor
          usage in the background and appears on the{' '}
          <Link
            href="/"
            className="font-semibold text-teal-800 underline-offset-2 hover:underline"
          >
            team dashboard
          </Link>
          .
        </p>
      </div>

      <ol className="mt-6 grid gap-3 sm:grid-cols-3">
        <Step
          n="01"
          title="Download"
          body="Get the Windows, Linux, or macOS app from this page."
          delay="anim-rise-delay-1"
        />
        <Step
          n="02"
          title="Stay signed in"
          body="Cursor Desktop must be signed in as the developer on this PC."
          delay="anim-rise-delay-2"
        />
        <Step
          n="03"
          title="Connect"
          body="Open the app, paste this hub URL, load the secret, then Enroll & sync."
          delay="anim-rise-delay-3"
        />
      </ol>

      {configError ? (
        <div className="mt-6 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {configError}
        </div>
      ) : null}

      <section className="panel anim-rise anim-rise-delay-4 mt-8 overflow-hidden rounded-2xl">
        <div className="flex gap-1 overflow-x-auto border-b border-teal-900/8 p-2">
          {(
            [
              { id: 'windows', label: 'Windows' },
              { id: 'linux', label: 'Linux' },
              { id: 'mac', label: 'macOS' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setOs(tab.id)}
              className={`min-w-0 flex-1 rounded-xl px-3 py-2 text-sm font-semibold sm:flex-none ${
                os === tab.id
                  ? 'bg-teal-800 text-white'
                  : 'text-zinc-600 hover:bg-teal-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="p-4 sm:p-5">
          {os === 'windows' ? (
            <DownloadPanel
              title="Desktop app · Windows"
              hint="Installer for Windows x64. After install, open Cursor Usage from the Start menu."
              href={windowsUrl}
              label="Download for Windows"
              available={hasWindows}
              missingHint={
                <>
                  Set <code className="text-xs">WINDOWS_DOWNLOAD_URL</code> to
                  your GitHub Release asset, or place the file at{' '}
                  <code className="text-xs">
                    public/downloads/CursorUsageSetup-latest.exe
                  </code>
                  .
                </>
              }
              hubUrl={origin}
            />
          ) : null}

          {os === 'linux' ? (
            <DownloadPanel
              title="Desktop app · Linux"
              hint="AppImage (or zip) for Linux x64. Make it executable, then run it."
              href={linuxUrl}
              label="Download for Linux"
              available={hasLinux}
              missingHint={
                <>
                  Set <code className="text-xs">LINUX_DOWNLOAD_URL</code> to
                  your GitHub Release asset, or place the file at{' '}
                  <code className="text-xs">
                    public/downloads/CursorUsage-latest.AppImage
                  </code>
                  .
                </>
              }
              hubUrl={origin}
              extra={
                <p className="rounded-xl bg-zinc-50 px-3 py-2 font-mono text-[11px] leading-5 text-zinc-600">
                  chmod +x CursorUsage*.AppImage && ./CursorUsage*.AppImage
                </p>
              }
            />
          ) : null}

          {os === 'mac' ? (
            <DownloadPanel
              title="Desktop app · macOS"
              hint="Disk image for Mac. Open the DMG, drag Cursor Usage to Applications, then enroll with this hub URL."
              href={macUrl}
              label="Download for macOS"
              available={hasMac}
              missingHint={
                <>
                  Set <code className="text-xs">MAC_DOWNLOAD_URL</code> to your
                  GitHub Release DMG, or place the file at{' '}
                  <code className="text-xs">
                    public/downloads/CursorUsage-latest-mac.dmg
                  </code>
                  .
                </>
              }
              hubUrl={origin}
              extra={
                <div className="space-y-2 rounded-xl bg-zinc-50 px-3 py-2 text-xs leading-5 text-zinc-600">
                  <p>
                    No Apple Developer license. macOS will warn that the app is
                    unsigned. After dragging it to Applications:
                  </p>
                  <ol className="list-decimal space-y-1 pl-4">
                    <li>
                      Control-click <strong>Cursor Usage</strong> →{' '}
                      <strong>Open</strong> → <strong>Open</strong>
                    </li>
                    <li>
                      If it says the app is damaged, run this in Terminal, then
                      open it again:
                    </li>
                  </ol>
                  <p className="break-all font-mono text-[11px] text-zinc-800">
                    xattr -cr &quot;/Applications/Cursor Usage.app&quot;
                  </p>
                </div>
              }
            />
          ) : null}
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
          <div className="panel mt-3 overflow-hidden rounded-2xl p-4 sm:p-5">
            {!ready ? (
              <p className="text-sm text-zinc-500">
                {configError
                  ? 'Fix the hub config, then refresh this page.'
                  : 'Preparing install command…'}
              </p>
            ) : os === 'windows' ? (
              <CommandBlock
                title="Command Prompt or PowerShell"
                hint="Requires Node.js 22. One-liner enrolls the legacy agent."
                command={winCmd}
              />
            ) : (
              <CommandBlock
                title="Terminal"
                hint="Requires Node.js 22. Works on Linux and macOS."
                command={unixCmd}
              />
            )}
          </div>
        ) : null}
      </section>
    </main>
  );
}

function DownloadPanel({
  title,
  hint,
  href,
  label,
  available,
  missingHint,
  hubUrl,
  extra,
}: {
  title: string;
  hint: string;
  href: string;
  label: string;
  available: boolean;
  missingHint: ReactNode;
  hubUrl: string;
  extra?: ReactNode;
}) {
  return (
    <div className="space-y-4">
      {available ? (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-sm font-semibold text-zinc-900">{title}</h2>
            <p className="mt-1 text-xs text-zinc-500">{hint}</p>
          </div>
          <a
            href={href}
            className="inline-flex items-center justify-center rounded-xl bg-teal-800 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-700"
          >
            {label}
          </a>
        </div>
      ) : (
        <p className="text-sm leading-6 text-zinc-600">{missingHint}</p>
      )}
      {extra}
      {hubUrl ? (
        <p className="rounded-xl bg-zinc-50 px-3 py-2 text-xs text-zinc-600">
          Hub URL to paste in the app:{' '}
          <code className="break-all text-zinc-900">{hubUrl}</code>
        </p>
      ) : null}
    </div>
  );
}

function Step({
  n,
  title,
  body,
  delay = '',
}: {
  n: string;
  title: string;
  body: string;
  delay?: string;
}) {
  return (
    <li className={`panel anim-rise ${delay} rounded-2xl p-4`}>
      <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-teal-800">
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
          className="w-full shrink-0 rounded-xl border border-zinc-300 bg-white px-3 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-50 sm:w-auto"
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
