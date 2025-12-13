// Pilot Vehicle Types for HawkRoute

export type HazardType = 
  | 'BLOCKED_ROAD'
  | 'LANDSLIDE'
  | 'IED_DETECTION'
  | 'WEATHER_HAZARD'
  | 'HOSTILE_ZONE'
  | 'AMBUSH_RISK'
  | 'BRIDGE_DAMAGE'
  | 'FLOOD';

export type HazardSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type TerrainType = 
  | 'MOUNTAIN'
  | 'FOREST'
  | 'DESERT'
  | 'BRIDGE'
  | 'URBAN'
  | 'SNOW'
  | 'WATER';

export interface Checkpoint {
  id: string;
  name: string;
  position: { lat: number; lng: number };
  distance: number; // in km from start
  eta: string;
  status: 'PENDING' | 'REACHED' | 'PASSED';
  terrain: TerrainType;
}

export interface Hazard {
  id: string;
  type: HazardType;
  severity: HazardSeverity;
  position: { lat: number; lng: number };
  distance: number; // in km from start
  description: string;
  detectedAt: string;
  recommendedAction: string;
  isActive: boolean;
}

export interface PilotVehiclePosition {
  lat: number;
  lng: number;
  distance: number; // in km from start
  speed: number; // km/h
  heading: number; // degrees
  timestamp: string;
}

export interface RouteSegment {
  start: { lat: number; lng: number };
  end: { lat: number; lng: number };
  status: 'SAFE' | 'WARNING' | 'CRITICAL';
  terrain: TerrainType;
}

export interface PilotVehicleData {
  convoyId: string;
  convoyName: string;
  route: RouteSegment[];
  checkpoints: Checkpoint[];
  hazards: Hazard[];
  currentPosition: PilotVehiclePosition;
  totalDistance: number;
  startTime: string;
  estimatedArrival: string;
  metadata?: {
    usingMapboxRoute?: boolean;
    routePoints?: number;
  };
}

export interface TimelineEvent {
  id: string;
  type: 'CHECKPOINT' | 'HAZARD' | 'TERRAIN';
  distance: number;
  timestamp: string;
  data: Checkpoint | Hazard | { terrain: TerrainType };
}

export interface SimulationControl {
  isPlaying: boolean;
  speed: 0.5 | 1 | 2 | 4;
  currentTime: number;
}

export interface Alert {
  id: string;
  hazard: Hazard;
  timestamp: string;
  acknowledged: boolean;
}
