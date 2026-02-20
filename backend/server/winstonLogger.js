const winston = require('winston');
const { getSASTLogTime } = require('./timezoneUtils');

// Custom colorized format for beautiful console logs
const consoleFormat = winston.format.combine(
  winston.format.colorize({ all: true }),
  winston.format.printf(({ level, message, service }) => {
    const time = getSASTLogTime();
    const svc = service ? `[${service}]`.padEnd(15) : ''.padEnd(15);
    const levelPad = level.padEnd(7);
    return `${time} ${levelPad} ${svc} ${message}`;
  })
);

// Create logger instance with Winston
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  transports: [
    // Console output (colorized)
    new winston.transports.Console({
      format: consoleFormat
    })
  ]
});

// Convenience methods with predefined services and colors
const createServiceLogger = (service) => ({
  info: (msg) => logger.info(msg, { service }),
  error: (msg) => logger.error(msg, { service }),
  warn: (msg) => logger.warn(msg, { service }),
  debug: (msg) => logger.debug(msg, { service })
});

// Export convenient service loggers
module.exports = {
  logger,

  // Service-specific loggers with built-in colors
  database: createServiceLogger('Database'),
  dataService: createServiceLogger('DataService'),
  api: createServiceLogger('API'),
  auth: createServiceLogger('Auth'),
  cache: createServiceLogger('Cache'),
  error: createServiceLogger('Error'),

  // Raw logger for custom use
  raw: logger
};
