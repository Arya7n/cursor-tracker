'use client';

import { useEffect, useMemo, useState } from 'react';

const SECRET = 'aryan_dev';

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
  const [os, setOs] = useState<'windows' | 'mac'>('windows');

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const winCmd = useMemo(() => {
    const script = [
      "$ProgressPreference = 'SilentlyContinue'",
      `$server = '${origin}'`,
      `$secret = '${SECRET}'`,
      "$path = Join-Path $env:TEMP 'cursor-usage-bootstrap.ps1'",
      "Invoke-WebRequest -Uri \"$server/bootstrap.ps1\" -Headers @{ 'ngrok-skip-browser-warning' = '1' } -OutFile $path",
      '& powershell.exe -NoProfile -ExecutionPolicy Bypass -File $path -Server $server -Secret $secret',
    ].join('; ');
    return `powershell.exe -NoProfile -ExecutionPolicy Bypass -EncodedCommand ${toEncodedCommand(script)}`;
  }, [origin]);

  const macCmd = useMemo(() => {
    return `curl -fsSL -H "ngrok-skip-browser-warning: 1" ${origin}/bootstrap.sh -o /tmp/cursor-usage-bootstrap.sh && bash /tmp/cursor-usage-bootstrap.sh '${origin}' '${SECRET}'`;
  }, [origin]);

  return (
    <main className="mx-auto w-full max-w-3xl px-3 py-6 sm:px-6 sm:py-8">
      <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 sm:text-3xl">
        Install the agent
      </h1>
      <p className="mt-2 max-w-xl text-sm leading-6 text-zinc-600">
        One command per PC. Needs Node.js 22 LTS and a signed-in Cursor Desktop
        session. After install, usage appears on the team dashboard within a
        few minutes.
      </p>

      <ol className="mt-6 grid gap-3 sm:grid-cols-3">
        <Step n="1" title="Node 22" body="Install Node.js 22 LTS if it is not already on the machine." />
        <Step n="2" title="Stay signed in" body="Cursor Desktop must be signed in as the developer." />
        <Step n="3" title="Run the command" body="Copy the command for your OS. The agent reports about every 20 minutes, or when an admin clicks Sync now (next check-in)." />
      </ol>

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
          {!origin ? (
            <p className="text-sm text-zinc-500">Preparing install command…</p>
          ) : os === 'windows' ? (
            <CommandBlock
              title="Command Prompt or PowerShell"
              hint="Paste this as one line. It downloads the installer and enrolls this PC."
              command={winCmd}
            />
          ) : (
            <CommandBlock
              title="Terminal"
              hint="Run in Terminal. It downloads the installer and sets a Launch Agent."
              command={macCmd}
            />
          )}
        </div>
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
