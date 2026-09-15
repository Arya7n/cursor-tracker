import { overview } from '@/lib/store';

export async function GET() {
  const data = await overview();
  return Response.json({ developers: data.developers });
}
