export const ADMIN_COOKIE = 'cu_admin_route';

export function adminRouteSecret(): string {
  return (process.env.ADMIN_ROUTE_SECRET || '').trim();
}

export function isAdminSecret(value: string | undefined | null): boolean {
  const expected = adminRouteSecret();
  return Boolean(expected) && value === expected;
}

export function adminBasePath(secret: string) {
  return `/ops/${secret}`;
}
