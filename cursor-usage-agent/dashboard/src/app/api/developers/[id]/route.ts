import { employeeDetail } from '@/lib/store';

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const data = await employeeDetail(id);
  if (!data) {
    return Response.json({ error: 'Not found' }, { status: 404 });
  }
  return Response.json(data);
}
