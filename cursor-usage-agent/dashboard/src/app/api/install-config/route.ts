import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const enrollmentSecret =
    process.env.ENROLLMENT_SECRET ||
    process.env.CURSOR_USAGE_ENROLLMENT_SECRET ||
    '';

  if (!enrollmentSecret) {
    return NextResponse.json(
      { error: 'ENROLLMENT_SECRET is not configured on the hub.' },
      { status: 503 },
    );
  }

  return NextResponse.json({ enrollmentSecret });
}
