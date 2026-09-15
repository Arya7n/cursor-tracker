import { detectAgentCli, runAgentCli } from './cursor-detector.js';
import type { DiscoverySourceResult, ModelsInfo } from './types.js';

/**
 * Model catalog via official `agent models` — this is model availability, NOT usage.
 */
export async function detectModels(): Promise<{
  models: ModelsInfo;
  discovery: DiscoverySourceResult;
}> {
  const cli = await detectAgentCli();
  if (!cli.available || !cli.path) {
    return {
      models: {
        status: 'NOT AVAILABLE',
        models: [],
        source: null,
        reason: 'Cursor Agent CLI not installed',
      },
      discovery: {
        source: 'agent models',
        available: false,
        fields: [],
        reason: 'CLI missing',
      },
    };
  }

  try {
    const raw = await runAgentCli(cli.path, ['models']);
    const models = parseModelLines(raw);
    return {
      models: {
        status: models.length > 0 ? 'AVAILABLE' : 'UNKNOWN',
        models,
        source: 'agent models',
        reason:
          models.length > 0
            ? 'Official CLI listed models for this environment (catalog only — not usage counts)'
            : 'CLI returned no parseable model list',
      },
      discovery: {
        source: 'agent models',
        available: models.length > 0,
        fields: models.length > 0 ? ['modelId', 'displayName'] : [],
        reason:
          models.length > 0
            ? 'Model catalog available; does not include request/token usage'
            : 'Empty model list',
      },
    };
  } catch (e) {
    const reason = e instanceof Error ? e.message : 'models failed';
    return {
      models: {
        status: 'NOT AVAILABLE',
        models: [],
        source: 'agent models',
        reason,
      },
      discovery: {
        source: 'agent models',
        available: false,
        fields: [],
        reason,
      },
    };
  }
}

function parseModelLines(raw: string): string[] {
  const out: string[] = [];
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || /^Available models/i.test(trimmed)) continue;
    // Format: "id - Display Name"
    const id = trimmed.split(/\s+-/)[0]?.trim();
    if (id && !id.includes(' ')) out.push(id);
    else if (id) out.push(id);
  }
  return out;
}
