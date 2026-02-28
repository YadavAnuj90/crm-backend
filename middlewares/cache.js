const Redis = require('ioredis');
const logger = require('../config/logger');

let redisClient = null;

function getRedisClient() {
  if (!redisClient && process.env.REDIS_URL) {
    redisClient = new Redis(process.env.REDIS_URL, { lazyConnect: true });
    redisClient.on('error', (err) => logger.error('Redis cache error: ' + err.message));
  }
  return redisClient;
}

const cacheMiddleware = (ttlSeconds = 60) => async (req, res, next) => {
  const client = getRedisClient();
  if (!client) return next();

  const key = `cache:${req.originalUrl}:${req.user?.id || 'anon'}`;

  try {
    const cached = await client.get(key);
    if (cached) {
      return res.status(200).json(JSON.parse(cached));
    }

    const originalJson = res.json.bind(res);
    res.json = async (data) => {
      try {
        await client.setex(key, ttlSeconds, JSON.stringify(data));
      } catch (e) {
        logger.error('Cache set error: ' + e.message);
      }
      return originalJson(data);
    };
    next();
  } catch (err) {
    logger.error('Cache middleware error: ' + err.message);
    next();
  }
};

const invalidateCache = async (pattern) => {
  const client = getRedisClient();
  if (!client) return;
  try {
    const keys = await client.keys(`cache:*${pattern}*`);
    if (keys.length > 0) await client.del(...keys);
  } catch (err) {
    logger.error('Cache invalidation error: ' + err.message);
  }
};

module.exports = { cacheMiddleware, invalidateCache };
