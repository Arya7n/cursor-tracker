import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

/**
 * Read-only access to Cursor IDE local auth metadata.
 * Access/refresh tokens are used in-memory only and MUST never be logged or written to reports.
 */
export interface LocalCursorIdentity {
  email: string | null;
  membershipType: string | null;
  subscriptionStatus: string | null;
  hasAccessToken: boolean;
}

function stateDbPath(): string | null {
  const base = process.env.APPDATA;
  if (!base) return null;
  const p = join(base, 'Cursor', 'User', 'globalStorage', 'state.vscdb');
  return existsSync(p) ? p : null;
}

function openDb(): DatabaseSync | null {
  const path = stateDbPath();
  if (!path) return null;
  return new DatabaseSync(path, { readOnly: true });
}

function readItem(db: DatabaseSync, key: string): string | null {
  try {
    const row = db.prepare('SELECT value FROM ItemTable WHERE key = ?').get(key) as
      | { value: unknown }
      | undefined;
    if (!row?.value) return null;
    let v = String(row.value);
    // Values are sometimes JSON-encoded strings
    if (v.startsWith('"') && v.endsWith('"')) {
      try {
        v = JSON.parse(v) as string;
      } catch {
        v = v.slice(1, -1);
      }
    }
    return v || null;
  } catch {
    return null;
  }
}

export function readLocalIdentity(): LocalCursorIdentity {
  const db = openDb();
  if (!db) {
    return {
      email: null,
      membershipType: null,
      subscriptionStatus: null,
      hasAccessToken: false,
    };
  }
  try {
    const token = readItem(db, 'cursorAuth/accessToken');
    return {
      email: readItem(db, 'cursorAuth/cachedEmail'),
      membershipType: readItem(db, 'cursorAuth/stripeMembershipType'),
      subscriptionStatus: readItem(db, 'cursorAuth/stripeSubscriptionStatus'),
      hasAccessToken: Boolean(token),
    };
  } finally {
    db.close();
  }
}

/**
 * Returns the IDE access token for a single in-process usage request.
 * Caller must not persist, log, or include this in reports.
 */
export function readAccessTokenEphemeral(): string | null {
  const db = openDb();
  if (!db) return null;
  try {
    return readItem(db, 'cursorAuth/accessToken');
  } finally {
    db.close();
  }
}
