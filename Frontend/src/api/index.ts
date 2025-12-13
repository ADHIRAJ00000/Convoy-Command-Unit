// Main API Export - HawkRoute
// Central hub for all API functionality

// Export client and utilities
export { default as client } from './client';
export * from './endpoints';
export * from './tokenManager';
export * from './types';

// Export all services
export * from './services';

// Export WebSocket client
export { 
  getWebSocketClient, 
  subscribeToConvoyUpdates,
  subscribeToEvents,
  subscribeToAlerts,
  unsubscribeFromConvoyUpdates,
} from './websocket';

// Export error handler
export { handleApiError, isNetworkError } from './client';
