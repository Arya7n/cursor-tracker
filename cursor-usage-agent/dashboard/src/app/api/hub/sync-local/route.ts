import { ingestLocalDashboardHost } from '@/lib/local-sync';

/** Enroll this dashboard host as a developer device and ingest a live scan. */
export async function POST() {
  try {
    const local = await ingestLocalDashboardHost();
    return Response.json({ ok: true, ...local });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Local sync failed';
    return Response.json({ error: message }, { status: 500 });
  }
}
