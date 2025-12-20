
const winston = require("winston");
require("winston-daily-rotate-file");

const logFormat = winston.format.combine(
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  winston.format.printf(info => `${info.timestamp} [${info.level}] : ${info.message}`)
);
const transport = new winston.transports.DailyRotateFile({
  filename: "logs/app-%DATE%.log",
  datePattern: "YYYY-MM-DD",
  zippedArchive: true,
  maxSize: "20m",
  maxFiles: "14d"
});
const errorTransport = new winston.transports.DailyRotateFile({
  filename: "logs/error-%DATE%.log",
  level: "error",
  datePattern: "YYYY-MM-DD",
  zippedArchive: true,
  maxSize: "20m",
  maxFiles: "30d"
});

const logger = winston.createLogger({
  format: logFormat,
  transports: [
    transport,
    errorTransport
  ]
});
if (process.env.NODE_ENV !== "production") {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }));
}

module.exports = logger;
