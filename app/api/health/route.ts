import { NextResponse } from 'next/server';

// Backs the Dockerfile HEALTHCHECK (#845) and any external uptime probe.
// Deliberately has no dependencies (DB, backend API) so it reflects whether
// this container can serve requests, not whether downstream services are up.
export async function GET() {
  return NextResponse.json({ status: 'ok' }, { status: 200 });
}
