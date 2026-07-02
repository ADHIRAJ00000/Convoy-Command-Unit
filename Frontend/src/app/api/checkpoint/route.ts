import { NextResponse } from 'next/server';
import type { CheckpointLogPayload } from '@/lib/api';

const BACKEND_BASE = process.env.BACKEND_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5050';

export async function POST(request: Request) {
  const payload = (await request.json()) as CheckpointLogPayload;

  try {
    const response = await fetch(`${BACKEND_BASE}/api/checkpoints`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        convoyId: payload.convoyId,
        checkpointId: payload.checkpointId,
        lat: payload.location.lat,
        lng: payload.location.lng,
        status: 'ARRIVED',
      }),
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      return NextResponse.json({ error: result.error || 'Failed to log checkpoint' }, { status: response.status || 400 });
    }

    return NextResponse.json({ ok: true, success: true, data: { checkpointId: payload.checkpointId } });
  } catch (error) {
    console.error('Failed to reach backend for checkpoint log', error);
    return NextResponse.json({ error: 'Backend unreachable' }, { status: 502 });
  }
}
