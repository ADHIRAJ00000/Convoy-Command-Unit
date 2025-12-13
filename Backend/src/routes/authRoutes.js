const express = require('express');
const router = express.Router();
const {
  register,
  login,
  logout,
  refreshToken,
  getMe,
  forgotPassword,
  resetPassword,
  getUserSessions,
  getActivityLogs
} = require('../controllers/authController');
const { authMiddleware, requireRole } = require('../middleware/auth');
const { loginLimiter, registerLimiter, passwordResetLimiter } = require('../middleware/rateLimiter');

/**
 * @route   POST /api/auth/register
 * @desc    Register new user
 * @access  Public
 */
router.post('/register', registerLimiter, register);

/**
 * @route   POST /api/auth/login
 * @desc    Login user
 * @access  Public
 */
router.post('/login', loginLimiter, login);

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user
 * @access  Private
 */
router.post('/logout', authMiddleware, logout);

/**
 * @route   POST /api/auth/refresh-token
 * @desc    Refresh access token
 * @access  Public
 */
router.post('/refresh-token', refreshToken);

/**
 * @route   GET /api/auth/me
 * @desc    Get current user
 * @access  Private
 */
router.get('/me', authMiddleware, getMe);

/**
 * @route   POST /api/auth/forgot-password
 * @desc    Request password reset
 * @access  Public
 */
router.post('/forgot-password', passwordResetLimiter, forgotPassword);

/**
 * @route   POST /api/auth/reset-password/:token
 * @desc    Reset password with token
 * @access  Public
 */
router.post('/reset-password/:token', resetPassword);

/**
 * @route   GET /api/auth/sessions/:userId
 * @desc    Get user's active sessions
 * @access  Private (Admin only)
 */
router.get('/sessions/:userId', authMiddleware, requireRole(['ADMIN']), getUserSessions);

/**
 * @route   GET /api/auth/activity-logs
 * @desc    Get activity logs
 * @access  Private (Admin only)
 */
router.get('/activity-logs', authMiddleware, requireRole(['ADMIN']), getActivityLogs);

module.exports = router;
