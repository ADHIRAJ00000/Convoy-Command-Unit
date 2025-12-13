const User = require('../models/User');
const ActivityLog = require('../models/ActivityLog');
const { generateTokenPair, verifyRefreshToken, generatePasswordResetToken } = require('../utils/generateTokens');
const logger = require('../config/logger');
const crypto = require('crypto');

/**
 * @desc    Register new user
 * @route   POST /api/auth/register
 * @access  Public
 */
const register = async (req, res) => {
  try {
    const { name, email, username, password, role, rank, unit } = req.body;

    // Validate required fields
    if (!name || !email || !username || !password) {
      return res.status(400).json({
        success: false,
        error: 'Please provide all required fields'
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ email }, { username }]
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: 'User with this email or username already exists'
      });
    }

    // Set default permissions based on role
    let permissions = [];
    switch (role) {
      case 'ADMIN':
        permissions = ['ADMIN', 'READ_CONVOYS', 'WRITE_CONVOYS', 'OPTIMIZE_ROUTES', 'MANAGE_EVENTS'];
        break;
      case 'OPERATOR':
        permissions = ['READ_CONVOYS', 'WRITE_CONVOYS', 'OPTIMIZE_ROUTES'];
        break;
      case 'FIELD_OFFICER':
        permissions = ['READ_CONVOYS', 'MANAGE_EVENTS'];
        break;
      default:
        permissions = ['READ_CONVOYS'];
    }

    // Create user
    const user = await User.create({
      name,
      email,
      username,
      password,
      role: role || 'FIELD_OFFICER',
      rank,
      unit,
      permissions
    });

    // Log activity
    await ActivityLog.logActivity(user._id, 'REGISTER', req);

    // Generate tokens
    const { accessToken, refreshToken, expiresAt } = generateTokenPair(user);

    // Save refresh token to user
    await user.addRefreshToken(
      refreshToken,
      expiresAt,
      req.get('user-agent'),
      req.ip
    );

    // Set refresh token in HTTP-only cookie
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    logger.info(`New user registered: ${user.email}`);

    res.status(201).json({
      success: true,
      message: 'Registration successful',
      data: {
        user,
        accessToken
      }
    });

  } catch (error) {
    logger.error('Registration error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Registration failed'
    });
  }
};

/**
 * @desc    Login user
 * @route   POST /api/auth/login
 * @access  Public
 */
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Please provide email and password'
      });
    }

    // Find user
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      await ActivityLog.create({
        userId: null,
        action: 'LOGIN_FAILED',
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        details: { email, reason: 'User not found' },
        status: 'FAILED'
      });

      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }

    // Check if account is locked
    if (user.isLocked) {
      await ActivityLog.logActivity(user._id, 'ACCOUNT_LOCKED', req, {
        reason: 'Too many failed login attempts'
      });

      const lockTimeRemaining = Math.ceil((user.lockUntil - Date.now()) / 60000);
      return res.status(423).json({
        success: false,
        error: `Account locked due to multiple failed login attempts. Try again in ${lockTimeRemaining} minutes.`
      });
    }

    // Check if account is active
    if (!user.active) {
      await ActivityLog.logActivity(user._id, 'LOGIN_FAILED', req, {
        reason: 'Account deactivated'
      });

      return res.status(403).json({
        success: false,
        error: 'Account has been deactivated. Please contact administrator.'
      });
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);

    if (!isPasswordValid) {
      // Increment login attempts
      await user.incLoginAttempts();

      await ActivityLog.logActivity(user._id, 'LOGIN_FAILED', req, {
        reason: 'Invalid password'
      });

      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }

    // Reset login attempts on successful login
    if (user.loginAttempts > 0) {
      await user.resetLoginAttempts();
    }

    // Update last login
    user.lastLogin = Date.now();
    await user.save();

    // Generate tokens
    const { accessToken, refreshToken, expiresAt } = generateTokenPair(user);

    // Save refresh token
    await user.addRefreshToken(
      refreshToken,
      expiresAt,
      req.get('user-agent'),
      req.ip
    );

    // Log successful login
    await ActivityLog.logActivity(user._id, 'LOGIN_SUCCESS', req);

    // Set refresh token in HTTP-only cookie
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    logger.info(`User logged in: ${user.email}`);

    // Remove password from response
    user.password = undefined;

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user,
        accessToken
      }
    });

  } catch (error) {
    logger.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: 'Login failed'
    });
  }
};

/**
 * @desc    Logout user
 * @route   POST /api/auth/logout
 * @access  Private
 */
const logout = async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken;

    if (refreshToken && req.user) {
      // Remove refresh token from user's tokens list
      await req.user.removeRefreshToken(refreshToken);
      
      // Log logout activity
      await ActivityLog.logActivity(req.user._id, 'LOGOUT', req);
    }

    // Clear cookie
    res.clearCookie('refreshToken');

    logger.info(`User logged out: ${req.user?.email || 'Unknown'}`);

    res.json({
      success: true,
      message: 'Logout successful'
    });

  } catch (error) {
    logger.error('Logout error:', error);
    res.status(500).json({
      success: false,
      error: 'Logout failed'
    });
  }
};

/**
 * @desc    Refresh access token
 * @route   POST /api/auth/refresh-token
 * @access  Public
 */
