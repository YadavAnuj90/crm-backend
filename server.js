const app = require("./app");
const connectDB = require("./config/db");
const createSuperAdmin = require("./config/createSuperAdmin");
const logger = require("./config/logger");
const { validateEnv } = require("./utils/envValidation");
const { startSlaScheduler } = require("./utils/slaChecker");

// Validate env vars before anything
validateEnv();

const PORT = process.env.PORT || 5000;

let server;

async function startServer() {
  try {
    await connectDB();
    await createSuperAdmin();
    await startSlaScheduler(); // Now async — starts BullMQ workers + registers repeatable jobs

    server = app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT} [${process.env.NODE_ENV || 'development'}]`);
    });

    // Graceful shutdown
    const shutdown = async (signal) => {
      logger.info(`${signal} received. Shutting down gracefully...`);
      server.close(async () => {
        logger.info('HTTP server closed.');
        const mongoose = require('mongoose');
        await mongoose.connection.close();
        logger.info('MongoDB connection closed.');
        process.exit(0);
      });

      // Force close after 10s
      setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    process.on('unhandledRejection', (err) => {
      logger.error('Unhandled Promise Rejection: ' + err.message);
    });

    process.on('uncaughtException', (err) => {
      logger.error('Uncaught Exception: ' + err.message);
      process.exit(1);
    });

  } catch (err) {
    logger.error("Startup failed: " + err.message);
    process.exit(1);
  }
}

startServer();
