import { NextResponse } from 'next/server';
import { normalizeConvoy, denormalizeRoute } from '@/lib/convoyAdapter';

const BACKEND_BASE = process.env.BACKEND_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5050';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    const response = await fetch(`${BACKEND_BASE}/api/convoys/${id}`, { cache: 'no-store' });
    const payload = await response.json();

    if (!response.ok || !payload.success) {
      return NextResponse.json({ error: payload.error || 'Convoy not found' }, { status: response.status || 404 });
    }

    return NextResponse.json(normalizeConvoy(payload.data));
  } catch (error) {
    console.error('Failed to reach backend for convoy detail', error);
    return NextResponse.json({ error: 'Backend unreachable' }, { status: 502 });
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    const body = await request.json();
    const backendBody = {
      ...body,
      assignedRoute: body.assignedRoute ? denormalizeRoute(body.assignedRoute) : undefined,
    };

    const response = await fetch(`${BACKEND_BASE}/api/convoys/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(backendBody),
    });
    const payload = await response.json();

    if (!response.ok || !payload.success) {
      return NextResponse.json({ error: payload.error || 'Failed to update convoy' }, { status: response.status || 400 });
    }

    return NextResponse.json(normalizeConvoy(payload.data));
  } catch (error) {
    console.error('Failed to reach backend for convoy update', error);
    return NextResponse.json({ error: 'Backend unreachable' }, { status: 502 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    const response = await fetch(`${BACKEND_BASE}/api/convoys/${id}`, { method: 'DELETE' });
    const payload = await response.json();

    if (!response.ok || !payload.success) {
      return NextResponse.json({ error: payload.error || 'Failed to delete convoy' }, { status: response.status || 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to reach backend for convoy deletion', error);
    return NextResponse.json({ error: 'Backend unreachable' }, { status: 502 });
  }
}
