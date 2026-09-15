const SECRET_KEY =
  /^(authorization|api[_-]?key|cookie|set-cookie|password|secret|token|accessToken|refreshToken|hasAccessToken|hasRefreshToken|session)$/i;

const SECRET_VALUE =
  /\b(crsr_[A-Za-z0-9]+|cursor_[A-Za-z0-9_-]+|Bearer\s+\S+|Basic\s+[A-Za-z0-9+/=]+)/gi;

/** Strip credentials and token-related fields from objects before logging/reporting. */
export function redactSecrets<T>(value: T): T {
  return walk(value) as T;
}

function walk(value: unknown): unknown {
  if (value == null) return value;
  if (typeof value === 'string') {
    return value.replace(SECRET_VALUE, '[REDACTED]');
  }
  if (typeof value === 'number' || typeof value === 'boolean') return value;
  if (Array.isArray(value)) return value.map(walk);
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = SECRET_KEY.test(k) ? '[REDACTED]' : walk(v);
    }
    return out;
  }
  return value;
}

/** Deny-list of paths/patterns the agent must never read. */
export const FORBIDDEN_TARGETS = [
  'source code / workspace file contents',
  'Cursor chat / prompt history',
  'browser cookies',
  'session tokens / refresh tokens',
  'SQLite auth databases for token extraction',
  'SSH keys / .env secrets',
  'screenshots / keystrokes',
] as const;
