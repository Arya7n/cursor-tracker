export function formatPct(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) return '—';
  return `${value.toFixed(1)}%`;
}

export function formatUsd(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) return '—';
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function clampPct(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, value));
}

export function relativeTime(iso: string | null | undefined, now = Date.now()) {
  if (!iso) return 'Never';
  const ms = now - new Date(iso).getTime();
  if (!Number.isFinite(ms)) return '—';
  if (ms < 45_000) return 'Just now';
  const minutes = Math.round(ms / 60_000);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 36) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

export function cycleLabel(start: string | null | undefined, end: string | null | undefined) {
  if (!start || !end) return '—';
  const fmt = (iso: string) =>
    new Date(iso).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
    });
  return `${fmt(start)} – ${fmt(end)}`;
}

export function cycleProgress(start: string | null | undefined, end: string | null | undefined) {
  if (!start || !end) return null;
  const a = new Date(start).getTime();
  const b = new Date(end).getTime();
  if (!Number.isFinite(a) || !Number.isFinite(b) || b <= a) return null;
  return clampPct(((Date.now() - a) / (b - a)) * 100);
}

export function daysLeft(end: string | null | undefined) {
  if (!end) return null;
  const ms = new Date(end).getTime() - Date.now();
  if (!Number.isFinite(ms)) return null;
  return Math.max(0, Math.ceil(ms / (24 * 60 * 60 * 1000)));
}

export function inCurrentBillingCycle(
  start: string | null | undefined,
  end: string | null | undefined,
  now = Date.now(),
) {
  if (!start || !end) return false;
  const a = new Date(start).getTime();
  const b = new Date(end).getTime();
  if (!Number.isFinite(a) || !Number.isFinite(b) || b <= a) return false;
  return now >= a && now <= b;
}

export function initials(name: string) {
  const parts = name.trim().split(/[\s.@_-]+/).filter(Boolean);
  const letters = (parts[0]?.[0] || '?') + (parts[1]?.[0] || '');
  return letters.toUpperCase();
}

export function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
}

export function asNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

export function asString(value: unknown): string | null {
  return typeof value === 'string' && value ? value : null;
}
