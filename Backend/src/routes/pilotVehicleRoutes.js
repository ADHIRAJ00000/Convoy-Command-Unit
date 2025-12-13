const express = require('express');
const router = express.Router();
const Convoy = require('../models/Convoy');
const logger = require('../config/logger');
const axios = require('axios');

// Mapbox configuration
const MAPBOX_TOKEN = process.env.MAPBOX_TOKEN || 'pk.eyJ1Ijoic2hpdmFuZ2thcm9sIiwiYSI6ImNtajBjcnkzYTA3bmczZnI0MnhxaDkzNXIifQ.cX-8_jISULu-XpD_XpiaBg';
const MAPBOX_DIRECTIONS_API = 'https://api.mapbox.com/directions/v5/mapbox/driving';

// ============================================
// MAPBOX ROUTING FUNCTIONS
// ============================================

/**
 * Fetch real-world driving route from Mapbox
 */
async function fetchMapboxRoute(origin, destination) {
  try {
    const coordinates = `${origin.lng},${origin.lat};${destination.lng},${destination.lat}`;
    const url = `${MAPBOX_DIRECTIONS_API}/${coordinates}`;
    
    const response = await axios.get(url, {
      params: {
        access_token: MAPBOX_TOKEN,
        geometries: 'geojson',
        overview: 'full',
        steps: true,
        alternatives: false
      },
      timeout: 10000
    });

    if (response.data.routes && response.data.routes.length > 0) {
      const route = response.data.routes[0];
      return {
        coordinates: route.geometry.coordinates, // [lng, lat] format
        distance: route.distance, // meters
        duration: route.duration, // seconds
        geometry: route.geometry
      };
    }
    
    return null;
  } catch (error) {
    logger.warn('Mapbox API unavailable, using generated route:', error.message);
    return null;
  }
}

// ============================================
// HAZARD DETECTION ALGORITHMS
// ============================================

/**
 * Advanced hazard detection based on:
 * - Weather conditions
 * - Terrain analysis
 * - Historical incident data
 * - Road conditions
 */
async function detectHazardsAlongRoute(convoy, routeCoordinates) {
  const hazards = [];
  const OPENWEATHER_API_KEY = process.env.OPENWEATHER_API_KEY;

  // 1. Weather-based hazards
  if (OPENWEATHER_API_KEY) {
    try {
      for (let i = 0; i < routeCoordinates.length; i += Math.max(1, Math.floor(routeCoordinates.length / 5))) {
        const coord = routeCoordinates[i];
        const weatherData = await fetchWeatherAtPoint(coord[1], coord[0], OPENWEATHER_API_KEY);
        
        if (weatherData) {
          const weatherHazards = analyzeWeatherHazards(weatherData, coord, i);
          hazards.push(...weatherHazards);
        }
      }
    } catch (error) {
      logger.warn('Weather API unavailable, using terrain-based detection', error);
    }
  }

  // 2. Terrain-based hazards (elevation changes, difficult terrain)
  const terrainHazards = analyzeTerrainHazards(routeCoordinates, convoy);
  hazards.push(...terrainHazards);

  // 3. Simulated incident hazards (for demo/training)
  const simulatedHazards = generateSimulatedHazards(routeCoordinates, convoy);
  hazards.push(...simulatedHazards);

  return hazards;
}

/**
 * Fetch weather data from OpenWeather API
 */
async function fetchWeatherAtPoint(lat, lng, apiKey) {
  try {
    const response = await axios.get('https://api.openweathermap.org/data/2.5/weather', {
      params: {
        lat,
        lon: lng,
        appid: apiKey,
        units: 'metric'
      },
      timeout: 5000
    });
    return response.data;
  } catch (error) {
    return null;
  }
}

/**
 * Analyze weather conditions for hazards
 */
