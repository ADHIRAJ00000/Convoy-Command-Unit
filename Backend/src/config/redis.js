const { createClient } = require('redis');
const logger = require('./logger');

let redisClient = null;
let isConnected = false;

async function connectRedis() {
  if (isConnected && redisClient) {
    logger.info('Redis already connected');
    return redisClient;
  }

  // Skip Redis if REDIS_ENABLED is explicitly set to false
  if (process.env.REDIS_ENABLED === 'false') {
    logger.info('⚠️ Redis is disabled - Continuing without cache');
    return null;
  }

  try {
    redisClient = createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379',
      socket: {
        connectTimeout: 5000,
        reconnectStrategy: (retries) => {
          if (retries > 3) {
            logger.warn('Redis connection failed after 3 retries - Continuing without Redis');
            return false; // Stop reconnection
          }
          return Math.min(retries * 100, 3000);
        }
      }
    });

    redisClient.on('error', (err) => {
      // Only log critical errors, not connection retries
      if (!err.code || err.code !== 'ECONNREFUSED') {
        logger.error('Redis Client Error:', err);
      }
      isConnected = false;
    });

    redisClient.on('connect', () => {
      logger.info('✅ Redis Connected');
      isConnected = true;
    });

    redisClient.on('disconnect', () => {
      logger.warn('Redis disconnected');
      isConnected = false;
    });

    await redisClient.connect();
    return redisClient;
  } catch (error) {
    logger.warn('⚠️ Redis unavailable - Continuing without cache (this is optional)');
    return null;
  }
}

function getRedisClient() {
  return redisClient;
}

async function disconnectRedis() {
  if (redisClient && isConnected) {
    try {
      await redisClient.quit();
      logger.info('Redis disconnected');
      isConnected = false;
    } catch (error) {
      logger.error('Error disconnecting Redis:', error);
    }
  }
}

module.exports = { connectRedis, getRedisClient, disconnectRedis };
