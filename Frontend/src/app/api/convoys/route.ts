import { NextResponse } from 'next/server';
import { normalizeConvoy, denormalizeRoute } from '@/lib/convoyAdapter';

const BACKEND_BASE = process.env.BACKEND_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5050';

export async function GET() {
  try {
    const response = await fetch(`${BACKEND_BASE}/api/convoys`, { cache: 'no-store' });
    const payload = await response.json();

    if (!response.ok || !payload.success) {
      return NextResponse.json({ error: payload.error || 'Failed to fetch convoys' }, { status: response.status || 502 });
    }

    return NextResponse.json(payload.data.map(normalizeConvoy));
  } catch (error) {
    console.error('Failed to reach backend for convoys', error);
    return NextResponse.json({ error: 'Backend unreachable' }, { status: 502 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const backendBody = {
      ...body,
      currentPosition: body.currentPosition ?? body.origin,
      unitType: body.unitType ?? 'LOGISTICS',
      assignedRoute: body.assignedRoute ? denormalizeRoute(body.assignedRoute) : undefined,
    };

    const response = await fetch(`${BACKEND_BASE}/api/convoys`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(backendBody),
    });

    const payload = await response.json();

    if (!response.ok || !payload.success) {
      return NextResponse.json({ error: payload.error || 'Failed to create convoy' }, { status: response.status || 400 });
    }

    return NextResponse.json(normalizeConvoy(payload.data), { status: 201 });
  } catch (error) {
    console.error('Failed to reach backend for convoy creation', error);
    return NextResponse.json({ error: 'Backend unreachable' }, { status: 502 });
  }
}
