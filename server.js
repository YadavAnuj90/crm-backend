const app = require("./app");
const connectDB = require("./config/db");
const createSuperAdmin = require("./config/createSuperAdmin");
const logger = require("./config/logger");
const { checkSla } = require("./utils/slaChecker");

const PORT = process.env.PORT || 5000;

(async () => {
  try {
    await connectDB();
    await createSuperAdmin();

    setInterval(checkSla, 5 * 60 * 1000);

    app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
    });
  } catch (err) {
    logger.error("Startup failed", err);
    process.exit(1);
  }
})();
