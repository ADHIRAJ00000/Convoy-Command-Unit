const express = require('express');
const router = express.Router();
const Event = require('../models/Event');
const logger = require('../config/logger');
const { v4: uuidv4 } = require('uuid');

// Get all events
router.get('/', async (req, res) => {
  try {
    const { convoyId, type, severity, acknowledged } = req.query;
    const filter = {};
    
    if (convoyId) filter.convoyId = convoyId;
    if (type) filter.type = type;
    if (severity) filter.severity = severity;
    if (acknowledged !== undefined) filter.acknowledged = acknowledged === 'true';

    const events = await Event.find(filter)
      .sort({ timestamp: -1 })
      .limit(100);
    
    res.json({
      success: true,
      count: events.length,
      data: events
    });
  } catch (error) {
    logger.error('Error fetching events:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get event by ID
router.get('/:id', async (req, res) => {
  try {
    const event = await Event.findOne({ id: req.params.id });
    
    if (!event) {
      return res.status(404).json({ success: false, error: 'Event not found' });
    }
    
    res.json({ success: true, data: event });
  } catch (error) {
    logger.error('Error fetching event:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create new event
router.post('/', async (req, res) => {
  try {
    const eventData = {
      id: uuidv4(),
      ...req.body,
      timestamp: new Date()
    };
    
    const event = new Event(eventData);
    await event.save();
    
    // Broadcast to all connected clients
    const io = req.app.get('io');
    io.emit('event:created', event);
    
    // Send to specific convoy room if convoyId exists
    if (event.convoyId) {
      io.to(`convoy:${event.convoyId}`).emit('convoy:event', event);
    }
    
    logger.info(`Event created: ${event.type} - ${event.convoyId}`);
    res.status(201).json({ success: true, data: event });
  } catch (error) {
    logger.error('Error creating event:', error);
    res.status(400).json({ success: false, error: error.message });
  }
});

// Acknowledge event
router.patch('/:id/acknowledge', async (req, res) => {
  try {
    const { userId } = req.body;
    const event = await Event.findOne({ id: req.params.id });
    
    if (!event) {
      return res.status(404).json({ success: false, error: 'Event not found' });
    }
    
    await event.acknowledge(userId);
    
    // Broadcast acknowledgment
    const io = req.app.get('io');
    io.emit('event:acknowledged', { eventId: event.id, userId });
    
    logger.info(`Event acknowledged: ${event.id}`);
    res.json({ success: true, data: event });
  } catch (error) {
    logger.error('Error acknowledging event:', error);
    res.status(400).json({ success: false, error: error.message });
  }
});

// Resolve event
router.patch('/:id/resolve', async (req, res) => {
  try {
    const { action, userId } = req.body;
    const event = await Event.findOne({ id: req.params.id });
    
    if (!event) {
      return res.status(404).json({ success: false, error: 'Event not found' });
    }
    
    await event.resolve(action, userId);
    
    // Broadcast resolution
    const io = req.app.get('io');
    io.emit('event:resolved', { eventId: event.id, action, userId });
    
    logger.info(`Event resolved: ${event.id}`);
    res.json({ success: true, data: event });
  } catch (error) {
    logger.error('Error resolving event:', error);
    res.status(400).json({ success: false, error: error.message });
  }
});

// Delete event
router.delete('/:id', async (req, res) => {
  try {
    const event = await Event.findOneAndDelete({ id: req.params.id });
    
    if (!event) {
      return res.status(404).json({ success: false, error: 'Event not found' });
    }
    
    logger.info(`Event deleted: ${event.id}`);
    res.json({ success: true, message: 'Event deleted' });
  } catch (error) {
    logger.error('Error deleting event:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
