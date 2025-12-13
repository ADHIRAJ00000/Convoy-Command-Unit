const mongoose = require('mongoose');

const ActivityLogSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  action: {
    type: String,
    required: true,
    enum: [
      'LOGIN_SUCCESS',
      'LOGIN_FAILED',
      'LOGOUT',
      'REGISTER',
      'PASSWORD_CHANGE',
      'PASSWORD_RESET_REQUEST',
      'PASSWORD_RESET_SUCCESS',
      'TOKEN_REFRESH',
      'ACCOUNT_LOCKED',
      'UNAUTHORIZED_ACCESS'
    ]
  },
  ipAddress: String,
  userAgent: String,
  device: String,
  location: String,
  details: mongoose.Schema.Types.Mixed,
  status: {
    type: String,
    enum: ['SUCCESS', 'FAILED', 'WARNING'],
    default: 'SUCCESS'
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for faster queries
ActivityLogSchema.index({ userId: 1, timestamp: -1 });
ActivityLogSchema.index({ action: 1, timestamp: -1 });

// Static method to log activity
ActivityLogSchema.statics.logActivity = async function(userId, action, req, details = {}) {
  try {
    const log = await this.create({
      userId,
      action,
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('user-agent'),
      device: req.get('user-agent')?.includes('Mobile') ? 'Mobile' : 'Desktop',
      details,
      status: action.includes('FAILED') ? 'FAILED' : 'SUCCESS'
    });
    return log;
  } catch (error) {
    console.error('Error logging activity:', error);
  }
};

module.exports = mongoose.model('ActivityLog', ActivityLogSchema);