function analyzeWeatherHazards(weatherData, coord, index) {
  const hazards = [];
  const distance = index * 10; // Approximate distance

  // Heavy rain detection
  if (weatherData.rain && weatherData.rain['1h'] > 5) {
    hazards.push({
      id: `weather-rain-${index}`,
      type: 'WEATHER_HAZARD',
      subType: 'HEAVY_RAIN',
      severity: weatherData.rain['1h'] > 10 ? 'HIGH' : 'MEDIUM',
      position: { lat: coord[1], lng: coord[0] },
      distance,
      description: `Heavy rainfall detected: ${weatherData.rain['1h'].toFixed(1)}mm/hr`,
      isActive: true,
      detectedAt: new Date(),
      metadata: {
        rainfall: weatherData.rain['1h'],
        visibility: weatherData.visibility,
        windSpeed: weatherData.wind.speed
      }
    });
  }

  // Snow conditions
  if (weatherData.snow && weatherData.snow['1h'] > 2) {
    hazards.push({
      id: `weather-snow-${index}`,
      type: 'WEATHER_HAZARD',
      subType: 'SNOW',
      severity: 'HIGH',
      position: { lat: coord[1], lng: coord[0] },
      distance,
      description: `Heavy snow: ${weatherData.snow['1h'].toFixed(1)}mm/hr`,
      isActive: true,
      detectedAt: new Date(),
      metadata: { snowfall: weatherData.snow['1h'] }
    });
  }

  // Low visibility (fog)
  if (weatherData.visibility < 1000) {
    hazards.push({
      id: `weather-fog-${index}`,
      type: 'WEATHER_HAZARD',
      subType: 'LOW_VISIBILITY',
      severity: weatherData.visibility < 500 ? 'CRITICAL' : 'HIGH',
      position: { lat: coord[1], lng: coord[0] },
      distance,
      description: `Low visibility: ${weatherData.visibility}m`,
      isActive: true,
      detectedAt: new Date(),
      metadata: { visibility: weatherData.visibility }
    });
  }

  // Extreme winds
  if (weatherData.wind && weatherData.wind.speed > 15) {
    hazards.push({
      id: `weather-wind-${index}`,
      type: 'WEATHER_HAZARD',
      subType: 'HIGH_WINDS',
      severity: weatherData.wind.speed > 25 ? 'CRITICAL' : 'MEDIUM',
      position: { lat: coord[1], lng: coord[0] },
      distance,
      description: `High winds: ${weatherData.wind.speed.toFixed(1)} m/s`,
      isActive: true,
      detectedAt: new Date(),
      metadata: { windSpeed: weatherData.wind.speed }
    });
  }

  return hazards;
}

/**
 * Analyze terrain for potential hazards
 */
function analyzeTerrainHazards(routeCoordinates, convoy) {
  const hazards = [];

  for (let i = 0; i < routeCoordinates.length - 1; i++) {
    const coord1 = routeCoordinates[i];
    const coord2 = routeCoordinates[i + 1];
    const distance = i * 10;

    // Calculate elevation change (simplified - in production use DEM data)
    const elevationChange = Math.abs(coord2[1] - coord1[1]) * 111000; // meters

    // Steep gradient detection
    if (elevationChange > 100) {
      hazards.push({
        id: `terrain-steep-${i}`,
        type: 'TERRAIN_HAZARD',
        subType: 'STEEP_GRADIENT',
        severity: elevationChange > 200 ? 'HIGH' : 'MEDIUM',
        position: { lat: coord1[1], lng: coord1[0] },
        distance,
        description: `Steep gradient detected: ${elevationChange.toFixed(0)}m change`,
        isActive: true,
        detectedAt: new Date(),
        metadata: { elevationChange }
      });
    }
  }

  return hazards;
}

/**
 * Generate simulated hazards for training/demo
 */
