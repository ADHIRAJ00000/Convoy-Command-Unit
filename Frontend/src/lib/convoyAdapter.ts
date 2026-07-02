import type { Convoy } from '@/types/convoy';
import type { Route, RouteSegment, Checkpoint, RouteSegmentStatus } from '@/types/route';

const CONDITION_TO_STATUS: Record<string, RouteSegmentStatus> = {
  CLEAR: 'CLEAR',
  RAIN: 'HIGH_RISK',
  SNOW: 'HIGH_RISK',
  FOG: 'HIGH_RISK',
  LANDSLIDE: 'BLOCKED',
  BLOCKED: 'BLOCKED',
};

const DIFFICULTY_RISK: Record<string, number> = {
  LOW: 0.2,
  MEDIUM: 0.4,
  HIGH: 0.6,
  EXTREME: 0.85,
};

const CHECKPOINT_STATUS: Record<string, Checkpoint['status']> = {
  PENDING: 'PENDING',
  DELAYED: 'PENDING',
  ARRIVED: 'CLEARED',
  DEPARTED: 'CLEARED',
};

// Backend Convoy documents nest a raw sub-schema (segments with start/end,
// checkpoints with position, no polyline) that doesn't match the frontend's
// Route contract used by the map/timeline components. This adapts one to the other.
export function normalizeConvoy(raw: any): Convoy {
  const assignedRoute = raw.assignedRoute ? buildRoute(raw) : undefined;

  return {
    id: raw.id,
    name: raw.name,
    origin: raw.origin,
    destination: raw.destination,
    currentPosition: raw.currentPosition,
    speedKmph: raw.speedKmph ?? 0,
    priority: raw.priority,
    vehicleCount: raw.vehicleCount,
    unitType: raw.unitType,
    status: raw.status,
    lastUpdated: raw.lastUpdated,
    etaHours: raw.etaHours,
    assignedRoute,
  };
}

function buildRoute(raw: any): Route | undefined {
  const rawSegments = raw.assignedRoute?.segments ?? [];
  const rawCheckpoints = raw.assignedRoute?.checkpoints ?? [];

  const segments: RouteSegment[] = rawSegments.map((segment: any, index: number) => ({
    id: segment.id ?? `seg-${raw.id}-${index}`,
    coordinates: [
      [segment.start?.lng, segment.start?.lat],
      [segment.end?.lng, segment.end?.lat],
    ],
    terrain: segment.terrain ?? 'PLAIN',
    difficulty: segment.difficulty ?? 'MEDIUM',
    recommendedSpeedKmph: segment.recommendedSpeedKmph ?? 50,
    riskLevel: DIFFICULTY_RISK[segment.difficulty] ?? 0.4,
    status: CONDITION_TO_STATUS[segment.conditions] ?? 'CLEAR',
  }));

  const checkpoints: Checkpoint[] = rawCheckpoints.map((checkpoint: any) => ({
    id: checkpoint.id,
    name: checkpoint.name,
    status: CHECKPOINT_STATUS[checkpoint.status] ?? 'PENDING',
    eta: checkpoint.eta,
    loggedAt: checkpoint.ata,
    location: checkpoint.position,
  }));

  const polyline: [number, number][] = segments.length
    ? [segments[0].coordinates[0], ...segments.map((segment) => segment.coordinates[1])]
    : raw.origin && raw.destination
      ? [[raw.origin.lng, raw.origin.lat], [raw.destination.lng, raw.destination.lat]]
      : [];

  if (!polyline.length) return undefined;

  const averageRisk = segments.length
    ? segments.reduce((sum, segment) => sum + segment.riskLevel, 0) / segments.length
    : 0.3;

  return {
    id: `route-${raw.id}`,
    name: `${raw.origin?.name ?? 'Origin'} → ${raw.destination?.name ?? 'Destination'}`,
    polyline,
    etaHours: raw.assignedRoute?.estimatedDurationHours ?? raw.etaHours ?? 0,
    distanceKm: raw.assignedRoute?.totalDistanceKm ?? 0,
    riskScore: Math.round(averageRisk * 100),
    segments,
    checkpoints,
  };
}

const STATUS_TO_CONDITION: Record<RouteSegmentStatus, string> = {
  CLEAR: 'CLEAR',
  HIGH_RISK: 'RAIN',
  BLOCKED: 'BLOCKED',
};

const TERRAIN_FALLBACK: Record<string, string> = {
  COASTAL: 'PLAIN',
};

const CHECKPOINT_STATUS_REVERSE: Record<Checkpoint['status'], string> = {
  PENDING: 'PENDING',
  CLEARED: 'ARRIVED',
};

// Converts a frontend-shaped Route (e.g. freshly fetched from Mapbox client-side)
// into the raw sub-schema the backend Convoy model expects, for convoy creation.
export function denormalizeRoute(route: Route) {
  return {
    segments: route.segments.map((segment, index) => ({
      id: segment.id,
      index,
      start: { lat: segment.coordinates[0][1], lng: segment.coordinates[0][0] },
      end: { lat: segment.coordinates[segment.coordinates.length - 1][1], lng: segment.coordinates[segment.coordinates.length - 1][0] },
      terrain: TERRAIN_FALLBACK[segment.terrain] ?? segment.terrain,
      recommendedSpeedKmph: segment.recommendedSpeedKmph,
      conditions: STATUS_TO_CONDITION[segment.status] ?? 'CLEAR',
      difficulty: segment.difficulty,
    })),
    checkpoints: route.checkpoints.map((checkpoint) => ({
      id: checkpoint.id,
      name: checkpoint.name,
      position: checkpoint.location,
      eta: checkpoint.eta,
      status: CHECKPOINT_STATUS_REVERSE[checkpoint.status] ?? 'PENDING',
    })),
    totalDistanceKm: route.distanceKm,
    estimatedDurationHours: route.etaHours,
  };
}
