import { ingestLocalDashboardHost } from '@/lib/local-sync';
import { requestCompanySync } from '@/lib/store';

export async function POST() {
  try {
    const requested = await requestCompanySync();
    let local: Record<string, unknown> = { ok: false };
    try {
      local = { ok: true, ...(await ingestLocalDashboardHost()) };
    } catch (e) {
      local = {
        ok: false,
        error: e instanceof Error ? e.message : 'Local sync failed',
      };
    }
    return Response.json({
      ok: true,
      requestedAt: requested.requestedAt,
      deviceCount: requested.deviceCount,
      local,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Sync request failed';
    return Response.json({ error: message }, { status: 500 });
  }
}
