'use client';

import { useMemo, useState } from 'react';

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
  const origin =
    typeof window !== 'undefined' ? window.location.origin : 'http://SERVER:3000';

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
    <main className="mx-auto max-w-2xl px-4 py-10">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-800">
        Employee setup
      </p>
      <h1 className="mt-2 text-2xl font-semibold">Install Cursor Usage Agent</h1>
      <p className="mt-3 text-sm text-zinc-600">
        Works on Windows and Mac. Install Node.js 22 LTS, stay signed in to
        Cursor Desktop, then run the command for your OS. No zip required. The
        Windows command works in Command Prompt and PowerShell.
      </p>

      <CommandBlock title="Windows" command={winCmd} />
      <CommandBlock title="Mac" command={macCmd} />
    </main>
  );
}

function CommandBlock({ title, command }: { title: string; command: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <section className="mt-8">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-zinc-900">{title}</h2>
        <button
          type="button"
          className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs text-zinc-700 hover:bg-zinc-50"
          onClick={async () => {
            await navigator.clipboard.writeText(command);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1500);
          }}
        >
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre className="mt-2 overflow-x-auto rounded-lg bg-zinc-950 p-3 text-xs text-zinc-100 whitespace-pre-wrap">
        {command}
      </pre>
    </section>
  );
}
