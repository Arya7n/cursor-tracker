const SECRET_KEY_PATTERN =
  /(authorization|api[_-]?key|cookie|set-cookie|password|secret|token|session)/i;

const SECRET_VALUE_PATTERN =
  /\b(crsr_[A-Za-z0-9]+|cursor_[A-Za-z0-9_-]+|Bearer\s+\S+|Basic\s+[A-Za-z0-9+/=]+)/gi;

/**
 * Redact credentials from objects/headers before returning to clients or logs.
 */
export function redactSecrets<T>(value: T): T {
  return redactInternal(value) as T;
}

function redactInternal(value: unknown): unknown {
  if (value === null || value === undefined) {
    return value;
  }

  if (typeof value === 'string') {
    return value.replace(SECRET_VALUE_PATTERN, '[REDACTED]');
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => redactInternal(item));
  }

  if (typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
      if (SECRET_KEY_PATTERN.test(key)) {
        out[key] = '[REDACTED]';
      } else {
        out[key] = redactInternal(nested);
      }
    }
    return out;
  }

  return value;
}

export function sanitizeHeaders(
  headers: Record<string, string>,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(headers)) {
    if (SECRET_KEY_PATTERN.test(key)) {
      out[key] = '[REDACTED]';
    } else {
      out[key] = String(value).replace(SECRET_VALUE_PATTERN, '[REDACTED]');
    }
  }
  return out;
}

export function statusMessage(status: number | null): string {
  if (status === null) {
    return 'Request failed before a status was received';
  }
  if (status === 401) {
    return 'Authentication failed';
  }
  if (status === 403) {
    return 'Authenticated but not authorized';
  }
  if (status === 404) {
    return 'Endpoint unavailable';
  }
  if (status === 429) {
    return 'Rate limited';
  }
  if (status >= 500) {
    return 'Cursor server error';
  }
  if (status >= 200 && status < 300) {
    return 'OK';
  }
  return `HTTP ${status}`;
}

/**
 * Summarize JSON into a lightweight "shape" for discovery UI (keys + value types).
 */
export function responseShape(body: unknown, depth = 0): unknown {
  if (depth > 4) {
    return typeof body;
  }
  if (body === null) {
    return null;
  }
  if (Array.isArray(body)) {
    if (body.length === 0) {
      return [];
    }
    return [responseShape(body[0], depth + 1)];
  }
  if (typeof body === 'object') {
    const shape: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(body as Record<string, unknown>)) {
      if (SECRET_KEY_PATTERN.test(key)) {
        shape[key] = '[REDACTED]';
      } else if (typeof value === 'string') {
        shape[key] = 'string';
      } else if (typeof value === 'number') {
        shape[key] = 'number';
      } else if (typeof value === 'boolean') {
        shape[key] = 'boolean';
      } else if (value === null) {
        shape[key] = null;
      } else {
        shape[key] = responseShape(value, depth + 1);
      }
    }
    return shape;
  }
  return typeof body;
}
