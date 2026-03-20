// API Type Definitions for HawkRoute
// Generated: 2025-12-12

// ============================================
// AUTHENTICATION TYPES
// ============================================

export interface LoginDTO {
  email: string;
  password: string;
}

export interface RegisterDTO {
  name: string;
  email: string;
  password: string;
  role?: 'COMMANDER' | 'OPERATOR' | 'VIEWER';
}

export interface AuthResponse {
  success: boolean;
  data: {
    user: User;
    accessToken: string;
    refreshToken: string;
  };
  message?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'COMMANDER' | 'OPERATOR' | 'VIEWER';
  createdAt: string;
  updatedAt: string;
}

export interface RefreshTokenResponse {
  success: boolean;
  data: {
    accessToken: string;
  };
}

// ============================================
// CONVOY TYPES
// ============================================

export interface Location {
  lat: number;
  lng: number;
  name?: string;
}

export interface ConvoyDTO {
  name: string;
  origin: Location;
  destination: Location;
  priority: 'ALPHA' | 'BRAVO' | 'CHARLIE' | 'DELTA';
  vehicleCount: number;
  speedKmph: number;
  unitType?: 'ARMY' | 'SUPPLY' | 'MEDICAL' | 'FUEL';
}

export interface Convoy extends ConvoyDTO {
  id: string;
  status: 'PLANNED1' | 'EN_ROUTE' | 'DELAYED' | 'COMPLETED' | 'BLOCKED';
  currentPosition?: Location;
  assignedRoute?: Route;
  etaHours?: number;
  lastUpdated: string;
  createdAt: string;
}

export interface Route {
  id: string;
  name: string;
  polyline: [number, number][]; // [lng, lat]
  etaHours: number;
  distanceKm: number;
  riskScore: number;
  segments: RouteSegment[];
  checkpoints: Checkpoint[];
}

export interface RouteSegment {
  id: string;
  coordinates: [number, number][];
  terrain: 'URBAN' | 'MOUNTAIN' | 'DESERT' | 'FOREST' | 'COASTAL';
  difficulty: 'LOW' | 'MEDIUM' | 'HIGH';
  recommendedSpeedKmph: number;
  riskLevel: number;
  status: 'CLEAR' | 'HIGH_RISK' | 'BLOCKED';
}

export interface Checkpoint {
  id: string;
  name: string;
  status: 'PENDING' | 'CLEARED';
  eta: string;
  loggedAt?: string;
  location?: Location;
}

// ============================================
// SIMULATOR TYPES
// ============================================

export interface SimulatorStartDTO {
  convoyId: string;
  speedMultiplier?: number;
}

export interface SimulatorStopDTO {
  convoyId: string;
}

export interface SimulatorStatus {
  convoyId: string;
  isRunning: boolean;
  currentPosition?: Location;
  speed: number;
  lastUpdate: string;
}

export interface SimulatorEventDTO {
  convoyId: string;
  eventType: 'BLOCK_ROAD' | 'RAIN' | 'CONGESTION' | 'LANDSLIDE' | 'AMBUSH' | 'MECHANICAL_FAILURE';
  location: Location;
  severity?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description?: string;
}

// ============================================
// EVENT & LOG TYPES
// ============================================

export interface EventLog {
  id: string;
  convoyId: string;
  type: 'CHECKPOINT' | 'REROUTE' | 'DELAY' | 'INCIDENT' | 'STATUS_CHANGE';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  message: string;
  location?: Location;
  timestamp: string;
  metadata?: Record<string, any>;
}

export interface EventLogQuery {
  convoyId?: string;
  type?: string;
  severity?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}

// ============================================
// ALERT TYPES
// ============================================

export interface Alert {
  id: string;
  convoyId: string;
  type: 'RISK' | 'DELAY' | 'ROUTE_CHANGE' | 'EMERGENCY' | 'WEATHER';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  title: string;
  message: string;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: string;
  createdAt: string;
  metadata?: Record<string, any>;
}

export interface AcknowledgeAlertDTO {
  alertId: string;
  userId: string;
  notes?: string;
}

// ============================================
// OPTIMIZER TYPES
// ============================================

export interface OptimizerRequestDTO {
  convoyId: string;
  destinationOverride?: Location;
  preferences?: {
    prioritize?: 'SAFETY' | 'SPEED' | 'BALANCED';
    avoidTerrain?: string[];
    maxRiskScore?: number;
  };
}

export interface RouteAlternative {
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
    riskLevel?: {
      level: string;
      stars?: number;
      color?: string;
    };
  };
  recommendation?: {
    title?: string;
    pros?: string[];
    cons?: string[];
  };
}

export interface OptimizerResponse {
  success: boolean;
  data: {
    convoyId: string;
    alternatives: RouteAlternative[];
    recommendedRoute?: string;
  };
  message?: string;
}

// ============================================
// API RESPONSE WRAPPERS
// ============================================

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: string[];
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface ApiError {
  success: false;
  message: string;
  errors?: string[];
  statusCode?: number;
}
