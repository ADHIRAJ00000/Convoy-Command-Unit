const logger = require('../config/logger');
const Convoy = require('../models/Convoy');
const Event = require('../models/Event');
const { v4: uuidv4 } = require('uuid');

function setupSocketHandlers(io) {
  // Track connected clients
  const connectedClients = new Map();
  
  io.on('connection', (socket) => {
    logger.info(`Client connected: ${socket.id}`);
    connectedClients.set(socket.id, {
      connectedAt: new Date(),
      subscribedConvoys: new Set()
    });
    
    // Send current client count
    io.emit('clients:count', connectedClients.size);
    
    // Subscribe to specific convoy updates
    socket.on('convoy:subscribe', (convoyId) => {
      socket.join(`convoy:${convoyId}`);
      connectedClients.get(socket.id)?.subscribedConvoys.add(convoyId);
      logger.info(`Client ${socket.id} subscribed to convoy ${convoyId}`);
      socket.emit('convoy:subscribed', { convoyId });
    });
    
    // Unsubscribe from convoy
    socket.on('convoy:unsubscribe', (convoyId) => {
      socket.leave(`convoy:${convoyId}`);
      connectedClients.get(socket.id)?.subscribedConvoys.delete(convoyId);
      logger.info(`Client ${socket.id} unsubscribed from convoy ${convoyId}`);
      socket.emit('convoy:unsubscribed', { convoyId });
    });
    
    // Real-time position update from field
    socket.on('position:update', async (data) => {
      try {
        const { convoyId, lat, lng, speed } = data;
        
        const convoy = await Convoy.findOne({ id: convoyId });
        if (convoy) {
          await convoy.updatePosition(lat, lng, speed);
          
          // Broadcast to all subscribers
          io.to(`convoy:${convoyId}`).emit('convoy:position', {
            convoyId,
            position: { lat, lng },
            speed,
            timestamp: new Date()
          });
          
          // Broadcast to dashboard
          io.emit('map:update', {
            convoyId,
            position: { lat, lng },
            speed
          });
        }
      } catch (error) {
        logger.error('Error updating position:', error);
        socket.emit('error', { message: 'Failed to update position' });
      }
    });
    
    // Checkpoint logging from mobile
    socket.on('checkpoint:log', async (data) => {
      try {
        const { convoyId, checkpointId, status, remarks, lat, lng } = data;
        
        const convoy = await Convoy.findOne({ id: convoyId });
        if (convoy) {
          await convoy.logCheckpoint(checkpointId, status, remarks);
          
          // Create event
          const event = new Event({
            id: uuidv4(),
            type: 'CHECKPOINT_LOG',
            convoyId,
            convoyName: convoy.name,
            severity: 'INFO',
            title: `Checkpoint ${status}`,
            description: `${convoy.name} ${status} checkpoint ${checkpointId}`,
            location: { lat, lng, name: checkpointId },
            metadata: { checkpointId, status, remarks }
          });
          await event.save();
          
          // Broadcast checkpoint update
          io.emit('convoy:checkpoint', {
            convoyId,
            checkpointId,
            status,
            timestamp: new Date()
          });
          
          io.emit('event:created', event);
          
          socket.emit('checkpoint:logged', { success: true, event });
        }
      } catch (error) {
        logger.error('Error logging checkpoint:', error);
        socket.emit('error', { message: 'Failed to log checkpoint' });
      }
    });
    
    // Report incident/event from field
    socket.on('incident:report', async (data) => {
      try {
        const { convoyId, type, severity, description, lat, lng } = data;
        
        const convoy = await Convoy.findOne({ id: convoyId });
        const event = new Event({
          id: uuidv4(),
          type: type || 'INCIDENT',
          convoyId,
          convoyName: convoy?.name,
          severity: severity || 'WARNING',
          title: 'Field Incident Report',
          description,
          location: { lat, lng },
          metadata: data
        });
        await event.save();
        
        // Broadcast to all clients
        io.emit('event:created', event);
        
        // Alert dashboard for critical incidents
        if (severity === 'CRITICAL') {
          io.emit('alert:critical', event);
        }
        
        socket.emit('incident:reported', { success: true, event });
        logger.info(`Incident reported: ${convoyId} - ${type}`);
      } catch (error) {
        logger.error('Error reporting incident:', error);
        socket.emit('error', { message: 'Failed to report incident' });
      }
    });
    
    // Request convoy data
    socket.on('convoy:fetch', async (convoyId) => {
      try {
        const convoy = await Convoy.findOne({ id: convoyId });
        if (convoy) {
          socket.emit('convoy:data', convoy);
        } else {
          socket.emit('error', { message: 'Convoy not found' });
        }
      } catch (error) {
        logger.error('Error fetching convoy:', error);
        socket.emit('error', { message: 'Failed to fetch convoy' });
      }
    });
    
    // Request all active convoys
    socket.on('convoys:fetchAll', async () => {
      try {
        const convoys = await Convoy.find({ 
          status: { $in: ['EN_ROUTE', 'AT_CHECKPOINT', 'DELAYED'] } 
        });
        socket.emit('convoys:data', convoys);
      } catch (error) {
        logger.error('Error fetching convoys:', error);
        socket.emit('error', { message: 'Failed to fetch convoys' });
      }
    });
    
    // Acknowledge event
    socket.on('event:acknowledge', async (data) => {
      try {
        const { eventId, userId } = data;
        const event = await Event.findOne({ id: eventId });
        
        if (event) {
          await event.acknowledge(userId);
          io.emit('event:acknowledged', { eventId, userId });
          socket.emit('event:ack:success', { eventId });
        }
      } catch (error) {
        logger.error('Error acknowledging event:', error);
        socket.emit('error', { message: 'Failed to acknowledge event' });
      }
    });
    
    // Handle disconnection
    socket.on('disconnect', () => {
      logger.info(`Client disconnected: ${socket.id}`);
      connectedClients.delete(socket.id);
      io.emit('clients:count', connectedClients.size);
    });
    
    // Error handling
    socket.on('error', (error) => {
      logger.error('Socket error:', error);
    });
  });
  
  logger.info('Socket.IO handlers initialized');
}

module.exports = { setupSocketHandlers };
