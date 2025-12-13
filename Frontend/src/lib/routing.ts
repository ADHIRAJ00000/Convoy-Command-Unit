import type { Route, RouteSegment } from '@/types/route';

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? '';

export type RouteRequest = {
  origin: { lat: number; lng: number };
  destination: { lat: number; lng: number };
  profile?: 'driving' | 'driving-traffic' | 'walking' | 'cycling';
  waypoints?: { lat: number; lng: number }[];
};

export type MapboxDirectionsResponse = {
  routes: Array<{
    geometry: {
      coordinates: [number, number][]; // [lng, lat]
      type: string;
    };
    distance: number; // meters
    duration: number; // seconds
    legs: Array<{
      steps: Array<{
        geometry: {
          coordinates: [number, number][];
          type: string;
        };
        distance: number;
        duration: number;
      }>;
    }>;
  }>;
  code: string;
};

/**
 * Fetch a real road-based route from Mapbox Directions API
 */
export const fetchMapboxRoute = async (request: RouteRequest): Promise<Route | null> => {
  if (!MAPBOX_TOKEN) {
    console.error('Mapbox token not configured');
    throw new Error('Mapbox token is not configured. Please add NEXT_PUBLIC_MAPBOX_TOKEN to your .env.local file.');
  }

  const { origin, destination, profile = 'driving', waypoints = [] } = request;
  
  // Validate coordinates
  if (!origin.lat || !origin.lng || !destination.lat || !destination.lng) {
    throw new Error('Invalid coordinates provided');
  }

  if (Math.abs(origin.lat) > 90 || Math.abs(destination.lat) > 90) {
    throw new Error('Latitude must be between -90 and 90');
  }

  if (Math.abs(origin.lng) > 180 || Math.abs(destination.lng) > 180) {
    throw new Error('Longitude must be between -180 and 180');
  }
  
  // Calculate distance to check if points are too far apart
  const distance = calculateHaversineDistance(origin, destination);
  
  // If points are extremely far apart (>5000km), warn but allow
  if (distance > 5000) {
    console.warn(`Warning: Very long route (${distance.toFixed(0)}km). Route calculation may fail.`);
  }
  
  // Mapbox expects coordinates in [lng, lat] format
  const coordParts = [origin, ...waypoints, destination].map((pt) => `${pt.lng},${pt.lat}`);
  const coordinates = coordParts.join(';');
  
  const url = `https://api.mapbox.com/directions/v5/mapbox/${profile}/${coordinates}`;
  const params = new URLSearchParams({
    access_token: MAPBOX_TOKEN,
    geometries: 'geojson',
    overview: 'full',
    steps: 'true',
    alternatives: 'false',
  });

  try {
    console.log(`Fetching route from ${origin.lat},${origin.lng} to ${destination.lat},${destination.lng} (${distance.toFixed(0)}km direct)`);
    
    const response = await fetch(`${url}?${params.toString()}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Mapbox API Error:', errorText);
      throw new Error(`Mapbox API error (${response.status}): ${response.statusText}`);
    }

    const data: MapboxDirectionsResponse = await response.json();

    if (data.code !== 'Ok') {
      console.warn(`Mapbox returned code: ${data.code}. Creating fallback direct route.`);
      // Create a fallback direct route instead of throwing error
      return createFallbackDirectRoute(origin, destination, distance);
    }

    if (!data.routes || data.routes.length === 0) {
      console.warn('No route found, creating fallback direct route');
      return createFallbackDirectRoute(origin, destination, distance);
    }

    const route = data.routes[0];
    const polyline = route.geometry.coordinates;
    const distanceKm = Math.round(route.distance / 1000);
    const durationHours = Math.round((route.duration / 3600) * 10) / 10;

    console.log(`✓ Route calculated: ${distanceKm}km, ${durationHours}h`);

    // Create route segments from the polyline
    const segments = createRouteSegments(polyline, route.legs[0]?.steps || []);

    // Calculate risk score based on terrain and route characteristics
    const riskScore = calculateRiskScore(segments, distanceKm);

    // Generate checkpoints along the route
    const checkpoints = generateCheckpoints(polyline, durationHours, distanceKm);

    return {
      id: `route-${Date.now()}`,
      name: `Route ${distanceKm}km`,
      polyline,
      etaHours: durationHours,
      distanceKm,
      riskScore,
      segments,
      checkpoints,
    };
  } catch (error) {
    console.error('Failed to fetch Mapbox route:', error);
    // Instead of throwing, create a fallback route
    console.log('Creating fallback direct route...');
    return createFallbackDirectRoute(origin, destination, distance);
  }
};

/**
 * Calculate Haversine distance between two points in km
 */
const calculateHaversineDistance = (
  point1: { lat: number; lng: number },
  point2: { lat: number; lng: number }
): number => {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(point2.lat - point1.lat);
  const dLon = toRad(point2.lng - point1.lng);
  
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(point1.lat)) * Math.cos(toRad(point2.lat)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const toRad = (degrees: number): number => degrees * (Math.PI / 180);

/**
 * Create a fallback direct route when Mapbox API fails
 */
const createFallbackDirectRoute = (
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number },
  distanceKm: number
): Route => {
  console.log(`Creating direct route: ${distanceKm.toFixed(0)}km`);
  
  // Create a simple straight line with a few intermediate points for smoother display
  const numPoints = Math.min(Math.max(Math.floor(distanceKm / 50), 3), 10);
  const polyline: [number, number][] = [];
  
  for (let i = 0; i <= numPoints; i++) {
    const ratio = i / numPoints;
    const lat = origin.lat + (destination.lat - origin.lat) * ratio;
    const lng = origin.lng + (destination.lng - origin.lng) * ratio;
    polyline.push([lng, lat]);
  }
  
  const etaHours = Math.round((distanceKm / 50) * 10) / 10; // Assume 50 km/h average
  const terrain = determineTerrainFromCoordinates(origin, destination);
  
  const segments: RouteSegment[] = [{
    id: 'seg-fallback-0',
    coordinates: polyline,
    terrain,
    difficulty: 'MEDIUM',
    recommendedSpeedKmph: 50,
    riskLevel: 0.4,
    status: 'CLEAR',
  }];
  
  const riskScore = calculateRiskScore(segments, distanceKm);
  const checkpoints = generateCheckpointsForFallback(polyline, etaHours, distanceKm);
  
  return {
    id: `route-fallback-${Date.now()}`,
    name: `Direct Route ${Math.round(distanceKm)}km`,
    polyline,
    etaHours,
    distanceKm: Math.round(distanceKm),
    riskScore,
    segments,
    checkpoints,
  };
};

/**
 * Determine terrain from coordinates
 */
const determineTerrainFromCoordinates = (
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number }
): RouteSegment['terrain'] => {
  const avgLat = (origin.lat + destination.lat) / 2;
  const avgLng = (origin.lng + destination.lng) / 2;
  
  // Mountain regions (Himalayas, etc.)
  if ((avgLat > 28 && avgLat < 36 && avgLng > 73 && avgLng < 95)) {
    return 'MOUNTAIN';
  }
  
  // Desert regions
  if ((avgLat > 24 && avgLat < 30 && avgLng > 69 && avgLng < 76)) {
    return 'DESERT';
  }
  
  return 'URBAN';
};

/**
 * Generate checkpoints for fallback route
 */
const generateCheckpointsForFallback = (
  polyline: [number, number][],
  etaHours: number,
  distanceKm: number
): Route['checkpoints'] => {
  const checkpoints: Route['checkpoints'] = [];
  
  // Create checkpoints every 50-100km
  const checkpointInterval = 70; // km
  const numCheckpoints = Math.max(Math.floor(distanceKm / checkpointInterval), 1);
  
  for (let i = 1; i <= numCheckpoints; i++) {
    const ratio = i / (numCheckpoints + 1);
    const index = Math.floor(ratio * (polyline.length - 1));
    const [lng, lat] = polyline[index];
    const etaOffset = etaHours * ratio;
    
    checkpoints.push({
      id: `cp-fallback-${i}`,
      name: `Checkpoint ${i} (km ${Math.round(distanceKm * ratio)})`,
      status: 'PENDING',
      eta: new Date(Date.now() + etaOffset * 3600000).toISOString(),
      location: { lat, lng },
    });
  }
  
  // Add final destination checkpoint
  const [destLng, destLat] = polyline[polyline.length - 1];
  checkpoints.push({
    id: 'cp-destination',
    name: 'Destination',
    status: 'PENDING',
    eta: new Date(Date.now() + etaHours * 3600000).toISOString(),
    location: { lat: destLat, lng: destLng },
  });
  
  return checkpoints;
};

/**
 * Create route segments from Mapbox steps
 */
const createRouteSegments = (
  polyline: [number, number][],
  steps: MapboxDirectionsResponse['routes'][0]['legs'][0]['steps']
): RouteSegment[] => {
  if (steps.length === 0) {
    // Fallback: create a single segment for the entire route
    return [
      {
        id: 'seg-0',
        coordinates: polyline,
        terrain: 'URBAN',
        difficulty: 'MEDIUM',
        recommendedSpeedKmph: 60,
        riskLevel: 0.3,
        status: 'CLEAR',
      },
    ];
  }

  const segments: RouteSegment[] = [];
  let coordinateIndex = 0;

  steps.forEach((step, index) => {
    const stepCoords = step.geometry.coordinates;
    const distanceKm = step.distance / 1000;
    
    // Determine terrain and difficulty based on distance and characteristics
    const terrain = determineTerrainType(distanceKm, stepCoords);
    const difficulty = determineDifficulty(distanceKm, terrain);
    const recommendedSpeed = getRecommendedSpeed(terrain, difficulty);
    const riskLevel = calculateSegmentRisk(terrain, difficulty, distanceKm);

    segments.push({
      id: `seg-${index}`,
      coordinates: stepCoords,
      terrain,
      difficulty,
      recommendedSpeedKmph: recommendedSpeed,
      riskLevel,
      status: 'CLEAR',
    });

    coordinateIndex += stepCoords.length;
  });

  return segments;
};

/**
 * Determine terrain type based on route characteristics
 */
const determineTerrainType = (
  distanceKm: number,
  coordinates: [number, number][]
): RouteSegment['terrain'] => {
  // Simple heuristic: longer segments in certain lat/lng ranges indicate mountain terrain
  const avgLat = coordinates.reduce((sum, [_, lat]) => sum + lat, 0) / coordinates.length;
  const avgLng = coordinates.reduce((sum, [lng, _]) => sum + lng, 0) / coordinates.length;

  // Mountain regions (Himalayas, etc.) - rough coordinates
  if ((avgLat > 28 && avgLat < 36 && avgLng > 73 && avgLng < 95)) {
    return 'MOUNTAIN';
  }
  
  // Desert regions (Rajasthan, etc.)
  if ((avgLat > 24 && avgLat < 30 && avgLng > 69 && avgLng < 76)) {
    return 'DESERT';
  }
  
  // Coastal regions
  if ((avgLng < 74 && avgLat < 22) || (avgLng > 87 && avgLat < 23)) {
    return 'COASTAL';
  }
  
  // Forest regions (Northeast, Western Ghats)
  if ((avgLng > 90 && avgLat > 23) || (avgLng < 78 && avgLat > 11 && avgLat < 19)) {
    return 'FOREST';
  }

  return 'URBAN';
};

/**
 * Determine difficulty based on terrain and distance
 */
const determineDifficulty = (
  distanceKm: number,
  terrain: RouteSegment['terrain']
): RouteSegment['difficulty'] => {
  if (terrain === 'MOUNTAIN') return 'HIGH';
  if (terrain === 'DESERT' && distanceKm > 50) return 'HIGH';
  if (terrain === 'FOREST' || terrain === 'COASTAL') return 'MEDIUM';
  return 'LOW';
};

/**
 * Get recommended speed based on terrain and difficulty
 */
const getRecommendedSpeed = (
  terrain: RouteSegment['terrain'],
  difficulty: RouteSegment['difficulty']
): number => {
  if (terrain === 'MOUNTAIN') return difficulty === 'HIGH' ? 35 : 50;
  if (terrain === 'DESERT') return 55;
  if (terrain === 'FOREST') return 45;
  if (terrain === 'COASTAL') return 60;
  return 60; // URBAN
};

/**
 * Calculate segment risk level
 */
const calculateSegmentRisk = (
  terrain: RouteSegment['terrain'],
  difficulty: RouteSegment['difficulty'],
  distanceKm: number
): number => {
  let risk = 0.2; // Base risk

  if (terrain === 'MOUNTAIN') risk += 0.4;
  if (terrain === 'DESERT') risk += 0.3;
  if (terrain === 'FOREST') risk += 0.2;
  
  if (difficulty === 'HIGH') risk += 0.2;
  if (difficulty === 'MEDIUM') risk += 0.1;
  
  if (distanceKm > 100) risk += 0.1;

  return Math.min(risk, 1.0);
};

/**
 * Calculate overall route risk score (0-100)
 */
const calculateRiskScore = (segments: RouteSegment[], distanceKm: number): number => {
  const avgRisk = segments.reduce((sum, seg) => sum + seg.riskLevel, 0) / segments.length;
  let score = avgRisk * 70;
  
  // Add distance factor
  if (distanceKm > 500) score += 15;
  else if (distanceKm > 300) score += 10;
  else if (distanceKm > 150) score += 5;
  
  return Math.min(Math.round(score), 100);
};

/**
 * Generate checkpoints along the route based on actual waypoints
 */
const generateCheckpoints = (
  polyline: [number, number][],
  etaHours: number,
  distanceKm: number
): Route['checkpoints'] => {
  const checkpoints: Route['checkpoints'] = [];
  
  // Don't generate checkpoints for very short routes
  if (polyline.length < 10 || etaHours < 1) {
    return checkpoints;
  }

  // Calculate number of checkpoints based on route length and time
  // One checkpoint approximately every 2 hours or every 100km of polyline points
  const numCheckpoints = Math.min(Math.max(Math.floor(etaHours / 2), 2), 8);
  
  // Distribute checkpoints evenly along the polyline
  const interval = Math.floor(polyline.length / (numCheckpoints + 1));

  for (let i = 1; i <= numCheckpoints; i++) {
    const index = i * interval;
    if (index < polyline.length) {
      const [lng, lat] = polyline[index];
      const etaOffset = (etaHours / (numCheckpoints + 1)) * i;
      
      checkpoints.push({
        id: `cp-${i}`,
        name: `Checkpoint ${i}`,
        status: 'PENDING',
        eta: new Date(Date.now() + etaOffset * 3600000).toISOString(),
        location: { lat, lng }, // Store actual coordinates from the route
      });
    }
  }

  return checkpoints;
};
