import { NextResponse } from 'next/server';
import type { Convoy } from '@/types/convoy';
import type { Route, RouteAlternative, RouteSegmentStatus } from '@/types/route';
import convoys from '@/data/mock/convoys.json';

const BACKEND_BASE = process.env.BACKEND_API_URL || process.env.NEXT_PUBLIC_API_URL;

const buildPolylineFromSegments = (segments: any[] | undefined, fallback: Route): [number, number][] => {
  if (!segments || segments.length === 0) {
    return fallback.polyline;
  }

  const points: [number, number][] = [];
  segments.forEach((segment, index) => {
    const start = segment.start || segment.origin;
    const end = segment.end || segment.destination;

    if (index === 0) {
      const startLng = start?.lng ?? fallback.polyline[0]?.[0];
      const startLat = start?.lat ?? fallback.polyline[0]?.[1];
      if (startLng !== undefined && startLat !== undefined) {
        points.push([startLng, startLat]);
      }
    }

    const lastPoint = points.length ? points[points.length - 1] : undefined;
    const lastFallback = fallback.polyline.length ? fallback.polyline[fallback.polyline.length - 1] : undefined;
    const endLng = end?.lng ?? lastPoint?.[0] ?? lastFallback?.[0];
    const endLat = end?.lat ?? lastPoint?.[1] ?? lastFallback?.[1];
    if (endLng !== undefined && endLat !== undefined) {
      points.push([endLng, endLat]);
    }
  });

  return points.length ? points : fallback.polyline;
};

const normalizeRoute = (rawRoute: any, baseline: Route): Route => {
  const candidatePolyline = rawRoute?.polyline ?? buildPolylineFromSegments(rawRoute?.segments, baseline);
  const polyline = candidatePolyline && candidatePolyline.length > 2 ? candidatePolyline : baseline.polyline;

  const segments = (rawRoute?.segments || []).map((segment: any, index: number) => {
    const lastPoint = polyline.length ? polyline[polyline.length - 1] : undefined;
    const coords: [number, number][] = segment.coordinates ?? [
      [segment.start?.lng ?? polyline[index]?.[0] ?? polyline[0]?.[0], segment.start?.lat ?? polyline[index]?.[1] ?? polyline[0]?.[1]],
      [segment.end?.lng ?? polyline[index + 1]?.[0] ?? lastPoint?.[0], segment.end?.lat ?? polyline[index + 1]?.[1] ?? lastPoint?.[1]],
    ];

    return {
      id: segment.id ?? `seg-${index}`,
      coordinates: coords,
      terrain: (segment.terrain ?? 'URBAN').toUpperCase(),
      difficulty: (segment.difficulty ?? 'MEDIUM').toUpperCase(),
      recommendedSpeedKmph: segment.recommendedSpeedKmph ?? 50,
      riskLevel: segment.riskLevel ?? 0.35,
      status: ((segment.status ?? 'CLEAR') as RouteSegmentStatus),
    } satisfies Route['segments'][number];
  });

  const normalizedCheckpoints = (rawRoute?.checkpoints || []).length
    ? (rawRoute?.checkpoints || []).map((checkpoint: any, idx: number) => ({
        id: checkpoint.id ?? `cp-${idx}`,
        name: checkpoint.name ?? 'Checkpoint',
        status: checkpoint.status ?? 'PENDING',
        eta: checkpoint.eta ?? new Date().toISOString(),
        loggedAt: checkpoint.loggedAt,
        location: checkpoint.position || checkpoint.location,
      }))
    : baseline.checkpoints || [];

  return {
    id: rawRoute?.id ?? baseline.id,
    name: rawRoute?.name ?? baseline.name ?? 'Alternative Route',
    polyline,
    etaHours: rawRoute?.estimatedDurationHours ?? rawRoute?.etaHours ?? baseline.etaHours ?? 10,
    distanceKm: rawRoute?.totalDistanceKm ?? rawRoute?.distanceKm ?? baseline.distanceKm ?? 100,
    riskScore: rawRoute?.riskScore ?? Math.round((rawRoute?.optimizationScore ?? 0.5) * 100),
    segments: segments.length ? segments : baseline.segments,
    checkpoints: normalizedCheckpoints,
  } satisfies Route;
};

