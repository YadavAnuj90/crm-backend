
const morgan = require("morgan");
const logger = require("../config/logger");

const stream = {
  write: (message) => logger.info(message.trim()),
};

const skip = () => process.env.NODE_ENV === "production" ? false : false;

module.exports = morgan(
  ":method :url :status :response-time ms",
  { stream, skip }
);
