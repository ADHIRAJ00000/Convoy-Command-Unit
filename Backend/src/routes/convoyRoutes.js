const express = require('express');
const router = express.Router();
const Convoy = require('../models/Convoy');
const { getRedisClient } = require('../config/redis');
const logger = require('../config/logger');

// Get all convoys
router.get('/', async (req, res) => {
  try {
    const { status, priority, unitType } = req.query;
    const filter = {};
    
    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (unitType) filter.unitType = unitType;

    const convoys = await Convoy.find(filter).sort({ lastUpdated: -1 });
    
    res.json({
      success: true,
      count: convoys.length,
      data: convoys
    });
  } catch (error) {
    logger.error('Error fetching convoys:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get convoy by ID
router.get('/:id', async (req, res) => {
  try {
    const convoy = await Convoy.findOne({ id: req.params.id });
    
    if (!convoy) {
      return res.status(404).json({ success: false, error: 'Convoy not found' });
    }
    
    res.json({ success: true, data: convoy });
  } catch (error) {
    logger.error('Error fetching convoy:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create new convoy
router.post('/', async (req, res) => {
  try {
    const convoy = new Convoy(req.body);
    await convoy.save();
    
    // Broadcast to all connected clients
    const io = req.app.get('io');
    io.emit('convoy:created', convoy);
    
    logger.info(`Convoy created: ${convoy.id}`);
    res.status(201).json({ success: true, data: convoy });
  } catch (error) {
    logger.error('Error creating convoy:', error);
    res.status(400).json({ success: false, error: error.message });
  }
});

// Update convoy
router.put('/:id', async (req, res) => {
  try {
    const convoy = await Convoy.findOneAndUpdate(
      { id: req.params.id },
      { ...req.body, lastUpdated: new Date() },
      { new: true, runValidators: true }
    );
    
    if (!convoy) {
      return res.status(404).json({ success: false, error: 'Convoy not found' });
    }
    
    // Broadcast update
    const io = req.app.get('io');
    io.emit('convoy:updated', convoy);
    
    logger.info(`Convoy updated: ${convoy.id}`);
    res.json({ success: true, data: convoy });
  } catch (error) {
    logger.error('Error updating convoy:', error);
    res.status(400).json({ success: false, error: error.message });
  }
});

// Update convoy position (real-time tracking)
router.patch('/:id/position', async (req, res) => {
  try {
    const { lat, lng, speed } = req.body;
    const convoy = await Convoy.findOne({ id: req.params.id });
    
    if (!convoy) {
      return res.status(404).json({ success: false, error: 'Convoy not found' });
    }
    
    await convoy.updatePosition(lat, lng, speed);
    
    // Broadcast position update
    const io = req.app.get('io');
    io.emit('convoy:position', {
      convoyId: convoy.id,
      position: { lat, lng },
      speed,
      timestamp: new Date()
    });
    
    // Cache in Redis for quick access
    const redis = getRedisClient();
    if (redis) {
      await redis.set(
        `convoy:position:${convoy.id}`,
        JSON.stringify({ lat, lng, speed, timestamp: Date.now() }),
        { EX: 60 } // 60 seconds expiry
      );
    }
    
    res.json({ success: true, data: convoy });
  } catch (error) {
    logger.error('Error updating position:', error);
    res.status(400).json({ success: false, error: error.message });
  }
});

// Log checkpoint arrival
router.post('/:id/checkpoint/:checkpointId', async (req, res) => {
  try {
    const { status, remarks } = req.body;
    const convoy = await Convoy.findOne({ id: req.params.id });
    
    if (!convoy) {
      return res.status(404).json({ success: false, error: 'Convoy not found' });
    }
    
    await convoy.logCheckpoint(req.params.checkpointId, status, remarks);
    
    // Broadcast checkpoint event
    const io = req.app.get('io');
    io.emit('convoy:checkpoint', {
      convoyId: convoy.id,
      checkpointId: req.params.checkpointId,
      status,
      timestamp: new Date()
    });
    
    logger.info(`Checkpoint logged: ${convoy.id} - ${req.params.checkpointId}`);
    res.json({ success: true, data: convoy });
  } catch (error) {
    logger.error('Error logging checkpoint:', error);
    res.status(400).json({ success: false, error: error.message });
  }
});

// Delete convoy
router.delete('/:id', async (req, res) => {
  try {
    const convoy = await Convoy.findOneAndDelete({ id: req.params.id });
    
    if (!convoy) {
      return res.status(404).json({ success: false, error: 'Convoy not found' });
    }
    
    // Broadcast deletion
    const io = req.app.get('io');
    io.emit('convoy:deleted', { convoyId: req.params.id });
    
    logger.info(`Convoy deleted: ${convoy.id}`);
    res.json({ success: true, message: 'Convoy deleted' });
  } catch (error) {
    logger.error('Error deleting convoy:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
