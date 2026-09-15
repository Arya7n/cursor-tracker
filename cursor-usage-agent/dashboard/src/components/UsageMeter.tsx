import {
  clampPct,
  formatPct,
} from '@/lib/format';

const teal = '#0d9488';

export function UsageBar({
  percent,
  className = '',
}: {
  percent: number | null | undefined;
  className?: string;
}) {
  const width = clampPct(percent);
  return (
    <div className={`min-w-0 w-full ${className}`}>
      <span className="font-mono text-sm font-semibold tabular-nums text-zinc-800">
        {formatPct(percent)}
      </span>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-zinc-100">
        <div
          className="h-full rounded-full bg-teal-600 transition-[width] duration-500"
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
  const r = 52;
  const c = 2 * Math.PI * r;
  const dash = (value / 100) * c;
  return (
    <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:items-center sm:gap-5 sm:text-left">
      <svg viewBox="0 0 128 128" className="h-24 w-24 shrink-0 -rotate-90 sm:h-28 sm:w-28" aria-hidden>
        <circle
          cx="64"
          cy="64"
          r={r}
          fill="none"
          stroke="#e4e4e7"
          strokeWidth="10"
        />
        <circle
          cx="64"
          cy="64"
          r={r}
          fill="none"
          stroke={teal}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${c}`}
        />
      </svg>
      <div>
        <p className="font-mono text-3xl font-semibold tabular-nums text-zinc-900 sm:text-4xl">
          {formatPct(percent)}
        </p>
        <p className="mt-1 text-sm text-zinc-500">
          {caption ?? 'Included usage this cycle'}
        </p>
      </div>
    </div>
  );
}

export function Sparkline({
  points,
  className = '',
}: {
  points: number[];
  className?: string;
}) {
  if (points.length < 2) {
    return (
      <p className="text-sm text-zinc-400">
        Not enough syncs yet for a trend.
      </p>
    );
  }
  const w = 240;
  const h = 56;
  const d = points
    .map((p, i) => {
      const x = (i / (points.length - 1)) * w;
      const y = h - 4 - (clampPct(p) / 100) * (h - 8);
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className={`h-14 w-full ${className}`}
      role="img"
      aria-label="Usage over recent syncs"
    >
      <path
        d={d}
        fill="none"
        stroke={teal}
        strokeWidth="2.25"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}
