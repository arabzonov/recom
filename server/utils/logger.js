/**
 * Simple logger utility for server-side logging
 */
const logger = {
  info: (message, data) => {
    const timestamp = new Date().toISOString();
    if (data) {
      process.stdout.write(`[${timestamp}] [INFO] ${message} ${JSON.stringify(data)}\n`);
    } else {
      process.stdout.write(`[${timestamp}] [INFO] ${message}\n`);
    }
  },
  warn: (message, data) => {
    const timestamp = new Date().toISOString();
    if (data) {
      process.stdout.write(`[${timestamp}] [WARN] ${message} ${JSON.stringify(data)}\n`);
    } else {
      process.stdout.write(`[${timestamp}] [WARN] ${message}\n`);
    }
  },
  error: (message, data) => {
    const timestamp = new Date().toISOString();
    if (data) {
      process.stderr.write(`[${timestamp}] [ERROR] ${message} ${JSON.stringify(data)}\n`);
    } else {
      process.stderr.write(`[${timestamp}] [ERROR] ${message}\n`);
    }
  },
  debug: (message, data) => {
    const timestamp = new Date().toISOString();
    if (data) {
      process.stdout.write(`[${timestamp}] [DEBUG] ${message} ${JSON.stringify(data)}\n`);
    } else {
      process.stdout.write(`[${timestamp}] [DEBUG] ${message}\n`);
    }
  }
};

export default logger;
