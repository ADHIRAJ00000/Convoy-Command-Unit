const Convoy = require('../models/Convoy');
const Event = require('../models/Event');
const logger = require('../config/logger');
const { v4: uuidv4 } = require('uuid');

let simulationInterval = null;
let isSimulating = false;

/**
 * Start real-time convoy simulation
 * Updates convoy positions and generates events
 */
function startConvoySimulation(io) {
  if (isSimulating) {
    logger.warn('Simulation already running');
    return;
  }
  
  const UPDATE_INTERVAL = parseInt(process.env.CONVOY_UPDATE_INTERVAL) || 5000;
  
  simulationInterval = setInterval(async () => {
    try {
      // Get all active convoys
      const activeConvoys = await Convoy.find({ 
        status: { $in: ['EN_ROUTE', 'AT_CHECKPOINT'] } 
      });
      
      for (const convoy of activeConvoys) {
        await simulateConvoyMovement(convoy, io);
      }
      
    } catch (error) {
      logger.error('Simulation error:', error);
    }
  }, UPDATE_INTERVAL);
  
  isSimulating = true;
  logger.info(`🎮 Convoy simulation started (interval: ${UPDATE_INTERVAL}ms)`);
}

/**
 * Stop convoy simulation
 */
function stopConvoySimulation() {
  if (simulationInterval) {
    clearInterval(simulationInterval);
    simulationInterval = null;
    isSimulating = false;
    logger.info('Convoy simulation stopped');
  }
}

/**
 * Simulate movement for a single convoy
 */
async function simulateConvoyMovement(convoy, io) {
  try {
    if (!convoy.assignedRoute || !convoy.assignedRoute.segments) {
      return;
    }
    
    const route = convoy.assignedRoute;
    const currentPos = convoy.currentPosition;
    const destination = convoy.destination;
    
    // Calculate next position (move towards destination)
    const speed = convoy.speedKmph || 45;
    const moveDistance = (speed / 3600) * 5; // Distance covered in 5 seconds (km)
    
    const newPosition = calculateNextPosition(
      currentPos.lat,
      currentPos.lng,
      destination.lat,
      destination.lng,
      moveDistance
    );
    
    // Check if reached destination
    const distanceToDestination = calculateDistance(
      newPosition.lat,
      newPosition.lng,
      destination.lat,
      destination.lng
    );
    
    if (distanceToDestination < 1) {
      // Arrived at destination
      convoy.status = 'COMPLETED';
      convoy.currentPosition = destination;
      await convoy.save();
      
      // Create completion event
      const event = new Event({
        id: uuidv4(),
        type: 'CHECKPOINT_LOG',
        convoyId: convoy.id,
        convoyName: convoy.name,
        severity: 'INFO',
        title: 'Mission Complete',
        description: `${convoy.name} has reached destination: ${destination.name}`,
        location: destination
      });
      await event.save();
      
      io.emit('convoy:completed', { convoyId: convoy.id, convoy });
      io.emit('event:created', event);
      
      logger.info(`Convoy ${convoy.id} completed mission`);
      return;
    }
    
    // Update position
    await convoy.updatePosition(newPosition.lat, newPosition.lng, speed);
    
    // Broadcast position update
    io.emit('convoy:position', {
      convoyId: convoy.id,
      position: newPosition,
      speed,
      timestamp: new Date()
    });
    
    // Check for checkpoint proximity
    const nearbyCheckpoint = findNearbyCheckpoint(newPosition, route.checkpoints);
    if (nearbyCheckpoint && nearbyCheckpoint.status === 'PENDING') {
      await handleCheckpointArrival(convoy, nearbyCheckpoint, io);
    }
    
    // Randomly generate events (10% chance per update)
    if (Math.random() < 0.1) {
      await generateRandomEvent(convoy, io);
    }
    
  } catch (error) {
    logger.error(`Error simulating convoy ${convoy.id}:`, error);
  }
}

/**
 * Calculate next position along route
 */
