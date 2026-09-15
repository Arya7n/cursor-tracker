/** Percent Cursor actually paints in the IDE usage UI. */
export function cursorUsagePercent(
  usage: Record<string, unknown> | null | undefined,
): number | null {
  if (!usage) return null;
  const auto = num(usage.autoPercentUsed);
  const api = num(usage.apiPercentUsed);
  const total = num(usage.totalPercentUsed);

  if (auto != null && api != null && api > 0 && auto > 0) {
    return total ?? auto;
  }
  if (auto != null && (api == null || api === 0)) return auto;
  if (api != null && (auto == null || auto === 0)) return api;
  return total ?? auto ?? api;
}

function num(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}
