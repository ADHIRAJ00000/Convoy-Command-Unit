/**
 * Mapbox Routing Service
 * Fetches real-world driving routes using Mapbox Directions API
 */

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';
const MAPBOX_DIRECTIONS_API = 'https://api.mapbox.com/directions/v5/mapbox/driving';

export interface RouteCoordinate {
  lat: number;
  lng: number;
}

export interface MapboxRoute {
  coordinates: [number, number][]; // [lng, lat] format for Mapbox
  distance: number; // in meters
  duration: number; // in seconds
  geometry: any; // GeoJSON geometry
}

/**
 * Fetch real driving route from Mapbox Directions API
 */
export async function fetchMapboxRoute(
  origin: RouteCoordinate,
  destination: RouteCoordinate,
  waypoints?: RouteCoordinate[]
): Promise<MapboxRoute | null> {
  if (!MAPBOX_TOKEN) {
    console.warn('Mapbox token not configured. Using straight-line route.');
    return createStraightLineRoute(origin, destination);
  }

  try {
    // Build coordinates string: "lng,lat;lng,lat;..."
    const allPoints = [origin, ...(waypoints || []), destination];
    const coordinates = allPoints
      .map(point => `${point.lng},${point.lat}`)
      .join(';');

    const url = `${MAPBOX_DIRECTIONS_API}/${coordinates}?` + new URLSearchParams({
      access_token: MAPBOX_TOKEN,
      geometries: 'geojson',
      overview: 'full',
      steps: 'true',
      alternatives: 'false'
    });

    const response = await fetch(url);
    
    if (!response.ok) {
      console.error('Mapbox API error:', response.statusText);
      return createStraightLineRoute(origin, destination);
    }

    const data = await response.json();

    if (!data.routes || data.routes.length === 0) {
      console.warn('No routes found from Mapbox. Using straight-line.');
      return createStraightLineRoute(origin, destination);
    }

    const route = data.routes[0];

    return {
      coordinates: route.geometry.coordinates, // Already in [lng, lat] format
      distance: route.distance, // meters
      duration: route.duration, // seconds
      geometry: route.geometry
    };

  } catch (error) {
    console.error('Error fetching Mapbox route:', error);
    return createStraightLineRoute(origin, destination);
  }
}

/**
 * Create a straight-line route as fallback
 */
function createStraightLineRoute(
  origin: RouteCoordinate,
  destination: RouteCoordinate
): MapboxRoute {
  const coordinates: [number, number][] = [
    [origin.lng, origin.lat],
    [destination.lng, destination.lat]
  ];

  // Calculate straight-line distance using Haversine formula
  const distance = calculateDistance(origin, destination) * 1000; // Convert km to meters

  return {
    coordinates,
    distance,
    duration: distance / (60 * 1000 / 3600), // Assume 60 km/h average speed
    geometry: {
      type: 'LineString',
      coordinates
    }
  };
}

/**
 * Calculate distance between two points (in km)
 */
function calculateDistance(point1: RouteCoordinate, point2: RouteCoordinate): number {
  const R = 6371; // Radius of Earth in km
  const dLat = (point2.lat - point1.lat) * Math.PI / 180;
  const dLng = (point2.lng - point1.lng) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(point1.lat * Math.PI / 180) * Math.cos(point2.lat * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Generate checkpoints along a Mapbox route
 */
export function generateCheckpointsFromRoute(
  route: MapboxRoute,
  numCheckpoints: number = 5
): RouteCoordinate[] {
  const { coordinates } = route;
  const totalPoints = coordinates.length;
  const checkpoints: RouteCoordinate[] = [];

  // Always include origin
  checkpoints.push({
    lng: coordinates[0][0],
    lat: coordinates[0][1]
  });

  // Add intermediate checkpoints
  for (let i = 1; i < numCheckpoints - 1; i++) {
    const index = Math.floor((i / (numCheckpoints - 1)) * (totalPoints - 1));
    checkpoints.push({
      lng: coordinates[index][0],
      lat: coordinates[index][1]
    });
  }

  // Always include destination
  checkpoints.push({
    lng: coordinates[totalPoints - 1][0],
    lat: coordinates[totalPoints - 1][1]
  });

  return checkpoints;
}