import { employeeDetail, removeEmployee } from '@/lib/store';

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const data = await employeeDetail(id, { history: true });
  if (!data) {
    return Response.json({ error: 'Not found' }, { status: 404 });
  }
  return Response.json(data);
}

export async function DELETE(
  _req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  try {
    const result = await removeEmployee(id);
    return Response.json({ ok: true, email: result.email });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Remove failed';
    const status = message === 'Not found' ? 404 : 400;
    return Response.json({ error: message }, { status });
  }
}
