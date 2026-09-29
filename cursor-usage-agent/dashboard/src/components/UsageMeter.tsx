import {
  clampPct,
  formatPct,
} from '@/lib/format';

const teal = '#0f766e';
const amber = '#c2410c';
const rose = '#9f1239';

function meterTone(percent: number | null | undefined): 'ok' | 'warn' | 'hot' {
  if (percent == null || !Number.isFinite(percent) || percent < 80) return 'ok';
  if (percent < 95) return 'warn';
  return 'hot';
}

export function UsageBar({
  percent,
  className = '',
}: {
  percent: number | null | undefined;
  className?: string;
}) {
  const width = clampPct(percent);
  const tone = meterTone(percent);
  const fill =
    tone === 'hot'
      ? 'bg-gradient-to-r from-rose-800 to-rose-500'
      : tone === 'warn'
        ? 'bg-gradient-to-r from-orange-700 to-amber-400'
        : 'bg-gradient-to-r from-teal-700 to-teal-400';
  const label =
    tone === 'hot'
      ? 'text-rose-900'
      : tone === 'warn'
        ? 'text-orange-800'
        : 'text-zinc-800';
  return (
    <div className={`min-w-0 w-full ${className}`}>
      <span className={`font-mono text-sm font-semibold tabular-nums ${label}`}>
        {formatPct(percent)}
      </span>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-teal-900/8">
        <div
          className={`meter-fill h-full rounded-full ${fill}`}
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  );
}

export function UsageRing({
  percent,
  caption,
}: {
  percent: number | null | undefined;
  caption?: string;
}) {
  const value = clampPct(percent);
  const tone = meterTone(percent);
  const stroke = tone === 'hot' ? rose : tone === 'warn' ? amber : teal;
  const left =
    percent != null && Number.isFinite(percent)
      ? clampPct(100 - percent)
      : null;
  const r = 52;
  const c = 2 * Math.PI * r;
  const dash = (value / 100) * c;
  return (
    <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:items-center sm:gap-6 sm:text-left">
      <svg
        viewBox="0 0 128 128"
        className="h-24 w-24 shrink-0 -rotate-90 sm:h-28 sm:w-28"
        aria-hidden
        style={{ ['--ring-len' as string]: String(c) }}
      >
        <circle
          cx="64"
          cy="64"
          r={r}
          fill="none"
          stroke="rgba(15,118,110,0.12)"
          strokeWidth="10"
        />
        <circle
          className="ring-progress"
          cx="64"
          cy="64"
          r={r}
          fill="none"
          stroke={stroke}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${c}`}
          strokeDashoffset={0}
        />
      </svg>
      <div className="min-w-0">
        <div className="flex flex-wrap items-end justify-center gap-x-6 gap-y-3 sm:justify-start">
          <div>
            <p
              className={`font-mono text-3xl font-semibold tracking-tight tabular-nums sm:text-4xl ${
                tone === 'hot'
                  ? 'text-rose-900'
                  : tone === 'warn'
                    ? 'text-orange-800'
                    : 'text-zinc-900'
              }`}
            >
              {formatPct(percent)}
            </p>
            <p className="mt-0.5 text-xs font-medium uppercase tracking-wide text-zinc-400">
              Used
            </p>
          </div>
          <div>
            <p className="font-mono text-3xl font-semibold tracking-tight tabular-nums text-teal-900 sm:text-4xl">
              {formatPct(left)}
            </p>
            <p className="mt-0.5 text-xs font-medium uppercase tracking-wide text-zinc-400">
              Left
            </p>
          </div>
        </div>
        <p className="mt-2 text-sm text-zinc-500">
          {caption ?? 'Included usage this cycle'}
        </p>
      </div>
    </div>
  );
}

export function OnDemandStatus({
  on,
  percent,
  className = '',
}: {
  on: boolean;
  percent?: number | null;
  className?: string;
}) {
  if (!on) {
    return (
      <span className={`text-sm font-medium text-zinc-400 ${className}`}>
        Off
      </span>
    );
  }
  return (
    <div className={`min-w-0 ${className}`}>
      <p className="text-sm font-semibold text-teal-900">On</p>
      {percent != null ? (
        <p className="mt-0.5 font-mono text-xs tabular-nums text-zinc-500">
          {formatPct(percent)} of cap
        </p>
      ) : null}
    </div>
  );
}
