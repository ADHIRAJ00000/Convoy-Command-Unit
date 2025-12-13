const express = require('express');
const router = express.Router();
const Convoy = require('../models/Convoy');
const Event = require('../models/Event');
const logger = require('../config/logger');
const { v4: uuidv4 } = require('uuid');

// Log checkpoint arrival
router.post('/', async (req, res) => {
  try {
    const { convoyId, checkpointId, lat, lng, status, remarks } = req.body;
    
    const convoy = await Convoy.findOne({ id: convoyId });
    if (!convoy) {
      return res.status(404).json({ success: false, error: 'Convoy not found' });
    }
    
    // Update checkpoint in convoy
    await convoy.logCheckpoint(checkpointId, status || 'ARRIVED', remarks);
    
    // Create event for checkpoint log
    const event = new Event({
      id: uuidv4(),
      type: 'CHECKPOINT_LOG',
      convoyId,
      convoyName: convoy.name,
      severity: 'INFO',
      title: `Checkpoint ${status || 'ARRIVED'}`,
      description: `${convoy.name} ${status || 'arrived at'} checkpoint ${checkpointId}`,
      location: { lat, lng, name: checkpointId },
      metadata: { checkpointId, status, remarks }
    });
    await event.save();
    
    // Broadcast to all clients
    const io = req.app.get('io');
    io.emit('convoy:checkpoint', {
      convoyId,
      checkpointId,
      status,
      timestamp: new Date()
    });
    io.emit('event:created', event);
    
    logger.info(`Checkpoint logged: ${convoyId} - ${checkpointId}`);
    res.json({ 
      success: true, 
      data: { convoy, event },
      message: 'Checkpoint logged successfully'
    });
  } catch (error) {
    logger.error('Error logging checkpoint:', error);
    res.status(400).json({ success: false, error: error.message });
  }
});

// Get checkpoint history for a convoy
router.get('/:convoyId', async (req, res) => {
  try {
    const convoy = await Convoy.findOne({ id: req.params.convoyId });
    
    if (!convoy) {
      return res.status(404).json({ success: false, error: 'Convoy not found' });
    }
    
    const checkpoints = convoy.assignedRoute?.checkpoints || [];
    
    res.json({
      success: true,
      data: checkpoints,
      count: checkpoints.length
    });
  } catch (error) {
    logger.error('Error fetching checkpoint history:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
