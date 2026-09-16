const COOKIE_NAME = 'cu_admin_session';
const MAX_AGE_SEC = 60 * 60 * 24 * 7; // 7 days

function sessionSecret(): string {
  // Prefer an explicit secret so Edge middleware and Node routes always match.
  return (
    process.env.SESSION_SECRET ||
    process.env.ENROLLMENT_SECRET ||
    process.env.ADMIN_PASSWORD ||
    'cursor-usage-dev-session'
  );
}

function toBase64Url(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]!);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function fromBase64Url(s: string): Uint8Array {
  const padded = s.replace(/-/g, '+').replace(/_/g, '/');
  const pad = padded.length % 4 === 0 ? '' : '='.repeat(4 - (padded.length % 4));
  const binary = atob(padded + pad);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

async function hmacSign(payload: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(payload),
  );
  return toBase64Url(sig);
}

async function hmacVerify(
  payload: string,
  signature: string,
  secret: string,
): Promise<boolean> {
  const expected = await hmacSign(payload, secret);
  if (expected.length !== signature.length) return false;
  let ok = 0;
  for (let i = 0; i < expected.length; i++) {
    ok |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  }
  return ok === 0;
}

export function adminCredentialsConfigured(): boolean {
  return Boolean(process.env.ADMIN_USER && process.env.ADMIN_PASSWORD);
}

export function validateAdminCredentials(
  username: string,
  password: string,
): boolean {
  const user = process.env.ADMIN_USER;
  const pass = process.env.ADMIN_PASSWORD;
  if (!user || !pass) return false;
  return username === user && password === pass;
}

export async function createSessionToken(username: string): Promise<string> {
  const exp = Math.floor(Date.now() / 1000) + MAX_AGE_SEC;
  // Avoid extra dots in the payload so token.split('.') stays unambiguous.
  const payload = `${encodeURIComponent(username)}|${exp}`;
  const sig = await hmacSign(payload, sessionSecret());
  return `${toBase64Url(new TextEncoder().encode(payload))}.${sig}`;
}

export async function verifySessionToken(
  token: string | undefined | null,
): Promise<{ username: string } | null> {
  if (!token) return null;
  const dot = token.indexOf('.');
  if (dot <= 0 || dot === token.length - 1) return null;
  const payloadB64 = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  try {
    const payload = new TextDecoder().decode(fromBase64Url(payloadB64));
    const ok = await hmacVerify(payload, sig, sessionSecret());
    if (!ok) return null;
    const sep = payload.lastIndexOf('|');
    if (sep <= 0) return null;
    const username = decodeURIComponent(payload.slice(0, sep));
    const exp = Number(payload.slice(sep + 1));
    if (!username || !Number.isFinite(exp) || exp * 1000 < Date.now()) return null;
    if (process.env.ADMIN_USER && username !== process.env.ADMIN_USER) return null;
    return { username };
  } catch {
    return null;
  }
}

export function sessionCookieOptions(token: string, secure: boolean) {
  return {
    httpOnly: true,
    secure,
    sameSite: 'lax' as const,
    path: '/',
    maxAge: MAX_AGE_SEC,
  };
}

export function clearSessionCookieOptions(secure: boolean) {
  return {
    httpOnly: true,
    secure,
    sameSite: 'lax' as const,
    path: '/',
    maxAge: 0,
  };
}

export { COOKIE_NAME };