const refreshToken = async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        error: 'No refresh token provided'
      });
    }

    // Verify refresh token
    const decoded = verifyRefreshToken(refreshToken);

    // Find user
    const user = await User.findById(decoded.id);

    if (!user || !user.active) {
      return res.status(401).json({
        success: false,
        error: 'Invalid refresh token'
      });
    }

    // Check if refresh token exists in user's tokens
    const tokenExists = user.refreshTokens.some(
      rt => rt.token === refreshToken && rt.expiresAt > Date.now()
    );

    if (!tokenExists) {
      return res.status(401).json({
        success: false,
        error: 'Refresh token expired or invalid'
      });
    }

    // Generate new tokens
    const { accessToken, refreshToken: newRefreshToken, expiresAt } = generateTokenPair(user);

    // Remove old refresh token and add new one
    await user.removeRefreshToken(refreshToken);
    await user.addRefreshToken(
      newRefreshToken,
      expiresAt,
      req.get('user-agent'),
      req.ip
    );

    // Log token refresh
    await ActivityLog.logActivity(user._id, 'TOKEN_REFRESH', req);

    // Set new refresh token in cookie
    res.cookie('refreshToken', newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    res.json({
      success: true,
      data: {
        accessToken
      }
    });

  } catch (error) {
    logger.error('Token refresh error:', error);
    res.status(401).json({
      success: false,
      error: 'Invalid or expired refresh token'
    });
  }
};

/**
 * @desc    Get current user
 * @route   GET /api/auth/me
 * @access  Private
 */
const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');

    res.json({
      success: true,
      data: user
    });

  } catch (error) {
    logger.error('Get user error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user data'
    });
  }
};

/**
 * @desc    Request password reset
 * @route   POST /api/auth/forgot-password
 * @access  Public
 */
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Please provide email'
      });
    }

    const user = await User.findOne({ email });

    if (!user) {
      // Don't reveal if email exists
      return res.json({
        success: true,
        message: 'If email exists, password reset link will be sent'
      });
    }

    // Generate reset token
    const resetToken = generatePasswordResetToken();
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

    // Save hashed token and expiry
    user.passwordResetToken = hashedToken;
    user.passwordResetExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
    await user.save();

    // Log activity
    await ActivityLog.logActivity(user._id, 'PASSWORD_RESET_REQUEST', req);

    // TODO: Send email with reset link
    // const resetUrl = `${req.protocol}://${req.get('host')}/reset-password/${resetToken}`;
    // await sendEmail(user.email, 'Password Reset', resetUrl);

    logger.info(`Password reset requested for: ${user.email}`);

    res.json({
      success: true,
      message: 'Password reset link sent to email',
      // For development only - remove in production
      ...(process.env.NODE_ENV === 'development' && { resetToken })
    });

  } catch (error) {
    logger.error('Forgot password error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process password reset request'
    });
  }
};

/**
 * @desc    Reset password
 * @route   POST /api/auth/reset-password/:token
 * @access  Public
 */
const resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    if (!password || password.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 6 characters'
      });
    }

    // Hash token to compare with stored hash
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    // Find user with valid reset token
    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        error: 'Invalid or expired reset token'
      });
    }

    // Set new password
    user.password = password;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    user.refreshTokens = []; // Invalidate all refresh tokens
    await user.save();

    // Log activity
    await ActivityLog.logActivity(user._id, 'PASSWORD_RESET_SUCCESS', req);

    logger.info(`Password reset successful for: ${user.email}`);

    res.json({
      success: true,
      message: 'Password reset successful. Please login with new password.'
    });

  } catch (error) {
    logger.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reset password'
    });
  }
};

/**
 * @desc    Get user's active sessions (Admin only)
 * @route   GET /api/auth/sessions/:userId
 * @access  Private (Admin)
 */
const getUserSessions = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    const activeSessions = user.refreshTokens
      .filter(rt => rt.expiresAt > Date.now())
      .map(rt => ({
        device: rt.device,
        ipAddress: rt.ipAddress,
        createdAt: rt.createdAt,
        expiresAt: rt.expiresAt
      }));

    res.json({
      success: true,
      data: {
        userId: user._id,
        email: user.email,
        activeSessions
      }
    });

  } catch (error) {
    logger.error('Get sessions error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch sessions'
    });
  }
};

/**
 * @desc    Get activity logs (Admin only)
 * @route   GET /api/auth/activity-logs
 * @access  Private (Admin)
 */
const getActivityLogs = async (req, res) => {
  try {
    const { userId, action, limit = 50, page = 1 } = req.query;

    const filter = {};
    if (userId) filter.userId = userId;
    if (action) filter.action = action;

    const logs = await ActivityLog.find(filter)
      .populate('userId', 'name email username')
      .sort({ timestamp: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await ActivityLog.countDocuments(filter);

    res.json({
      success: true,
      data: {
        logs,
        pagination: {
          total,
          page: parseInt(page),
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });

  } catch (error) {
    logger.error('Get activity logs error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch activity logs'
    });
  }
};

module.exports = {
  register,
  login,
  logout,
  refreshToken,
  getMe,
  forgotPassword,
  resetPassword,
  getUserSessions,
  getActivityLogs
};