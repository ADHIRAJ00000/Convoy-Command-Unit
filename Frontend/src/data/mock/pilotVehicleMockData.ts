// Mock Data Generator for Pilot Vehicle Testing
// Provides realistic test data when backend is unavailable

import { PilotVehicleData, Hazard, Checkpoint, RouteSegment, HazardType, TerrainType } from '@/types/pilotVehicle';

/**
 * Generate mock pilot vehicle data for testing
 */
export const generateMockPilotVehicleData = (convoyId: string = 'CONVOY-001'): PilotVehicleData => {
  const baseTime = new Date();
  
  const mockData: PilotVehicleData = {
    convoyId,
    convoyName: 'Alpha Squadron - Kashmir Route',
    totalDistance: 125.5,
    startTime: new Date(baseTime.getTime() - 30 * 60000).toISOString(), // Started 30 min ago
    estimatedArrival: new Date(baseTime.getTime() + 150 * 60000).toISOString(), // 2.5 hours from now
    
    currentPosition: {
      lat: 34.0837,
      lng: 74.7973,
      distance: 15.3,
      speed: 45,
      heading: 285,
      timestamp: new Date().toISOString(),
    },
    
    route: generateMockRoute(),
    checkpoints: generateMockCheckpoints(),
    hazards: generateMockHazards(),
  };
  
  return mockData;
};

/**
 * Generate mock route segments
 */
const generateMockRoute = (): RouteSegment[] => {
  return [
    {
      start: { lat: 34.0522, lng: 74.7700 },
      end: { lat: 34.0700, lng: 74.7850 },
      status: 'SAFE',
      terrain: 'URBAN',
    },
    {
      start: { lat: 34.0700, lng: 74.7850 },
      end: { lat: 34.0837, lng: 74.7973 },
      status: 'SAFE',
      terrain: 'MOUNTAIN',
    },
    {
      start: { lat: 34.0837, lng: 74.7973 },
      end: { lat: 34.1200, lng: 74.8300 },
      status: 'WARNING',
      terrain: 'MOUNTAIN',
    },
    {
      start: { lat: 34.1200, lng: 74.8300 },
      end: { lat: 34.1500, lng: 74.8600 },
      status: 'CRITICAL',
      terrain: 'FOREST',
    },
    {
      start: { lat: 34.1500, lng: 74.8600 },
      end: { lat: 34.1800, lng: 74.9000 },
      status: 'WARNING',
      terrain: 'BRIDGE',
    },
    {
      start: { lat: 34.1800, lng: 74.9000 },
      end: { lat: 34.2200, lng: 74.9500 },
      status: 'SAFE',
      terrain: 'SNOW',
    },
  ];
};

/**
 * Generate mock checkpoints
 */
const generateMockCheckpoints = (): Checkpoint[] => {
  return [
    {
      id: 'CP-001',
      name: 'Checkpoint Alpha',
      position: { lat: 34.0650, lng: 74.7800 },
      distance: 5.2,
      eta: '10:30 AM',
      status: 'PASSED',
      terrain: 'URBAN',
    },
    {
      id: 'CP-002',
      name: 'Checkpoint Bravo',
      position: { lat: 34.0837, lng: 74.7973 },
      distance: 15.3,
      eta: '10:45 AM',
      status: 'REACHED',
      terrain: 'MOUNTAIN',
    },
    {
      id: 'CP-003',
      name: 'Checkpoint Charlie',
      position: { lat: 34.1200, lng: 74.8300 },
      distance: 28.7,
      eta: '11:15 AM',
      status: 'PENDING',
      terrain: 'MOUNTAIN',
    },
    {
      id: 'CP-004',
      name: 'Checkpoint Delta',
      position: { lat: 34.1500, lng: 74.8600 },
      distance: 45.8,
      eta: '11:50 AM',
      status: 'PENDING',
      terrain: 'FOREST',
    },
    {
      id: 'CP-005',
      name: 'Checkpoint Echo',
      position: { lat: 34.1800, lng: 74.9000 },
      distance: 67.3,
      eta: '12:30 PM',
      status: 'PENDING',
      terrain: 'BRIDGE',
    },
    {
      id: 'CP-006',
      name: 'Checkpoint Foxtrot (Final)',
      position: { lat: 34.2200, lng: 74.9500 },
      distance: 125.5,
      eta: '2:00 PM',
      status: 'PENDING',
      terrain: 'SNOW',
    },
  ];
};

/**
 * Generate mock hazards
 */
