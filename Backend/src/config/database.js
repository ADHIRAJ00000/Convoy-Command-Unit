const mongoose = require('mongoose');
const logger = require('./logger');

let isConnected = false;

async function connectDB() {
  if (isConnected) {
    logger.info('MongoDB already connected');
    return;
  }

  try {
    // Remove deprecated options - they're no longer needed in MongoDB Driver 4.0+
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000
    });

    isConnected = true;
    logger.info(`✅ MongoDB Connected: ${conn.connection.host}`);

    mongoose.connection.on('error', (err) => {
      logger.error('MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected');
      isConnected = false;
    });

    return conn;
  } catch (error) {
    logger.error('MongoDB connection failed:', error);
    throw error;
  }
}

async function disconnectDB() {
  if (!isConnected) {
    return;
  }

  try {
    await mongoose.disconnect();
    isConnected = false;
    logger.info('MongoDB disconnected');
  } catch (error) {
    logger.error('Error disconnecting MongoDB:', error);
    throw error;
  }
}

module.exports = { connectDB, disconnectDB };
