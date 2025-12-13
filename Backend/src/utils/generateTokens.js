const jwt = require('jsonwebtoken');
const crypto = require('crypto');

/**
 * Generate Access Token (short-lived, 15 minutes)
 * @param {Object} user - User object
 * @returns {String} Access token
 */
const generateAccessToken = (user) => {
  const payload = {
    id: user._id,
    email: user.email,
    username: user.username,
    role: user.role,
    permissions: user.permissions
  };

  return jwt.sign(
    payload,
    process.env.JWT_ACCESS_SECRET || 'hawkroute-access-secret-key-2024',
    { expiresIn: '15m' }
  );
};

/**
 * Generate Refresh Token (long-lived, 7 days)
 * @param {Object} user - User object
 * @returns {String} Refresh token
 */
const generateRefreshToken = (user) => {
  const payload = {
    id: user._id,
    tokenVersion: Date.now() // For invalidation
  };

  return jwt.sign(
    payload,
    process.env.JWT_REFRESH_SECRET || 'hawkroute-refresh-secret-key-2024',
    { expiresIn: '7d' }
  );
};

/**
 * Generate Password Reset Token
 * @returns {String} Reset token
 */
const generatePasswordResetToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

/**
 * Verify Access Token
 * @param {String} token - Access token
 * @returns {Object} Decoded token payload
 */
const verifyAccessToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_ACCESS_SECRET || 'hawkroute-access-secret-key-2024');
  } catch (error) {
    throw new Error('Invalid or expired access token');
  }
};

/**
 * Verify Refresh Token
 * @param {String} token - Refresh token
 * @returns {Object} Decoded token payload
 */
const verifyRefreshToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_REFRESH_SECRET || 'hawkroute-refresh-secret-key-2024');
  } catch (error) {
    throw new Error('Invalid or expired refresh token');
  }
};

/**
 * Generate both access and refresh tokens
 * @param {Object} user - User object
 * @returns {Object} { accessToken, refreshToken, expiresAt }
 */
const generateTokenPair = (user) => {
  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);
  
  // Calculate refresh token expiration date
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // 7 days from now

  return {
    accessToken,
    refreshToken,
    expiresAt
  };
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  generatePasswordResetToken,
  verifyAccessToken,
  verifyRefreshToken,
  generateTokenPair
};