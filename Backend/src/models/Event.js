const mongoose = require('mongoose');

const EventSchema = new mongoose.Schema({
  id: { type: String, unique: true, required: true },
  type: { 
    type: String, 
    enum: [
      'CHECKPOINT_LOG', 
      'DELAY', 
      'CONFLICT', 
      'WEATHER_ALERT', 
      'ROUTE_CHANGE', 
      'INCIDENT',
      'BLOCKAGE',
      'EMERGENCY'
    ], 
    required: true 
  },
  convoyId: { type: String, required: true, index: true },
  convoyName: String,
  severity: { 
    type: String, 
    enum: ['INFO', 'WARNING', 'CRITICAL'], 
    default: 'INFO' 
  },
  title: { type: String, required: true },
  description: String,
  location: {
    lat: Number,
    lng: Number,
    name: String
  },
  timestamp: { type: Date, default: Date.now, index: true },
  acknowledged: { type: Boolean, default: false },
  acknowledgedBy: String,
  acknowledgedAt: Date,
  resolution: {
    status: { 
      type: String, 
      enum: ['PENDING', 'IN_PROGRESS', 'RESOLVED'], 
      default: 'PENDING' 
    },
    action: String,
    resolvedAt: Date,
    resolvedBy: String
  },
  metadata: mongoose.Schema.Types.Mixed
}, {
  timestamps: true
});

// Indexes
EventSchema.index({ convoyId: 1, timestamp: -1 });
EventSchema.index({ type: 1, severity: 1 });
EventSchema.index({ acknowledged: 1 });

// Methods
EventSchema.methods.acknowledge = function(userId) {
  this.acknowledged = true;
  this.acknowledgedBy = userId;
  this.acknowledgedAt = new Date();
  return this.save();
};

EventSchema.methods.resolve = function(action, userId) {
  this.resolution.status = 'RESOLVED';
  this.resolution.action = action;
  this.resolution.resolvedAt = new Date();
  this.resolution.resolvedBy = userId;
  return this.save();
};

module.exports = mongoose.model('Event', EventSchema);