function generateSimulatedHazards(routeCoordinates, convoy) {
  const hazards = [];
  const totalPoints = routeCoordinates.length;

  // Strategically place hazards along route
  const hazardTypes = [
    { type: 'LANDSLIDE', severity: 'CRITICAL', description: 'Landslide blocking road ahead' },
    { type: 'BLOCKED_ROAD', severity: 'HIGH', description: 'Road obstruction detected' },
    { type: 'IED_DETECTION', severity: 'CRITICAL', description: 'Suspicious object detected' },
    { type: 'HOSTILE_ZONE', severity: 'HIGH', description: 'Entering high-risk area' }
  ];

  // Place 2-4 hazards along the route
  const numHazards = 2 + Math.floor(Math.random() * 3);
  
  for (let i = 0; i < numHazards; i++) {
    const position = Math.floor(totalPoints * (0.2 + Math.random() * 0.6));
    const coord = routeCoordinates[position];
    const hazardType = hazardTypes[Math.floor(Math.random() * hazardTypes.length)];
    const distance = position * 10;

    hazards.push({
      id: `simulated-${hazardType.type.toLowerCase()}-${i}`,
      type: hazardType.type,
      severity: hazardType.severity,
      position: { lat: coord[1], lng: coord[0] },
      distance,
      description: hazardType.description,
      isActive: true,
      detectedAt: new Date(),
      metadata: {
        simulated: true,
        recommendedAction: 'Proceed with caution'
      }
    });
  }

  return hazards;
}

// ============================================
// ENHANCED API ROUTES WITH REAL MAPBOX ROUTING
// ============================================

/**
 * GET /api/pilot-vehicle/:convoyId/data
 * Get complete pilot vehicle data with real Mapbox routes and hazard detection
 */
