#!/usr/bin/env node
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { Command } from 'commander';
import {
  AGENT_VERSION,
  formatHumanScan,
  runFullScan,
} from './collectors/scan.js';
import { enrollWithHub, saveHubConfig, syncToHub } from './collectors/sync.js';
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
  .requiredOption('--server <url>', 'Company dashboard URL, e.g. http://192.168.1.10:3000')
  .requiredOption('--secret <secret>', 'Shared enrollment secret from the admin')
  .action(async (opts: { server: string; secret: string }) => {
    saveHubConfig({
      serverUrl: opts.server.replace(/\/$/, ''),
      enrollmentSecret: opts.secret,
    });
    const report = await runFullScan();
    const cfg = await enrollWithHub(opts.server, opts.secret, report);
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
  });

program
  .command('sync')
  .description('Scan this PC and upload usage to the company dashboard')
  .action(async () => {
    const result = await syncToHub();
    console.log(JSON.stringify({ ok: true, ...result }, null, 2));
  });

program.parseAsync(process.argv);
