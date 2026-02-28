const jwt = require("jsonwebtoken");
const User = require("../models/user.model");
const logger = require("../config/logger");

let redisClient = null;
function getRedis() {
  if (!redisClient && process.env.REDIS_URL) {
    try {
      const Redis = require('ioredis');
      redisClient = new Redis(process.env.REDIS_URL, { lazyConnect: true });
      redisClient.on('error', () => {});
    } catch (e) {
      logger.warn('Redis not available: ' + e.message);
    }
  }
  return redisClient;
}

const verifyToken = async (req, res, next) => {
  const token = req.headers["x-access-token"] || req.headers.authorization;
  if (!token) return res.status(403).send({ message: "Token is required" });

  const actualToken = token.startsWith("Bearer ") ? token.slice(7) : token;

  try {
    // Check token blacklist
    const redis = getRedis();
    if (redis) {
      try {
        const blacklisted = await redis.get(`blacklist:${actualToken}`);
        if (blacklisted) return res.status(401).send({ message: "Token has been invalidated. Please log in again." });
      } catch (e) {
        logger.error('Redis blacklist check error: ' + e.message);
      }
    }

    const decoded = jwt.verify(actualToken, process.env.JWT_SECRET);
    req.userId = decoded.userId;
    req.id = decoded.id;
    req.userType = decoded.userType;
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).send({ message: "Unauthorized! Invalid or expired token." });
  }
};

module.exports = verifyToken;