const generateMockHazards = (): Hazard[] => {
  const now = new Date();
  
  return [
    {
      id: 'HAZ-001',
      type: 'LANDSLIDE',
      severity: 'HIGH',
      position: { lat: 34.1150, lng: 74.8250 },
      distance: 25.4,
      description: 'Recent landslide blocking 40% of road. Debris removal in progress.',
      detectedAt: new Date(now.getTime() - 15 * 60000).toISOString(),
      recommendedAction: 'Reduce speed to 20 km/h. Single-lane traffic only. Deploy scout ahead.',
      isActive: true,
    },
    {
      id: 'HAZ-002',
      type: 'WEATHER_HAZARD',
      severity: 'MEDIUM',
      position: { lat: 34.1450, lng: 74.8550 },
      distance: 42.1,
      description: 'Heavy fog reducing visibility to 50 meters. Temperature dropping.',
      detectedAt: new Date(now.getTime() - 8 * 60000).toISOString(),
      recommendedAction: 'Enable fog lights. Maintain 100m spacing between vehicles. Reduce speed by 30%.',
      isActive: true,
    },
    {
      id: 'HAZ-003',
      type: 'HOSTILE_ZONE',
      severity: 'CRITICAL',
      position: { lat: 34.1520, lng: 74.8620 },
      distance: 47.8,
      description: 'Intelligence reports potential hostile activity. Unverified sightings 2km east.',
      detectedAt: new Date(now.getTime() - 5 * 60000).toISOString(),
      recommendedAction: 'ALERT: Increase vigilance. Weapons ready. Request air support standby. Consider alternate route.',
      isActive: true,
    },
    {
      id: 'HAZ-004',
      type: 'BRIDGE_DAMAGE',
      severity: 'HIGH',
      position: { lat: 34.1750, lng: 74.8950 },
      distance: 65.2,
      description: 'Bridge structural integrity compromised. Load capacity reduced to 15 tons per vehicle.',
      detectedAt: new Date(now.getTime() - 25 * 60000).toISOString(),
      recommendedAction: 'One vehicle at a time. Speed limit 5 km/h. Engineer inspection required.',
      isActive: true,
    },
    {
      id: 'HAZ-005',
      type: 'IED_DETECTION',
      severity: 'CRITICAL',
      position: { lat: 34.1950, lng: 74.9200 },
      distance: 85.7,
      description: 'Suspicious object detected by advanced sensors. EOD team dispatched.',
      detectedAt: new Date(now.getTime() - 2 * 60000).toISOString(),
      recommendedAction: 'STOP IMMEDIATELY. Establish 500m perimeter. Wait for EOD clearance. Alternate route recommended.',
      isActive: true,
    },
    {
      id: 'HAZ-006',
      type: 'BLOCKED_ROAD',
      severity: 'LOW',
      position: { lat: 34.2100, lng: 74.9400 },
      distance: 110.3,
      description: 'Fallen tree blocking right lane. Local workers clearing.',
      detectedAt: new Date(now.getTime() - 35 * 60000).toISOString(),
      recommendedAction: 'Use left lane. Expect 10-minute delay. No detour necessary.',
      isActive: false,
    },
  ];
};

/**
 * Mock convoy list for dropdown
 */
export const getMockConvoyList = () => {
  return [
    { _id: 'convoy-1', name: 'Alpha Squadron - Kashmir Route', status: 'ACTIVE', route: {} },
    { _id: 'convoy-2', name: 'Bravo Team - Ladakh Corridor', status: 'ACTIVE', route: {} },
    { _id: 'convoy-3', name: 'Charlie Unit - Border Patrol', status: 'ACTIVE', route: {} },
    { _id: 'convoy-4', name: 'Delta Force - Supply Mission', status: 'SCHEDULED', route: {} },
    { _id: 'convoy-5', name: 'Echo Squad - Medical Transport', status: 'ACTIVE', route: {} },
  ];
};

/**
 * Simulate position updates
 */
export const simulatePositionUpdate = (currentData: PilotVehicleData, speed: number = 1): PilotVehicleData => {
  const distanceIncrement = 0.5 * speed; // km per update
  const newDistance = Math.min(currentData.currentPosition.distance + distanceIncrement, currentData.totalDistance);
  
  // Find next route segment position
  let cumulativeDistance = 0;
  let newLat = currentData.currentPosition.lat;
  let newLng = currentData.currentPosition.lng;
  
  for (const segment of currentData.route) {
    const segmentLength = calculateDistance(segment.start, segment.end);
    if (newDistance <= cumulativeDistance + segmentLength) {
      const ratio = (newDistance - cumulativeDistance) / segmentLength;
      newLat = segment.start.lat + (segment.end.lat - segment.start.lat) * ratio;
      newLng = segment.start.lng + (segment.end.lng - segment.start.lng) * ratio;
      break;
    }
    cumulativeDistance += segmentLength;
  }
  
  return {
    ...currentData,
    currentPosition: {
      ...currentData.currentPosition,
      lat: newLat,
      lng: newLng,
      distance: newDistance,
      timestamp: new Date().toISOString(),
    },
  };
};

// Helper: Calculate distance between two points (simplified)
const calculateDistance = (p1: { lat: number; lng: number }, p2: { lat: number; lng: number }): number => {
  const R = 6371; // Earth's radius in km
  const dLat = (p2.lat - p1.lat) * Math.PI / 180;
  const dLng = (p2.lng - p1.lng) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(p1.lat * Math.PI / 180) * Math.cos(p2.lat * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};
