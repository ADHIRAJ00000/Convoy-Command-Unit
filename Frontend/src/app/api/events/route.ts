import { NextResponse } from 'next/server';
import type { EventRequestPayload } from '@/lib/api';

const BACKEND_BASE = process.env.BACKEND_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5050';

const TYPE_MAP: Record<string, string> = {
  BLOCK_ROAD: 'BLOCKAGE',
  RAINFALL: 'WEATHER_ALERT',
  LANDSLIDE: 'BLOCKAGE',
  CONGESTION: 'DELAY',
  CHECKPOINT: 'CHECKPOINT_LOG',
};

const SEVERITY_MAP: Record<string, string> = {
  LOW: 'INFO',
  MEDIUM: 'WARNING',
  HIGH: 'CRITICAL',
};

const TITLE_MAP: Record<string, string> = {
  BLOCK_ROAD: 'Road Blockage Reported',
  RAINFALL: 'Rainfall Alert',
  LANDSLIDE: 'Landslide Reported',
  CONGESTION: 'Convoy Delay',
  CHECKPOINT: 'Checkpoint Update',
};

export async function POST(request: Request) {
  const payload = (await request.json()) as EventRequestPayload;

  try {
    const response = await fetch(`${BACKEND_BASE}/api/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: TYPE_MAP[payload.type] || 'INCIDENT',
        convoyId: payload.convoyId || 'UNKNOWN',
        severity: SEVERITY_MAP[payload.severity] || 'INFO',
        title: TITLE_MAP[payload.type] || 'Operational Event',
        description: payload.notes,
      }),
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      return NextResponse.json({ error: result.error || 'Failed to create event' }, { status: response.status || 400 });
    }

    const event = {
      id: result.data.id,
      type: payload.type,
      triggeredAt: result.data.timestamp,
      convoyId: result.data.convoyId,
      payload: {
        severity: payload.severity,
        notes: result.data.description,
      },
    };

    return NextResponse.json(event, { status: 201 });
  } catch (error) {
    console.error('Failed to reach backend for event creation', error);
    return NextResponse.json({ error: 'Backend unreachable' }, { status: 502 });
  }
}
