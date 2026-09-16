import { employeeDetail } from '@/lib/store';
import { cookies } from 'next/headers';
import { ADMIN_COOKIE, isAdminSecret } from '@/lib/admin';

export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const jar = await cookies();
  const fromHeader = req.headers.get('x-admin-route-secret');
  const fromCookie = jar.get(ADMIN_COOKIE)?.value;
  if (!isAdminSecret(fromHeader) && !isAdminSecret(fromCookie)) {
    return Response.json({ error: 'Not found' }, { status: 404 });
  }
  const { id } = await context.params;
  const data = await employeeDetail(id, { history: true });
  if (!data) {
    return Response.json({ error: 'Not found' }, { status: 404 });
  }
  return Response.json(data);
}