const fallbackAlternatives = (baseline: Route): RouteAlternative[] => {
  const clones: RouteAlternative[] = [
    {
      strategyName: 'FASTEST',
      strategyIcon: '⚡',
      color: '#ef4444',
      route: {
        ...baseline,
        etaHours: Math.max(1, baseline.etaHours - 0.3),
        distanceKm: Math.max(1, baseline.distanceKm - 5),
        riskScore: Math.min(100, baseline.riskScore + 8),
      },
      display: { primaryStroke: '#ef4444', secondaryStroke: '#fecaca', isFastest: true },
      comparison: { delayMinutes: 0, distanceDeltaKm: 0, timeVsFastest: 0, distanceVsFastest: 0 },
    },
    {
      strategyName: 'BALANCED',
      strategyIcon: '⚖️',
      color: '#eab308',
      route: {
        ...baseline,
        etaHours: baseline.etaHours + 0.2,
        distanceKm: baseline.distanceKm + 3,
        riskScore: Math.max(0, baseline.riskScore - 5),
      },
      display: { primaryStroke: '#eab308', secondaryStroke: '#fef08a', isFastest: false },
      comparison: { delayMinutes: 12, distanceDeltaKm: 3, timeVsFastest: 5, distanceVsFastest: 2 },
    },
    {
      strategyName: 'SAFEST',
      strategyIcon: '🛡️',
      color: '#22c55e',
      route: {
        ...baseline,
        etaHours: baseline.etaHours + 0.45,
        distanceKm: baseline.distanceKm + 7,
        riskScore: Math.max(0, baseline.riskScore - 12),
      },
      display: { primaryStroke: '#22c55e', secondaryStroke: '#bbf7d0', isFastest: false },
      comparison: { delayMinutes: 28, distanceDeltaKm: 7, timeVsFastest: 12, distanceVsFastest: 4 },
    },
  ];

  return clones;
};

export async function POST(request: Request) {
  const body = await request.json();
  const convoyList = convoys as unknown as Convoy[];
  const convoy = convoyList.find((entry) => entry.id === body.convoyId);

  if (!convoy || !convoy.assignedRoute) {
    return NextResponse.json({ success: false, error: 'Convoy not found' }, { status: 404 });
  }

  const destinationOverride = body.destinationOverride
    ? { ...convoy.destination, ...body.destinationOverride }
    : convoy.destination;

  const baseline: Route = {
    ...convoy.assignedRoute,
    polyline: convoy.assignedRoute.polyline,
    etaHours: convoy.assignedRoute.etaHours,
    distanceKm: convoy.assignedRoute.distanceKm,
    riskScore: convoy.assignedRoute.riskScore,
  };

  if (BACKEND_BASE) {
    try {
      const response = await fetch(`${BACKEND_BASE}/api/optimizer/route/alternatives`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          origin: convoy.origin,
          destination: destinationOverride,
          waypoints: [],
        }),
      });

      if (response.ok) {
        const payload = await response.json();
        const alternatives = payload?.data?.alternatives as RouteAlternative[] | undefined;

        if (alternatives?.length) {
          const normalized = alternatives.map((alt, index) => ({
            ...alt,
            route: normalizeRoute(alt.route, baseline),
            display: {
              primaryStroke: alt.display?.primaryStroke || alt.color || '#3b82f6',
              secondaryStroke: alt.display?.secondaryStroke || '#bfdbfe',
              isFastest: alt.display?.isFastest ?? alt.strategyName === 'FASTEST',
            },
            comparison: alt.comparison ?? { delayMinutes: index === 0 ? 0 : (alt.metrics?.estimatedDurationHours ?? baseline.etaHours) * 60 },
          }));

          return NextResponse.json({ success: true, data: { alternatives: normalized, recommendation: payload?.data?.recommendation, metadata: payload?.data?.metadata } });
        }
      }
    } catch (error) {
      console.warn('Failed to fetch optimizer alternatives from backend', error);
    }
  }

  // Fallback demo alternatives derived from current route
  const fallback = fallbackAlternatives(baseline);
  return NextResponse.json({ success: true, data: { alternatives: fallback } });
}
