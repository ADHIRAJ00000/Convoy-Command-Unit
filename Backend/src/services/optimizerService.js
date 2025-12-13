const axios = require('axios');
const logger = require('../config/logger');

const OPTIMIZER_SERVICE_URL = process.env.OPTIMIZER_SERVICE_URL || 'http://localhost:5001';

class OptimizerService {
  constructor() {
    this.serviceUrl = OPTIMIZER_SERVICE_URL;
    this.timeout = 10000; // 10 seconds
  }

  /**
   * Check if OR-Tools service is available
   */
  async healthCheck() {
    try {
      const response = await axios.get(`${this.serviceUrl}/health`, {
        timeout: 3000
      });
      return response.data.status === 'healthy';
    } catch (error) {
      logger.warn('OR-Tools service not available:', error.message);
      return false;
    }
  }

  /**
   * Optimize route using Google OR-Tools VRP solver
   * @param {Object} origin - {lat, lng, name}
   * @param {Object} destination - {lat, lng, name}
   * @param {Array} waypoints - Optional waypoints
   * @param {Object} constraints - Optimization constraints
   * @returns {Promise<Object>} Optimized route
   */
  async optimizeRoute(origin, destination, waypoints = [], constraints = {}) {
    try {
      const isAvailable = await this.healthCheck();
      
      if (!isAvailable) {
        logger.warn('OR-Tools service unavailable, using fallback');
        return this.fallbackRoute(origin, destination);
      }

      logger.info('Calling OR-Tools optimizer service');
      
      const response = await axios.post(
        `${this.serviceUrl}/optimize/route`,
        {
          origin,
          destination,
          waypoints,
          constraints
        },
        {
          timeout: this.timeout,
          headers: { 'Content-Type': 'application/json' }
        }
      );

      if (response.data.success) {
        logger.info('Route optimized successfully with OR-Tools');
        return response.data.data;
      } else {
        throw new Error(response.data.error || 'Optimization failed');
      }
      
    } catch (error) {
      logger.error('OR-Tools optimization error:', error.message);
      
      // Fallback to simple route calculation
      return this.fallbackRoute(origin, destination);
    }
  }

  /**
   * Optimize routes for multiple convoys
   * @param {Array} convoys - Array of convoy objects with origin/destination
   * @returns {Promise<Object>} Optimized convoy routes
   */
  async optimizeMultiConvoy(convoys) {
    try {
      const isAvailable = await this.healthCheck();
      
      if (!isAvailable) {
        logger.warn('OR-Tools service unavailable for multi-convoy');
        return convoys.map(c => ({
          convoyId: c.id,
          route: this.fallbackRoute(c.origin, c.destination)
        }));
      }

      const response = await axios.post(
        `${this.serviceUrl}/optimize/multi-convoy`,
        { convoys },
        {
          timeout: this.timeout * 2, // More time for multiple convoys
          headers: { 'Content-Type': 'application/json' }
        }
      );

      if (response.data.success) {
        logger.info(`Multi-convoy optimization completed for ${convoys.length} convoys`);
        return response.data.data;
      } else {
        throw new Error(response.data.error || 'Multi-convoy optimization failed');
      }
      
    } catch (error) {
      logger.error('Multi-convoy optimization error:', error.message);
      
      // Fallback: optimize each convoy separately
      return convoys.map(c => ({
        convoyId: c.id,
        route: this.fallbackRoute(c.origin, c.destination)
      }));
    }
  }

