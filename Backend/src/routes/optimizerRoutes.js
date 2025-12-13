const express = require('express');
const router = express.Router();
const axios = require('axios');
const optimizerService = require('../services/optimizerService');
const logger = require('../config/logger');

// Multi-route optimization endpoint - Returns 3 route alternatives with REAL road-based paths
router.post('/route/alternatives', async (req, res) => {
  try {
    const { origin, destination, waypoints } = req.body;
    
    if (!origin || !destination) {
      return res.status(400).json({
        success: false,
        error: 'Origin and destination are required'
      });
    }
    
    // Generate 3 routes with different Mapbox routing profiles for REAL road paths
    const strategies = [
      {
        name: 'SAFEST',
        mapboxProfile: 'mapbox/driving',
        mapboxOptions: {
          exclude: 'motorway', // Avoid highways for safety
          alternatives: true,
        },
        color: '#22c55e', // Green
        icon: '🛡️',
        description: 'Prioritizes safety - avoids highways and high-speed roads'
      },
      {
        name: 'BALANCED',
        mapboxProfile: 'mapbox/driving',
        mapboxOptions: {
          alternatives: true,
        },
        color: '#eab308', // Yellow
        icon: '⚖️',
        description: 'Balanced route - optimal mix of safety and efficiency'
      },
      {
        name: 'FASTEST',
        mapboxProfile: 'mapbox/driving-traffic',
        mapboxOptions: {
          alternatives: true,
          annotations: 'duration,distance',
        },
        color: '#ef4444', // Red
        icon: '⚡',
        description: 'Fastest route - prioritizes speed with real-time traffic'
      }
    ];
    
    // Fetch real routes from Mapbox for each strategy
    const routePromises = strategies.map(async (strategy) => {
      const mapboxRoute = await fetchMapboxRoute(origin, destination, strategy);
      
      if (!mapboxRoute) {
        // Fallback to basic route if Mapbox fails
        logger.warn(`Mapbox route failed for ${strategy.name}, using fallback`);
        return createFallbackRoute(origin, destination, strategy);
      }
      
      return {
        strategyName: strategy.name,
        strategyIcon: strategy.icon,
        description: strategy.description,
        color: strategy.color,
        route: {
          polyline: mapboxRoute.geometry.coordinates,
          distanceKm: mapboxRoute.distance / 1000, // Convert meters to km
          etaHours: mapboxRoute.duration / 3600, // Convert seconds to hours
          segments: mapboxRoute.legs ? mapboxRoute.legs.map((leg, idx) => ({
            id: `seg-${strategy.name}-${idx}`,
            coordinates: leg.steps ? leg.steps.map(s => s.geometry?.coordinates).flat().filter(Boolean) : [],
            terrain: 'URBAN',
            difficulty: strategy.name === 'SAFEST' ? 'EASY' : strategy.name === 'FASTEST' ? 'MEDIUM' : 'EASY',
            recommendedSpeedKmph: strategy.name === 'FASTEST' ? 80 : strategy.name === 'SAFEST' ? 50 : 65,
            riskLevel: strategy.name === 'SAFEST' ? 0.2 : strategy.name === 'FASTEST' ? 0.6 : 0.4,
            status: 'CLEAR',
            distanceKm: leg.distance / 1000,
            durationHours: leg.duration / 3600,
          })) : [],
          checkpoints: [],
          optimizationScore: 0.85,
          optimizedBy: 'Mapbox Directions API'
        },
        metrics: {
          totalDistanceKm: Math.round(mapboxRoute.distance / 100) / 10, // Convert to km with 1 decimal
          estimatedDurationHours: Math.round(mapboxRoute.duration / 36) / 100, // Convert to hours with 2 decimals
          segmentCount: mapboxRoute.legs ? mapboxRoute.legs.length : 1,
          checkpointCount: 0,
          optimizationScore: 0.85,
          riskLevel: calculateRiskLevel(strategy.name)
        }
      };
    });
    
    const alternatives = await Promise.all(routePromises);
    
    // Find the fastest route as baseline for comparisons
    const fastest = alternatives.reduce((best, curr) =>
      curr.metrics.estimatedDurationHours < best.metrics.estimatedDurationHours ? curr : best
    , alternatives[0]);
    
    // Calculate comparison metrics and display properties
    const enrichedAlternatives = alternatives.map(alt => {
      const distanceDelta = alt.metrics.totalDistanceKm - fastest.metrics.totalDistanceKm;
      const timeDeltaHrs = alt.metrics.estimatedDurationHours - fastest.metrics.estimatedDurationHours;
      const delayMinutes = Math.round(timeDeltaHrs * 60);
      
      return {
        ...alt,
        display: {
          primaryStroke: alt.color,
          secondaryStroke: getLightVariant(alt.color),
          isFastest: alt.strategyName === fastest.strategyName
        },
        comparison: {
          distanceVsFastest: calculatePercentDiff(
            alt.metrics.totalDistanceKm,
            fastest.metrics.totalDistanceKm
          ),
          timeVsFastest: calculatePercentDiff(
            alt.metrics.estimatedDurationHours,
            fastest.metrics.estimatedDurationHours
          ),
          distanceDeltaKm: Math.round(distanceDelta * 10) / 10,
          delayMinutes: delayMinutes
        },
        recommendation: generateRecommendation(alt)
      };
    });
    
    logger.info('Generated real-world route alternatives', {
      origin: origin.name,
      destination: destination.name,
      alternativeCount: alternatives.length,
      source: 'Mapbox Directions API'
    });
    
    res.json({
      success: true,
      data: {
        alternatives: enrichedAlternatives,
        recommendation: selectBestRoute(enrichedAlternatives),
        metadata: {
          origin,
          destination,
          generatedAt: new Date().toISOString(),
          optimizedBy: 'Mapbox Directions API + Military Strategy Optimization'
        }
      }
    });
    
  } catch (error) {
    logger.error('Error generating route alternatives:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Fetch real route from Mapbox Directions API
async function fetchMapboxRoute(origin, destination, strategy) {
  const token = process.env.MAPBOX_TOKEN || process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  
  if (!token) {
    logger.error('Mapbox token not configured');
    return null;
  }

  try {
    // Build coordinates string: lng,lat;lng,lat
    const coords = `${origin.lng},${origin.lat};${destination.lng},${destination.lat}`;
    
    // Build URL with routing profile
    const url = `https://api.mapbox.com/directions/v5/${strategy.mapboxProfile}/${coords}`;
    
    // Build query parameters
    const params = new URLSearchParams({
      access_token: token,
      geometries: 'geojson',
      overview: 'full',
      steps: 'true',
      alternatives: 'true', // Request multiple route alternatives
      continue_straight: 'false', // Allow turns for more realistic routes
    });

    // Add strategy-specific exclusions
    if (strategy.mapboxOptions?.exclude) {
      params.append('exclude', strategy.mapboxOptions.exclude);
    }

    // Add annotations for traffic-aware routing
    if (strategy.mapboxOptions?.annotations) {
      params.append('annotations', strategy.mapboxOptions.annotations);
    }

    const response = await axios.get(`${url}?${params.toString()}`, {
      timeout: 10000 // 10 second timeout
    });

    const data = response.data;
    
    if (data?.code !== 'Ok' || !data.routes?.length) {
      logger.warn(`Mapbox returned no routes for ${strategy.name}`);
      return null;
    }

    // For different strategies, pick different route alternatives if available
    let routeIndex = 0;
    if (strategy.name === 'SAFEST' && data.routes.length > 2) {
      routeIndex = 2; // Pick 3rd alternative for safest
    } else if (strategy.name === 'BALANCED' && data.routes.length > 1) {
      routeIndex = 1; // Pick 2nd alternative for balanced
    } else {
      routeIndex = 0; // Pick 1st (fastest) for FASTEST strategy
    }

    const selectedRoute = data.routes[routeIndex] || data.routes[0];
    
    logger.info(`Mapbox route fetched for ${strategy.name}`, {
      distance: selectedRoute.distance,
      duration: selectedRoute.duration,
      legs: selectedRoute.legs?.length || 0
    });

    return selectedRoute;

  } catch (error) {
    logger.error(`Mapbox API error for ${strategy.name}:`, {
      message: error.message,
      response: error.response?.data
    });
    return null;
  }
}

// Create fallback route if Mapbox fails (simple straight line with some waypoints)
function createFallbackRoute(origin, destination, strategy) {
  const distance = haversine(origin.lng, origin.lat, destination.lng, destination.lat);
  const baseSpeed = strategy.name === 'FASTEST' ? 80 : strategy.name === 'SAFEST' ? 50 : 65;
  const duration = distance / baseSpeed;

  // Create a simple polyline with a mid-point for slight curve
  const midPoint = {
    lat: (origin.lat + destination.lat) / 2,
    lng: (origin.lng + destination.lng) / 2
  };

  const polyline = [
    [origin.lng, origin.lat],
    [midPoint.lng, midPoint.lat],
    [destination.lng, destination.lat]
  ];

  return {
    strategyName: strategy.name,
    strategyIcon: strategy.icon,
    description: strategy.description + ' (Fallback route)',
    color: strategy.color,
    route: {
      polyline: polyline,
      distanceKm: distance,
      etaHours: duration,
      segments: [{
        id: `seg-fallback-${strategy.name}`,
        coordinates: polyline,
        terrain: 'URBAN',
        difficulty: 'MEDIUM',
        recommendedSpeedKmph: baseSpeed,
        riskLevel: 0.4,
        status: 'CLEAR',
        distanceKm: distance,
        durationHours: duration,
      }],
      checkpoints: [],
      optimizationScore: 0.6,
      optimizedBy: 'Fallback Algorithm'
    },
    metrics: {
      totalDistanceKm: Math.round(distance * 10) / 10,
      estimatedDurationHours: Math.round(duration * 100) / 100,
      segmentCount: 1,
      checkpointCount: 0,
      optimizationScore: 0.6,
      riskLevel: calculateRiskLevel(strategy.name)
    }
  };
}

// Helper: Calculate risk level based on strategy
function calculateRiskLevel(strategyName) {
  switch (strategyName) {
    case 'SAFEST':
      return { level: 'LOW', stars: 5, color: '#22c55e' };
    case 'BALANCED':
      return { level: 'MEDIUM', stars: 3, color: '#eab308' };
    case 'FASTEST':
      return { level: 'MEDIUM-HIGH', stars: 2, color: '#f97316' };
    default:
      return { level: 'MEDIUM', stars: 3, color: '#eab308' };
  }
}

// Helper: Calculate percentage difference
function calculatePercentDiff(value, baseline) {
  if (baseline === 0) return 0;
  const diff = ((value - baseline) / baseline) * 100;
  return Math.round(diff * 10) / 10;
}

// Helper: Generate recommendation for each route
function generateRecommendation(alternative) {
  const { strategyName, metrics } = alternative;
  
  switch (strategyName) {
    case 'SAFEST':
      return {
        title: 'Best for: High-value cargo or VIP transport',
        pros: ['Avoids high-speed highways', 'Safer road conditions', 'Better control and visibility'],
        cons: ['Longer distance', 'More time required', 'May use smaller roads']
      };
    case 'BALANCED':
      return {
        title: 'Best for: Standard military operations',
        pros: ['Optimal risk/reward ratio', 'Moderate fuel usage', 'Flexible timing'],
        cons: ['Not the fastest', 'Not the safest', 'Compromise on both ends']
      };
    case 'FASTEST':
      return {
        title: 'Best for: Emergency response or time-critical missions',
        pros: ['Shortest time', 'Real-time traffic optimization', 'Direct highways'],
        cons: ['Higher risk exposure', 'High-speed travel', 'Less reaction time']
      };
    default:
      return { title: 'Standard route', pros: [], cons: [] };
  }
}

// Helper: Select best overall route based on scoring
function selectBestRoute(alternatives) {
  // Score each route based on multiple factors
  const scored = alternatives.map(alt => {
    const distanceScore = 100 - Math.abs(alt.comparison.distanceVsFastest);
    const timeScore = 100 - Math.abs(alt.comparison.timeVsFastest);
    const riskScore = alt.metrics.riskLevel.stars * 20;
    const optimizationScore = alt.metrics.optimizationScore * 100;
    
    const totalScore = (distanceScore * 0.3) + 
                       (timeScore * 0.3) + 
                       (riskScore * 0.3) + 
                       (optimizationScore * 0.1);
    
    return {
      ...alt,
      totalScore: Math.round(totalScore)
    };
  });
  
  // Return the highest scoring route (usually BALANCED)
  const best = scored.reduce((max, curr) => 
    curr.totalScore > max.totalScore ? curr : max
  );
  
  return {
    strategyName: best.strategyName,
    reason: `Recommended based on optimal balance of safety, efficiency, and mission requirements (score: ${best.totalScore}/100)`,
    color: best.color,
    icon: best.icon
  };
}

function haversine(lon1, lat1, lon2, lat2) {
  const R = 6371; // Earth's radius in km
  const toRad = (x) => (x * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Helper: derive a lighter stroke color for alternate route display
function getLightVariant(color) {
  const palette = {
    '#22c55e': '#86efac', // green -> light green
    '#eab308': '#fef08a', // yellow -> light yellow
    '#ef4444': '#fca5a5'  // red -> light red
  };
  return palette[color] || '#93c5fd';
}

module.exports = router;
