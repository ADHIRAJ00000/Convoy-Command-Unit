export type RouteSegmentStatus = 'CLEAR' | 'HIGH_RISK' | 'BLOCKED';

export type RouteSegment = {
  id: string;
  coordinates: [number, number][]; // [lng, lat]
  terrain: 'URBAN' | 'MOUNTAIN' | 'DESERT' | 'FOREST' | 'COASTAL';
  difficulty: 'LOW' | 'MEDIUM' | 'HIGH';
  recommendedSpeedKmph: number;
  riskLevel: number; // 0-1 scale
  status: RouteSegmentStatus;
};

export type Checkpoint = {
  id: string;
  name: string;
  status: 'PENDING' | 'CLEARED';
  eta: string; // ISO timestamp
  loggedAt?: string; // ISO timestamp when convoy reports in
  location?: { lat: number; lng: number }; // Real-life coordinates from the route
};

export type Route = {
  id: string;
  name: string;
  polyline: [number, number][]; // Mapbox [lng, lat]
  etaHours: number;
  distanceKm: number;
  riskScore: number; // aggregated 0-100 for quick UI badges
  segments: RouteSegment[];
  checkpoints: Checkpoint[];
};

export type RouteAlternative = {
  strategyName: string;
  strategyIcon: string;
  description?: string;
  color?: string;
  priority?: string;
  route: Route;
  display?: {
    primaryStroke?: string;
    secondaryStroke?: string;
    isFastest?: boolean;
  };
  comparison?: {
    distanceVsFastest?: number;
    timeVsFastest?: number;
    distanceDeltaKm?: number;
    delayMinutes?: number;
  };
  metrics?: {
    totalDistanceKm?: number;
    estimatedDurationHours?: number;
    segmentCount?: number;
    checkpointCount?: number;
    optimizationScore?: number;
    riskLevel?: { level: string; stars?: number; color?: string };
  };
  recommendation?: {
    title?: string;
    pros?: string[];
    cons?: string[];
  };
};