  /**
   * Fallback route calculation (simple direct route)
   * Used when OR-Tools service is unavailable
   */
  fallbackRoute(origin, destination) {
    const distance = this.haversineDistance(
      origin.lat, origin.lng,
      destination.lat, destination.lng
    );

    // Generate intermediate checkpoints for fallback routes too
    const checkpoints = this.generateCheckpointsForDistance(
      origin, 
      destination, 
      distance, 
      'PLAIN'
    );

    return {
      segments: [{
        id: 'seg-fallback-0',
        index: 0,
        start: origin,
        end: destination,
        terrain: 'PLAIN',
        distanceKm: Math.round(distance * 100) / 100,
        recommendedSpeedKmph: 50,
        elevation: 1000,
        conditions: 'CLEAR',
        difficulty: 'MEDIUM'
      }],
      totalDistanceKm: Math.round(distance * 100) / 100,
      estimatedDurationHours: Math.round(distance / 50 * 100) / 100,
      checkpoints: checkpoints,
      optimizationScore: 0.65,
      optimizedBy: 'Fallback (Direct Route)',
      alternativesAvailable: false
    };
  }

  /**
   * Generate checkpoints dynamically based on distance and terrain
   * Creates checkpoints every 40-70km depending on terrain type
   */
  generateCheckpointsForDistance(origin, destination, totalDistance, terrain = 'PLAIN') {
    const checkpoints = [];
    
    // Checkpoint intervals by terrain
    const intervals = {
      'MOUNTAIN': 40,
      'FOREST': 50,
      'DESERT': 60,
      'URBAN': 30,
      'PLAIN': 70
    };
    
    const interval = intervals[terrain] || 50;
    
    // Only create intermediate checkpoints if distance is long enough
    if (totalDistance > interval) {
      const numCheckpoints = Math.floor(totalDistance / interval);
      
      for (let i = 1; i <= numCheckpoints; i++) {
        const ratio = i / (numCheckpoints + 1);
        const checkpointPos = {
          lat: origin.lat + (destination.lat - origin.lat) * ratio,
          lng: origin.lng + (destination.lng - origin.lng) * ratio
        };
        
        const distanceFromOrigin = totalDistance * ratio;
        const checkpointName = this.generateCheckpointName(terrain, distanceFromOrigin, i);
        
        // Calculate ETA
        const hoursFromOrigin = distanceFromOrigin / 50; // 50 km/h average
        const eta = new Date(Date.now() + hoursFromOrigin * 3600000);
        
        checkpoints.push({
          id: `cp-fallback-${i}`,
          name: checkpointName,
          position: checkpointPos,
          status: 'PENDING',
          type: 'INTERMEDIATE',
          terrain: terrain,
          distanceFromOrigin: Math.round(distanceFromOrigin * 100) / 100,
          eta: eta.toISOString()
        });
      }
    }
    
    // Add final destination checkpoint
    const finalEta = new Date(Date.now() + (totalDistance / 50) * 3600000);
    checkpoints.push({
      id: 'cp-fallback-dest',
      name: destination.name || 'Destination',
      position: destination,
      status: 'PENDING',
      type: 'DESTINATION',
      distanceFromOrigin: Math.round(totalDistance * 100) / 100,
      eta: finalEta.toISOString()
    });
    
    return checkpoints;
  }

  /**
   * Generate contextual checkpoint names based on terrain
   */
  generateCheckpointName(terrain, distanceKm, index) {
    const terrainFeatures = {
      'MOUNTAIN': ['Pass', 'Ridge', 'Summit', 'Valley', 'Peak'],
      'FOREST': ['Clearing', 'Grove', 'Trail Junction', 'Treeline', 'Forest Gate'],
      'DESERT': ['Oasis', 'Dune Crossing', 'Rock Formation', 'Wadi', 'Desert Post'],
      'URBAN': ['Junction', 'Intersection', 'Rest Stop', 'Urban Checkpoint', 'City Gate'],
      'PLAIN': ['Rest Area', 'Marker', 'Junction', 'Milestone', 'Rest Point']
    };
    
    const features = terrainFeatures[terrain] || ['Checkpoint'];
    const featureName = features[(index - 1) % features.length];
    
    return `${featureName} (km ${Math.round(distanceKm)})`;
  }

  /**
   * Calculate distance between two GPS coordinates using Haversine formula
   */
  haversineDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in km
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  toRad(degrees) {
    return degrees * (Math.PI / 180);
  }
}

module.exports = new OptimizerService();
