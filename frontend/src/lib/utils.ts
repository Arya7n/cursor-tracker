import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function metricLabel(metric: {
  available: boolean;
  reason?: string;
  value?: unknown;
}): string {
  if (!metric.available) {
    return 'Not available through this API';
  }
  if (metric.value === undefined || metric.value === null) {
    return 'Available (see raw payload)';
  }
  if (typeof metric.value === 'number' || typeof metric.value === 'string') {
    return String(metric.value);
  }
  return 'Available (structured data)';
}
