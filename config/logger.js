const { createLogger, format, transports } = require('winston');
const { combine, timestamp, errors, json } = format;
const path = require('path');
const fs = require('fs');

// Ensure logs directory exists
const logsDir = path.join(__dirname, '..', 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Custom log levels
const customLevels = {
  levels: {
    security: 0,
    error: 1,
    http: 2,
    info: 3,
  },
};

// Filters for specific log levels
const errorFilter = format((info, opts) => {
  return info.level === 'error' ? info : false;
});

const httpFilter = format((info, opts) => {
  return info.level === 'http' ? info : false;
});

const securityFilter = format((info, opts) => {
  return info.level === 'security' ? info : false;
});

const logger = createLogger({
  levels: customLevels.levels,
  level: 'info',
  format: combine(
    timestamp(),
    json(),
    errors({ stack: true })
  ),
  defaultMeta: {
    service: process.env.NODE_ENV || 'development',
    environment: process.env.SERVICE_NAME || 'cyberx-api',
  },
  transports: [
    // HTTP logs
    new transports.File({
      filename: path.join(logsDir, 'http.log'),
      level: 'http',
      format: combine(httpFilter(), timestamp(), json())
    }),
    
    // Security logs
    new transports.File({
      filename: path.join(logsDir, 'security.log'),
      level: 'security',
      format: combine(securityFilter(), timestamp(), json())
    }),
    
    // Error logs
    new transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      format: combine(errorFilter(), timestamp(), json())
    }),
    
    // Combined logs
    new transports.File({
      filename: path.join(logsDir, 'combined.log')
    }),
    
    // Console transport for development
    new transports.Console({
      format: combine(
        format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        format.errors({ stack: true }),
        format.printf(({ timestamp, level, message, ...meta }) => {
          return `${timestamp} [${level.toUpperCase()}]: ${message} ${Object.keys(meta).length ? JSON.stringify(meta, null, 2) : ''}`;
        })
      )
    })
  ],
});

module.exports = logger;
