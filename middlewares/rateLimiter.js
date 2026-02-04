const rateLimit = require("express-rate-limit");
const RedisStore = require("rate-limit-redis");
const Redis = require("ioredis");
const logger = require("../config/logger");

const redisClient = new Redis(process.env.REDIS_URL);

redisClient.on("error", (error) => {
  logger.error(`Redis rate limiter error: ${error.message}`);
});

const createRateLimiter = ({ windowMs, max, skip }) =>
  rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    skip,
    store: new RedisStore({
      sendCommand: (...args) => redisClient.call(...args),
    }),
    handler: (req, res) => {
      res.status(429).json({
        success: false,
        message: "Too many requests, please try again later.",
      });
    },
  });

const apiLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 100,
});

const authLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 20,
});

const paymentLimiter = createRateLimiter({
  windowMs: 10 * 60 * 1000,
  max: 10,
  skip: (req) => req.path.startsWith("/history"),
});

const paymentHistoryLimiter = createRateLimiter({
  windowMs: 10 * 60 * 1000,
  max: 10,
});

module.exports = {
  apiLimiter,
  authLimiter,
  paymentLimiter,
  paymentHistoryLimiter,
};
