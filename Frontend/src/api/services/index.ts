// Service Index - Central Export for HawkRoute API Services
// Import all services from this file for cleaner imports

export { default as authService } from './authService';
export { default as convoyService } from './convoyService';
export { default as simulatorService } from './simulatorService';
export { default as checkpointService } from './checkpointService';
export { default as eventService } from './eventService';
export { default as alertService } from './alertService';
export { default as optimizerService } from './optimizerService';

// Re-export for convenience
export {
  authService as auth,
  convoyService as convoy,
  simulatorService as simulator,
  checkpointService as checkpoint,
  eventService as event,
  alertService as alert,
  optimizerService as optimizer,
};
