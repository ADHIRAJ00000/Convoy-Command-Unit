const { verifyAccessToken } = require('../utils/generateTokens');
const User = require('../models/User');
const ActivityLog = require('../models/ActivityLog');
const logger = require('../config/logger');

/**
 * Middleware to verify JWT access token
 * Attaches user object to req.user if valid
 */
const authMiddleware = async (req, res, next) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'No token provided. Please login.'
      });
    }

    const token = authHeader.split(' ')[1];

    // Verify token
    const decoded = verifyAccessToken(token);

    // Check if user still exists
    const user = await User.findById(decoded.id).select('-password');
    
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'User no longer exists'
      });
    }

    // Check if user is active
    if (!user.active) {
      return res.status(401).json({
        success: false,
        error: 'Account has been deactivated'
      });
    }

    // Check if user changed password after token was issued
    if (user.changedPasswordAfter(decoded.iat)) {
      await ActivityLog.logActivity(user._id, 'UNAUTHORIZED_ACCESS', req, {
        reason: 'Password changed after token issue'
      });
      
      return res.status(401).json({
        success: false,
        error: 'Password recently changed. Please login again.'
      });
    }

    // Attach user to request
    req.user = user;
    next();

  } catch (error) {
    logger.error('Auth middleware error:', error);
    
    return res.status(401).json({
      success: false,
      error: error.message || 'Invalid token'
    });
  }
};

/**
 * Middleware to check if user has required role(s)
 * @param {Array} roles - Array of allowed roles
 */
const requireRole = (roles = []) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    // Convert single role to array
    const allowedRoles = Array.isArray(roles) ? roles : [roles];

    // Check if user's role is in allowed roles
    if (!allowedRoles.includes(req.user.role)) {
      ActivityLog.logActivity(req.user._id, 'UNAUTHORIZED_ACCESS', req, {
        requiredRoles: allowedRoles,
        userRole: req.user.role,
        endpoint: req.originalUrl
      });

      return res.status(403).json({
        success: false,
        error: 'Access denied. Insufficient permissions.'
      });
    }

    next();
  };
};

/**
 * Middleware to check if user has required permission(s)
 * @param {Array} permissions - Array of required permissions
 */
const requirePermission = (permissions = []) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    const requiredPermissions = Array.isArray(permissions) ? permissions : [permissions];
    const userPermissions = req.user.permissions || [];

    // Check if user has all required permissions
    const hasPermission = requiredPermissions.every(perm => 
      userPermissions.includes(perm) || userPermissions.includes('ADMIN')
    );

    if (!hasPermission) {
      ActivityLog.logActivity(req.user._id, 'UNAUTHORIZED_ACCESS', req, {
        requiredPermissions,
        userPermissions,
        endpoint: req.originalUrl
      });

      return res.status(403).json({
        success: false,
        error: 'Access denied. Missing required permissions.'
      });
    }

    next();
  };
};

/**
 * Optional auth middleware - doesn't fail if no token
 * Useful for routes that have different behavior for authenticated users
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const decoded = verifyAccessToken(token);
      const user = await User.findById(decoded.id).select('-password');
      
      if (user && user.active) {
        req.user = user;
      }
    }
  } catch (error) {
    // Silently fail for optional auth
    logger.debug('Optional auth failed:', error.message);
  }
  
  next();
};

module.exports = {
  authMiddleware,
  requireRole,
  requirePermission,
  optionalAuth
};
