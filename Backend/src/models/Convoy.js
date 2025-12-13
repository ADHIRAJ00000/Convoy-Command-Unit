const mongoose = require('mongoose');

const PositionSchema = new mongoose.Schema({
  lat: { type: Number, required: true },
  lng: { type: Number, required: true },
  name: String
}, { _id: false });

const SegmentSchema = new mongoose.Schema({
  id: String,
  index: Number,
  start: PositionSchema,
  end: PositionSchema,
  terrain: { 
    type: String, 
    enum: ['MOUNTAIN', 'PLAIN', 'URBAN', 'FOREST', 'DESERT'] 
  },
  recommendedSpeedKmph: Number,
  capacityVehicles: Number,
  elevation: Number,
  conditions: { 
    type: String, 
    enum: ['CLEAR', 'RAIN', 'SNOW', 'FOG', 'LANDSLIDE', 'BLOCKED'] 
  },
  difficulty: { 
    type: String, 
    enum: ['LOW', 'MEDIUM', 'HIGH', 'EXTREME'] 
  },
  distanceKm: Number
}, { _id: false });

const CheckpointSchema = new mongoose.Schema({
  id: String,
  name: { type: String, required: true },
  position: PositionSchema,
  eta: Date,
  ata: Date, // Actual Time of Arrival
  status: { 
    type: String, 
    enum: ['PENDING', 'ARRIVED', 'DEPARTED', 'DELAYED'], 
    default: 'PENDING' 
  },
  delay: Number, // in minutes
  remarks: String
}, { _id: false });

const RouteSchema = new mongoose.Schema({
  segments: [SegmentSchema],
  checkpoints: [CheckpointSchema],
  totalDistanceKm: Number,
  estimatedDurationHours: Number,
  alternativeRoutes: [{
    routeId: String,
    reason: String,
    segments: [SegmentSchema]
  }]
}, { _id: false });

const ConvoySchema = new mongoose.Schema({
  id: { type: String, unique: true, required: true },
  name: { type: String, required: true },
  origin: { type: PositionSchema, required: true },
  destination: { type: PositionSchema, required: true },
  currentPosition: { type: PositionSchema, required: true },
  speedKmph: { type: Number, default: 0 },
  priority: { 
    type: String, 
    enum: ['ALPHA', 'BRAVO', 'CHARLIE', 'DELTA'], 
    default: 'CHARLIE' 
  },
  vehicleCount: { type: Number, required: true },
  unitType: { 
    type: String, 
    enum: ['ARMY', 'AIRFORCE', 'NAVY', 'PARAMILITARY', 'LOGISTICS', 'MEDICAL'], 
    required: true 
  },
  status: { 
    type: String, 
    enum: ['PLANNED', 'EN_ROUTE', 'AT_CHECKPOINT', 'DELAYED', 'COMPLETED', 'CANCELLED'], 
    default: 'PLANNED' 
  },
  lastUpdated: { type: Date, default: Date.now },
  etaHours: Number,
  assignedRoute: RouteSchema,
  commander: {
    name: String,
    rank: String,
    contact: String
  },
  weather: {
    temperature: Number,
    conditions: String,
    visibility: String
  },
  fuel: {
    currentLevel: Number, // percentage
    rangeKm: Number
  },
  incidents: [{
    type: String,
    description: String,
    timestamp: Date,
    severity: { type: String, enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] }
  }]
}, {
  timestamps: true
});

// Indexes for performance (removed duplicate id index)
ConvoySchema.index({ status: 1 });
ConvoySchema.index({ priority: 1 });
ConvoySchema.index({ 'currentPosition.lat': 1, 'currentPosition.lng': 1 });

// Methods
ConvoySchema.methods.updatePosition = function(lat, lng, speed) {
  this.currentPosition = { lat, lng };
  this.speedKmph = speed;
  this.lastUpdated = new Date();
  return this.save();
};

ConvoySchema.methods.logCheckpoint = async function(checkpointId, status, remarks) {
  const checkpoint = this.assignedRoute.checkpoints.find(cp => cp.id === checkpointId);
  if (checkpoint) {
    checkpoint.status = status;
    checkpoint.ata = new Date();
    checkpoint.remarks = remarks;
    
    if (checkpoint.eta) {
      const delay = (checkpoint.ata - checkpoint.eta) / (1000 * 60); // minutes
      checkpoint.delay = delay > 0 ? delay : 0;
    }
  }
  this.lastUpdated = new Date();
  return this.save();
};

module.exports = mongoose.model('Convoy', ConvoySchema);