function calculateNextPosition(lat1, lng1, lat2, lng2, distanceKm) {
  const R = 6371; // Earth radius in km
  const bearing = calculateBearing(lat1, lng1, lat2, lng2);
  
  const lat1Rad = toRad(lat1);
  const lng1Rad = toRad(lng1);
  const bearingRad = toRad(bearing);
  
  const lat2Rad = Math.asin(
    Math.sin(lat1Rad) * Math.cos(distanceKm / R) +
    Math.cos(lat1Rad) * Math.sin(distanceKm / R) * Math.cos(bearingRad)
  );
  
  const lng2Rad = lng1Rad + Math.atan2(
    Math.sin(bearingRad) * Math.sin(distanceKm / R) * Math.cos(lat1Rad),
    Math.cos(distanceKm / R) - Math.sin(lat1Rad) * Math.sin(lat2Rad)
  );
  
  return {
    lat: toDeg(lat2Rad),
    lng: toDeg(lng2Rad)
  };
}

/**
 * Calculate bearing between two points
 */
function calculateBearing(lat1, lng1, lat2, lng2) {
  const lat1Rad = toRad(lat1);
  const lat2Rad = toRad(lat2);
  const dLng = toRad(lng2 - lng1);
  
  const y = Math.sin(dLng) * Math.cos(lat2Rad);
  const x = Math.cos(lat1Rad) * Math.sin(lat2Rad) -
    Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLng);
  
  const bearing = Math.atan2(y, x);
  return (toDeg(bearing) + 360) % 360;
}

/**
 * Calculate distance between two points
 */
function calculateDistance(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Find checkpoint within proximity
 */
function findNearbyCheckpoint(position, checkpoints) {
  const PROXIMITY_KM = 2; // 2km radius
  
  if (!checkpoints || checkpoints.length === 0) {
    return null;
  }
  
  for (const checkpoint of checkpoints) {
    // Handle both formats: checkpoint.position or checkpoint itself
    const checkpointPos = checkpoint.position || checkpoint;
    
    if (!checkpointPos || !checkpointPos.lat || !checkpointPos.lng) {
      continue;
    }
    
    const distance = calculateDistance(
      position.lat,
      position.lng,
      checkpointPos.lat,
      checkpointPos.lng
    );
    
    if (distance <= PROXIMITY_KM) {
      return checkpoint;
    }
  }
  
  return null;
}

/**
 * Handle checkpoint arrival
 */
async function handleCheckpointArrival(convoy, checkpoint, io) {
  checkpoint.status = 'ARRIVED';
  checkpoint.ata = new Date();
  
  if (checkpoint.eta) {
    const delay = (checkpoint.ata - checkpoint.eta) / (1000 * 60);
    checkpoint.delay = delay > 0 ? delay : 0;
  }
  
  await convoy.save();
  
  // Create checkpoint event
  const event = new Event({
    id: uuidv4(),
    type: 'CHECKPOINT_LOG',
    convoyId: convoy.id,
    convoyName: convoy.name,
    severity: 'INFO',
    title: `Checkpoint Reached`,
    description: `${convoy.name} arrived at ${checkpoint.name}`,
    location: checkpoint.position,
    metadata: { checkpointId: checkpoint.id, delay: checkpoint.delay }
  });
  await event.save();
  
  io.emit('convoy:checkpoint', {
    convoyId: convoy.id,
    checkpointId: checkpoint.id,
    status: 'ARRIVED',
    timestamp: new Date()
  });
  
  io.emit('event:created', event);
  
  logger.info(`Convoy ${convoy.id} reached checkpoint ${checkpoint.name}`);
}

/**
 * Generate random events for simulation
 */
async function generateRandomEvent(convoy, io) {
  const eventTypes = [
    { type: 'WEATHER_ALERT', severity: 'WARNING', title: 'Weather Advisory' },
    { type: 'DELAY', severity: 'WARNING', title: 'Traffic Delay' },
    { type: 'INCIDENT', severity: 'INFO', title: 'Minor Incident' }
  ];
  
  const randomEvent = eventTypes[Math.floor(Math.random() * eventTypes.length)];
  
  const event = new Event({
    id: uuidv4(),
    type: randomEvent.type,
    convoyId: convoy.id,
    convoyName: convoy.name,
    severity: randomEvent.severity,
    title: randomEvent.title,
    description: `Simulated ${randomEvent.type.toLowerCase()} event`,
    location: convoy.currentPosition
  });
  
  await event.save();
  io.emit('event:created', event);
}

// Helper functions
function toRad(degrees) {
  return degrees * (Math.PI / 180);
}

function toDeg(radians) {
  return radians * (180 / Math.PI);
}

module.exports = {
  startConvoySimulation,
  stopConvoySimulation
};
