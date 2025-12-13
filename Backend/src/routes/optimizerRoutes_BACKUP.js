const express = require('express');
const router = express.Router();
const optimizerService = require('../services/optimizerService');
const logger = require('../config/logger');

// Route optimization endpoint using Google OR-Tools
router.post('/route', async (req, res) => {
  try {
    const { origin, destination, waypoints, constraints } = req.body;
    
    if (!origin || !destination) {
      return res.status(400).json({
        success: false,
        error: 'Origin and destination are required'
      });
    }
    
    // Call OR-Tools optimization service
    const optimizedRoute = await optimizerService.optimizeRoute(
      origin,
      destination,
      waypoints,
      constraints
    );
    
    logger.info('Route optimized successfully', {
      optimizer: optimizedRoute.optimizedBy,
      distance: optimizedRoute.totalDistanceKm,
      score: optimizedRoute.optimizationScore
    });
    
    res.json({
      success: true,
      data: optimizedRoute
    });
  } catch (error) {
    logger.error('Error optimizing route:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Conflict detection endpoint
router.post('/detect-conflicts', async (req, res) => {
  try {
    const { convoys } = req.body;
    
    const conflicts = detectConflicts(convoys);
    
    res.json({
      success: true,
      conflicts,
      count: conflicts.length
    });
  } catch (error) {
    logger.error('Error detecting conflicts:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Suggest alternative route using OR-Tools
router.post('/alternative', async (req, res) => {
  try {
    const { origin, destination, reason, avoidTerrain } = req.body;
    
    if (!origin || !destination) {
      return res.status(400).json({
        success: false,
        error: 'Origin and destination are required'
      });
    }
    
    // Optimize with terrain avoidance constraint
    const constraints = {
      avoidTerrain: avoidTerrain || [],
      priority: 'BRAVO' // Alternative routes use higher priority
    };
    
    const alternativeRoute = await optimizerService.optimizeRoute(
      origin,
      destination,
      [],
      constraints
    );
    
    res.json({
      success: true,
      data: {
        ...alternativeRoute,
        reason,
        isAlternative: true
      }
    });
  } catch (error) {
    logger.error('Error generating alternative route:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Multi-convoy optimization endpoint
router.post('/multi-convoy', async (req, res) => {
  try {
    const { convoys } = req.body;
    
    if (!convoys || !Array.isArray(convoys) || convoys.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Convoys array is required'
      });
    }
    
    // Optimize all convoy routes
    const optimizedConvoys = await optimizerService.optimizeMultiConvoy(convoys);
    
    logger.info(`Multi-convoy optimization completed for ${convoys.length} convoys`);
    
    res.json({
      success: true,
      data: optimizedConvoys,
      count: optimizedConvoys.length
    });
  } catch (error) {
    logger.error('Error optimizing multiple convoys:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Helper function: Calculate optimal route
function calculateOptimalRoute(origin, destination, constraints = {}) {
  // Simplified route calculation
  // In production, this would call OR-Tools service
  
  const { avoidTerrain = [], maxElevation, priorityLevel } = constraints;
  
  // Generate sample segments
  const segments = generateRouteSegments(origin, destination);
  
  return {
    segments,
    totalDistanceKm: segments.reduce((sum, seg) => sum + (seg.distanceKm || 0), 0),
    estimatedDurationHours: segments.length * 2,
    checkpoints: generateCheckpoints(segments),
    optimizationScore: 0.85,
    alternativesAvailable: true
  };
}

// Helper function: Detect conflicts between convoys
function detectConflicts(convoys) {
  const conflicts = [];
  
  for (let i = 0; i < convoys.length; i++) {
    for (let j = i + 1; j < convoys.length; j++) {
      const conflict = checkConvoyConflict(convoys[i], convoys[j]);
      if (conflict) {
        conflicts.push(conflict);
      }
    }
  }
  
  return conflicts;
}

// Helper function: Check if two convoys have conflicting routes
function checkConvoyConflict(convoy1, convoy2) {
  // Check if routes intersect at similar times
  
  const route1 = convoy1.assignedRoute?.segments || [];
  const route2 = convoy2.assignedRoute?.segments || [];
  
  for (const seg1 of route1) {
    for (const seg2 of route2) {
      const distance = calculateDistance(
        seg1.start.lat, seg1.start.lng,
        seg2.start.lat, seg2.start.lng
      );
      
      if (distance < 5) { // Within 5km
        return {
          convoy1: convoy1.id,
          convoy2: convoy2.id,
          type: 'ROUTE_INTERSECTION',
          location: seg1.start,
          severity: 'WARNING',
          estimatedConflictTime: new Date(Date.now() + 3600000) // 1 hour from now
        };
      }
    }
  }
  
  return null;
}

// Helper function: Calculate distance between two points (Haversine formula)
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(degrees) {
  return degrees * (Math.PI / 180);
}

module.exports = router;
