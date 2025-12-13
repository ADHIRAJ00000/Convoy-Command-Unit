// API Endpoints Configuration for HawkRoute
// All backend routes are defined here as constants

const API_VERSION = '/api';

// ============================================
// AUTHENTICATION ENDPOINTS
// ============================================
export const AUTH_ENDPOINTS = {
  REGISTER: `${API_VERSION}/auth/register`,
  LOGIN: `${API_VERSION}/auth/login`,
  LOGOUT: `${API_VERSION}/auth/logout`,
  REFRESH_TOKEN: `${API_VERSION}/auth/refresh-token`,
  ME: `${API_VERSION}/auth/me`,
  UPDATE_PROFILE: `${API_VERSION}/auth/profile`,
} as const;

// ============================================
// CONVOY ENDPOINTS
// ============================================
export const CONVOY_ENDPOINTS = {
  GET_ALL: `${API_VERSION}/convoys`,
  GET_BY_ID: (id: string) => `${API_VERSION}/convoys/${id}`,
  CREATE: `${API_VERSION}/convoys`,
  UPDATE: (id: string) => `${API_VERSION}/convoys/${id}`,
  DELETE: (id: string) => `${API_VERSION}/convoys/${id}`,
  GET_ACTIVE: `${API_VERSION}/convoys/active`,
  GET_BY_STATUS: (status: string) => `${API_VERSION}/convoys/status/${status}`,
} as const;

// ============================================
// SIMULATOR ENDPOINTS
// ============================================
export const SIMULATOR_ENDPOINTS = {
  START: `${API_VERSION}/simulator/start`,
  STOP: `${API_VERSION}/simulator/stop`,
  STATUS: (convoyId: string) => `${API_VERSION}/simulator/status/${convoyId}`,
  BLOCK_ROAD: `${API_VERSION}/simulator/events/block-road`,
  RAIN: `${API_VERSION}/simulator/events/rain`,
  CONGESTION: `${API_VERSION}/simulator/events/congestion`,
  LANDSLIDE: `${API_VERSION}/simulator/events/landslide`,
  AMBUSH: `${API_VERSION}/simulator/events/ambush`,
  MECHANICAL_FAILURE: `${API_VERSION}/simulator/events/mechanical-failure`,
  TRIGGER_EVENT: `${API_VERSION}/simulator/events/trigger`,
} as const;

// ============================================
// CHECKPOINT ENDPOINTS
// ============================================
export const CHECKPOINT_ENDPOINTS = {
  GET_BY_CONVOY: (convoyId: string) => `${API_VERSION}/checkpoints/${convoyId}`,
  CREATE: `${API_VERSION}/checkpoints`,
  UPDATE: (checkpointId: string) => `${API_VERSION}/checkpoints/${checkpointId}`,
  MARK_CLEARED: (checkpointId: string) => `${API_VERSION}/checkpoints/${checkpointId}/clear`,
} as const;

// ============================================
// EVENT LOG ENDPOINTS
// ============================================
export const EVENT_ENDPOINTS = {
  GET_ALL: `${API_VERSION}/events`,
  GET_BY_CONVOY: (convoyId: string) => `${API_VERSION}/events/convoy/${convoyId}`,
  GET_BY_ID: (eventId: string) => `${API_VERSION}/events/${eventId}`,
  CREATE: `${API_VERSION}/events`,
  GET_RECENT: `${API_VERSION}/events/recent`,
} as const;

// ============================================
// ALERT ENDPOINTS
// ============================================
export const ALERT_ENDPOINTS = {
  GET_ALL: `${API_VERSION}/alerts`,
  GET_BY_ID: (alertId: string) => `${API_VERSION}/alerts/${alertId}`,
  ACKNOWLEDGE: `${API_VERSION}/alerts/acknowledge`,
  GET_UNACKNOWLEDGED: `${API_VERSION}/alerts/unacknowledged`,
  GET_BY_CONVOY: (convoyId: string) => `${API_VERSION}/alerts/convoy/${convoyId}`,
} as const;

// ============================================
// OPTIMIZER ENDPOINTS
// ============================================
export const OPTIMIZER_ENDPOINTS = {
  GET_ALTERNATIVES: `${API_VERSION}/optimizer/alternatives`,
  REROUTE: `${API_VERSION}/optimizer/reroute`,
  OPTIMIZE: `${API_VERSION}/optimizer/optimize`,
} as const;

// ============================================
// ANALYTICS ENDPOINTS
// ============================================
export const ANALYTICS_ENDPOINTS = {
  GET_DASHBOARD: `${API_VERSION}/analytics/dashboard`,
  GET_CONVOY_STATS: (convoyId: string) => `${API_VERSION}/analytics/convoy/${convoyId}`,
  GET_PERFORMANCE: `${API_VERSION}/analytics/performance`,
} as const;

// ============================================
// PILOT VEHICLE ENDPOINTS
// ============================================
export const PILOT_VEHICLE_ENDPOINTS = {
  GET_ROUTE: (convoyId: string) => `${API_VERSION}/pilot-vehicle/${convoyId}/route`,
  GET_HAZARDS: (convoyId: string) => `${API_VERSION}/pilot-vehicle/${convoyId}/hazards`,
  GET_PROGRESS: (convoyId: string) => `${API_VERSION}/pilot-vehicle/${convoyId}/progress`,
  GET_CHECKPOINTS: (convoyId: string) => `${API_VERSION}/pilot-vehicle/${convoyId}/checkpoints`,
  STREAM: (convoyId: string) => `${API_VERSION}/pilot-vehicle/${convoyId}/stream`,
  GET_DATA: (convoyId: string) => `${API_VERSION}/pilot-vehicle/${convoyId}/data`,
} as const;

// ============================================
// UTILITY: BASE URL
// ============================================
export const getBaseURL = (): string => {
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
};

export const getWebSocketURL = (): string => {
  return process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000';
};
