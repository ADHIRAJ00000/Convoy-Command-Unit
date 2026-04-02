const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
require('dotenv').config();

const logger = require('./config/logger');
const { connectDB } = require('./config/database');
const { connectRedis } = require('./config/redis');
const { setupSocketHandlers } = require('./sockets');
const { startConvoySimulation } = require('./simulation/convoySimulator');

// Import routes
const convoyRoutes = require('./routes/convoyRoutes');
const eventRoutes = require('./routes/eventRoutes');
const checkpointRoutes = require('./routes/checkpointRoutes');
const optimizerRoutes = require('./routes/optimizerRoutes');
const authRoutes = require('./routes/authRoutes');
const pilotVehicleRoutes = require('./routes/pilotVehicleRoutes');

const app = express();
const server = http.createServer(app);

// Socket.IO configuration
const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
    methods: ['GET', 'POST'],
    credentials: true
  },
  pingTimeout: 60000,
  pingInterval: 25000
});

// Middleware
app.use(helmet());
app.use(compression());
app.use(cors({
  origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser()); // Parse cookies for refresh tokens
app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));

// Make io accessible to routes
app.set('io', io);

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Root route - Welcome message
app.get('/', (req, res) => {
  res.json({
    name: 'HawkRoute Backend API',
    version: '1.0.0',
    description: 'Real-Time AI Mobility Intelligence Platform for Military Convoy Operations',
    endpoints: {
      health: '/health',
      api: '/api',
      convoys: '/api/convoys',
      events: '/api/events',
      auth: '/api/auth'
    },
    documentation: 'https://github.com/ADHIRAJ00000/Convoy-Command-Unit'
  });
});

// API Routes
app.use('/api/convoys', convoyRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/checkpoints', checkpointRoutes);
app.use('/api/optimizer', optimizerRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/pilot-vehicle', pilotVehicleRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Initialize server
const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || '0.0.0.0';

async function startServer() {
  try {
    logger.info(`🔍 MONGODB_URI set: ${!!process.env.MONGODB_URI}`);
    logger.info(`🔍 NODE_ENV: ${process.env.NODE_ENV}`);
    logger.info(`🔍 PORT: ${PORT}`);

    // Connect to databases
    await connectDB();
    await connectRedis();
    
    // Setup Socket.IO handlers
    setupSocketHandlers(io);
    
    // Start convoy simulation (real-time updates)
    startConvoySimulation(io);
    
    // Start server
    server.listen(PORT, HOST, () => {
      logger.info(`🚀 Hawkroute Backend Server running on http://${HOST}:${PORT}`);
      logger.info(`📡 Socket.IO ready for real-time connections`);
      logger.info(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error.message);
    logger.error('Full error:', JSON.stringify(error, null, 2));
    process.exit(1);
  }
}

// Handle port in use or other server errors
server.on('error', (error) => {
  logger.error('Server error:', error);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully...');
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully...');
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

startServer();

module.exports = { app, io };