router.get('/:convoyId/data', async (req, res) => {
  try {
    let convoy = await Convoy.findById(req.params.convoyId).catch(() => null);
    
    if (!convoy) {
      convoy = await Convoy.findOne({ id: req.params.convoyId });
    }
    
    if (!convoy) {
      return res.status(404).json({ 
        success: false, 
        error: 'Convoy not found' 
      });
    }

    // Fetch real Mapbox route
    logger.info(`Fetching Mapbox route for convoy ${convoy.name} from ${convoy.origin.name} to ${convoy.destination.name}`);
    const mapboxRoute = await fetchMapboxRoute(convoy.origin, convoy.destination);
    
    let routeCoordinates;
    let totalDistance;
    
    if (mapboxRoute) {
      routeCoordinates = mapboxRoute.coordinates;
      totalDistance = mapboxRoute.distance / 1000; // Convert to km
      logger.info(`✓ Mapbox route fetched: ${totalDistance.toFixed(1)}km, ${routeCoordinates.length} points`);
    } else {
      // Fallback to generated route
      routeCoordinates = generateRouteCoordinates(convoy);
      totalDistance = calculateRouteDistance(routeCoordinates);
      logger.info(`Using generated route: ${totalDistance.toFixed(1)}km`);
    }
    
    // Detect hazards using algorithms
    const detectedHazards = await detectHazardsAlongRoute(convoy, routeCoordinates);
    
    // Generate checkpoints along the real route
    const checkpoints = generateEnhancedCheckpoints(convoy, routeCoordinates, totalDistance);
    
    // Transform route to segment format
    const routeSegments = [];
    for (let i = 0; i < routeCoordinates.length - 1; i++) {
      routeSegments.push({
        start: {
          lat: routeCoordinates[i][1],
          lng: routeCoordinates[i][0]
        },
        end: {
          lat: routeCoordinates[i + 1][1],
          lng: routeCoordinates[i + 1][0]
        },
        distance: calculateDistance(
          { lat: routeCoordinates[i][1], lng: routeCoordinates[i][0] },
          { lat: routeCoordinates[i + 1][1], lng: routeCoordinates[i][0] }
        ),
        terrain: determineTerrain(routeCoordinates[i]),
        status: 'CLEAR'
      });
    }

    const pilotVehicleData = {
      convoyId: convoy._id,
      convoyName: convoy.name,
      status: convoy.status,
      currentPosition: {
        lat: convoy.currentPosition?.lat || convoy.origin.lat,
        lng: convoy.currentPosition?.lng || convoy.origin.lng,
        distance: 0,
        speed: convoy.speedKmph || 45,
        heading: calculateInitialHeading(convoy.origin, convoy.destination),
        timestamp: new Date()
      },
      route: routeSegments,
      checkpoints,
      hazards: detectedHazards,
      totalDistance,
      estimatedTimeRemaining: calculateETA(totalDistance, 45),
      priority: convoy.priority,
      lastUpdated: new Date(),
      metadata: {
        usingMapboxRoute: mapboxRoute !== null,
        routePoints: routeCoordinates.length
      }
    };

    logger.info(`Pilot vehicle data generated for convoy ${convoy.name}:`, {
      hazardsDetected: detectedHazards.length,
      checkpoints: checkpoints.length,
      totalDistance: `${totalDistance.toFixed(1)}km`,
      usingMapbox: mapboxRoute !== null
    });

    res.json({
      success: true,
      data: pilotVehicleData
    });
    
  } catch (error) {
    logger.error('Error fetching pilot vehicle data:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

/**
 * GET /api/pilot-vehicle/:convoyId/route
 * Get enhanced route with Mapbox integration
 */
router.get('/:convoyId/route', async (req, res) => {
  try {
    const convoy = await Convoy.findById(req.params.convoyId);
    
    if (!convoy) {
      return res.status(404).json({ success: false, error: 'Convoy not found' });
    }

    // Fetch real Mapbox route
    const mapboxRoute = await fetchMapboxRoute(convoy.origin, convoy.destination);
    
    let routeCoordinates;
    let totalDistance;

    if (mapboxRoute) {
      routeCoordinates = mapboxRoute.coordinates;
      totalDistance = mapboxRoute.distance / 1000; // Convert to km
    } else {
      // Fallback to generated route
      routeCoordinates = generateRouteCoordinates(convoy);
      totalDistance = calculateRouteDistance(routeCoordinates);
    }

    res.json({
      success: true,
      data: {
        coordinates: routeCoordinates,
        origin: convoy.origin,
        destination: convoy.destination,
        totalDistance,
        routeType: 'driving',
        usingMapboxRoute: mapboxRoute !== null
      }
    });
    
  } catch (error) {
    logger.error('Error fetching route:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/pilot-vehicle/:convoyId/hazards
 * Get real-time detected hazards
 */
router.get('/:convoyId/hazards', async (req, res) => {
  try {
    const convoy = await Convoy.findById(req.params.convoyId);
    
    if (!convoy) {
      return res.status(404).json({ success: false, error: 'Convoy not found' });
    }

    const routeCoordinates = generateRouteCoordinates(convoy);
    const hazards = await detectHazardsAlongRoute(convoy, routeCoordinates);

    res.json({
      success: true,
      data: hazards
    });
    
  } catch (error) {
    logger.error('Error fetching hazards:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/pilot-vehicle/:convoyId/checkpoints
 * Get enhanced checkpoints with terrain info
 */
router.get('/:convoyId/checkpoints', async (req, res) => {
  try {
    const convoy = await Convoy.findById(req.params.convoyId);
    
    if (!convoy) {
      return res.status(404).json({ success: false, error: 'Convoy not found' });
    }

    const routeCoordinates = generateRouteCoordinates(convoy);
    const checkpoints = generateEnhancedCheckpoints(convoy, routeCoordinates);

    res.json({
      success: true,
      data: checkpoints
    });
    
  } catch (error) {
    logger.error('Error fetching checkpoints:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/pilot-vehicle/:convoyId/progress
 * Get real-time progress with physics-based simulation
 */
router.get('/:convoyId/progress', async (req, res) => {
  try {
    const convoy = await Convoy.findById(req.params.convoyId);
    
    if (!convoy) {
      return res.status(404).json({ success: false, error: 'Convoy not found' });
    }

    const routeCoordinates = generateRouteCoordinates(convoy);
    const totalDistance = calculateRouteDistance(routeCoordinates);
    const currentDistance = convoy.currentPosition 
      ? calculateDistance(convoy.origin, convoy.currentPosition)
      : 0;

    res.json({
      success: true,
      data: {
        currentPosition: convoy.currentPosition || convoy.origin,
        totalDistance,
        currentDistance,
        progress: totalDistance > 0 ? (currentDistance / totalDistance) * 100 : 0,
        speed: convoy.speedKmph || 45,
        heading: calculateBearing(convoy.currentPosition || convoy.origin, convoy.destination),
        estimatedTimeRemaining: calculateETA(totalDistance - currentDistance, convoy.speedKmph || 45)
      }
    });
    
  } catch (error) {
    logger.error('Error fetching progress:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Generate route coordinates (enhanced with realistic waypoints)
 */
function generateRouteCoordinates(convoy) {
  const coords = [];
  const numPoints = 20; // More points for smoother route
  
  for (let i = 0; i <= numPoints; i++) {
    const ratio = i / numPoints;
    // Add slight curve variation for realistic roads
    const curveFactor = Math.sin(ratio * Math.PI) * 0.01;
    const lat = convoy.origin.lat + (convoy.destination.lat - convoy.origin.lat) * ratio + curveFactor;
    const lng = convoy.origin.lng + (convoy.destination.lng - convoy.origin.lng) * ratio + curveFactor;
    coords.push([lng, lat]);
  }
  
  return coords;
}

/**
 * Calculate distance between two points (Haversine formula)
 */
function calculateDistance(point1, point2) {
  const R = 6371; // Earth radius in km
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
 * Calculate total route distance
 */
function calculateRouteDistance(coordinates) {
  let totalDistance = 0;
  for (let i = 0; i < coordinates.length - 1; i++) {
    const p1 = { lat: coordinates[i][1], lng: coordinates[i][0] };
    const p2 = { lat: coordinates[i + 1][1], lng: coordinates[i + 1][0] };
    totalDistance += calculateDistance(p1, p2);
  }
  return totalDistance;
}

/**
 * Calculate bearing between two points
 */
function calculateBearing(point1, point2) {
  const dLng = (point2.lng - point1.lng) * Math.PI / 180;
  const lat1 = point1.lat * Math.PI / 180;
  const lat2 = point2.lat * Math.PI / 180;
  
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) -
            Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  const bearing = Math.atan2(y, x) * 180 / Math.PI;
  
  return (bearing + 360) % 360;
}

/**
 * Calculate initial heading
 */
function calculateInitialHeading(origin, destination) {
  return calculateBearing(origin, destination);
}

/**
 * Calculate ETA
 */
function calculateETA(distanceKm, speedKmph) {
  if (speedKmph === 0) return 'N/A';
  const hours = distanceKm / speedKmph;
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return `${h}h ${m}m`;
}

/**
 * Generate enhanced checkpoints with terrain data
 */
function generateEnhancedCheckpoints(convoy, routeCoordinates, totalDistance) {
  const checkpoints = [];
  const numCheckpoints = 6;
  
  const terrainTypes = ['ROAD', 'BRIDGE', 'MOUNTAIN', 'FOREST', 'URBAN', 'HIGHWAY'];
  
  for (let i = 0; i <= numCheckpoints; i++) {
    const ratio = i / numCheckpoints;
    const pointIndex = Math.floor(ratio * (routeCoordinates.length - 1));
    const coord = routeCoordinates[pointIndex];
    const distance = totalDistance * ratio;

    checkpoints.push({
      id: `checkpoint-${i + 1}`,
      name: i === 0 ? convoy.origin.name || 'Origin' : i === numCheckpoints ? convoy.destination.name || 'Destination' : `Checkpoint ${i}`,
      position: { lat: coord[1], lng: coord[0] },
      distance,
      status: 'PENDING',
      terrain: terrainTypes[i % terrainTypes.length],
      eta: calculateCheckpointETA(distance, 45)
    });
  }

  return checkpoints;
}

/**
 * Calculate checkpoint ETA
 */
function calculateCheckpointETA(distance, speed) {
  const hours = distance / speed;
  const minutes = Math.round(hours * 60);
  return `${minutes}min`;
}

/**
 * Determine terrain type based on coordinates
 */
function determineTerrain(coord) {
  // Simplified terrain detection (in production, use elevation API)
  const terrainTypes = ['ROAD', 'FOREST', 'MOUNTAIN', 'URBAN', 'PLAINS'];
  return terrainTypes[Math.floor(Math.random() * terrainTypes.length)];
}

module.exports = router;