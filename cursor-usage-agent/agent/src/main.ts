#!/usr/bin/env node
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { Command } from 'commander';
import {
  AGENT_VERSION,
  formatHumanScan,
  getMachineInfo,
  runFullScan,
} from './collectors/scan.js';
import { enrollWithHub, saveHubConfig, syncToHub, tickHub } from './collectors/sync.js';
import { discoverUsage } from './cursor/cursor-usage.js';

const program = new Command();

program
  .name('cursor-agent')
  .description(
    'Local Cursor Usage Agent POC — read-only discovery of legitimate local/CLI usage metadata',
  )
  .version(AGENT_VERSION);

program
  .command('scan')
  .description('Inspect local Cursor install/account/usage sources and print a report')
  .action(async () => {
    const report = await runFullScan();
    console.log(formatHumanScan(report));
  });

program
  .command('report')
  .description('Output a JSON report (secrets redacted)')
  .option('-o, --out <path>', 'Write JSON to file')
  .action(async (opts: { out?: string }) => {
    const report = await runFullScan();
    const json = JSON.stringify(report, null, 2);
    if (opts.out) {
      writeFileSync(opts.out, json, 'utf8');
      console.log(`Wrote ${opts.out}`);
    } else {
      console.log(json);
    }
  });

program
  .command('test-usage')
  .description(
    'Repeatedly read usage meters to assess stability (no artificial Cursor usage generated)',
  )
  .option('-n, --times <n>', 'Number of reads', '3')
  .option('-d, --delay-ms <ms>', 'Delay between reads', '1500')
  .action(async (opts: { times: string; delayMs: string }) => {
    const times = Math.max(1, Number(opts.times) || 3);
    const delay = Math.max(0, Number(opts.delayMs) || 1500);
    const results = [];
    for (let i = 0; i < times; i++) {
      const { usage } = await discoverUsage();
      const pct = usage.usagePercentage.value as
        | { totalPercentUsed?: number }
        | null;
      const rem = usage.remainingUsage.value as
        | { remainingUsd?: number }
        | null;
      results.push({
        iteration: i + 1,
        timestamp: new Date().toISOString(),
        currentUsage: usage.currentUsage.status,
        remainingUsage: usage.remainingUsage.status,
        totalPercentUsed: pct?.totalPercentUsed ?? null,
        remainingUsd: rem?.remainingUsd ?? null,
      });
      if (i < times - 1) {
        await new Promise((r) => setTimeout(r, delay));
      }
    }

    const percents = results
      .map((r) => r.totalPercentUsed)
      .filter((v): v is number => typeof v === 'number');
    const first = percents[0];
    const stable =
      percents.length > 1 && first !== undefined
        ? percents.every((p) => Math.abs(p - first) < 0.01)
        : percents.length === 1;

    console.log(
      JSON.stringify(
        {
          agentVersion: AGENT_VERSION,
          reads: results,
          analysis: {
            stable,
            changesObserved: percents.length > 1 && !stable,
            cached: 'UNKNOWN',
            updatesAfterActivity:
              'Re-run after using Cursor to observe changes',
            hasTimestamp: true,
            billingPeriodAssociation: 'AVAILABLE via billingCycle fields',
          },
        },
        null,
        2,
      ),
    );
  });

program
  .command('snapshot')
  .description('Save latest scan JSON under .cursor-agent/snapshots (offline queue stub)')
  .action(async () => {
    const report = await runFullScan();
    const dir = join(process.cwd(), '.cursor-agent', 'snapshots');
    mkdirSync(dir, { recursive: true });
    const file = join(dir, `snapshot-${Date.now()}.json`);
    writeFileSync(file, JSON.stringify(report, null, 2), 'utf8');
    console.log(`Saved ${file}`);
  });

program
  .command('enroll')
  .description('Save company dashboard URL + enrollment secret for this PC')
  .argument('[server]', 'Company dashboard URL')
  .argument('[secret]', 'Shared enrollment secret')
  .option('--server <url>', 'Company dashboard URL')
  .option('--secret <secret>', 'Shared enrollment secret')
  .allowExcessArguments(true)
  .action(
    async (
      serverArg: string | undefined,
      secretArg: string | undefined,
      opts: { server?: string; secret?: string },
    ) => {
      const server = (
        opts.server ||
        serverArg ||
        process.env.CURSOR_USAGE_SERVER ||
        ''
      ).replace(/\/$/, '');
      const secret =
        opts.secret ||
        secretArg ||
        process.env.CURSOR_USAGE_ENROLLMENT_SECRET ||
        '';
      if (!server || !secret) {
        throw new Error(
          'Missing dashboard URL or enrollment secret. Re-run the installer from /install.',
        );
      }
      saveHubConfig({
        serverUrl: server,
        enrollmentSecret: secret,
      });
      let report;
      try {
        report = await runFullScan();
      } catch (e) {
        console.error(
          'Scan warning (still enrolling this PC):',
          e instanceof Error ? e.message : e,
        );
        report = {
          agentVersion: AGENT_VERSION,
          timestamp: new Date().toISOString(),
          machine: getMachineInfo(),
          cursor: {
            installed: false,
            version: null,
            executablePath: null,
            processRunning: false,
          },
          account: {
            authenticated: null,
            identifier: null,
            plan: null,
            status: 'UNKNOWN' as const,
          },
          usage: { available: false },
          models: { available: false, list: [], status: 'UNKNOWN' as const },
          spending: { available: false, status: 'UNKNOWN' as const },
          discoveries: [],
        };
      }
      try {
        const cfg = await enrollWithHub(server, secret, report as never);
        console.log(
          JSON.stringify(
            {
              ok: true,
              serverUrl: cfg.serverUrl,
              employeeId: cfg.employeeId,
              deviceId: cfg.deviceId,
            },
            null,
            2,
          ),
        );
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error(`Enroll request failed: ${msg}`);
        process.exit(1);
      }
    },
  );

program
  .command('sync')
  .description('Scan this PC and upload usage to the company dashboard')
  .action(async () => {
    const result = await syncToHub();
    console.log(JSON.stringify({ ok: true, ...result }, null, 2));
  });

program
  .command('tick')
  .description('Check the hub for a sync-now request, or run a regular 20-minute sync')
  .action(async () => {
    const result = await tickHub();
    console.log(JSON.stringify({ ok: true, ...result }, null, 2));
  });

program.parseAsync(process.argv);
