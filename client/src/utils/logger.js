/**
 * Centralized Logging System
 * Provides color-coded logging with different levels
 */

class Logger {
  constructor() {
    this.logLevel = 'debug'; // You can set this to 'info', 'warn', 'error', or 'debug'
  }

  // Color codes for different log levels
  colors = {
    info: '#10B981',    // Green
    warn: '#F59E0B',    // Yellow  
    error: '#EF4444',   // Red
    debug: '#6B7280'   // Gray
  };

  // Log levels hierarchy
  levels = {
    error: 0,
    warn: 1,
    info: 2,
    debug: 3
  };

  shouldLog(level) {
    return this.levels[level] <= this.levels[this.logLevel];
  }

  formatMessage(level, message, data = null) {
    const timestamp = new Date().toISOString();
    const color = this.colors[level];
    const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
    
    if (data) {
      return {
        message: `${prefix} ${message}`,
        color,
        data
      };
    }
    
    return {
      message: `${prefix} ${message}`,
      color
    };
  }

  log(level, message, data = null) {
    if (!this.shouldLog(level)) return;
    
    // Safety check for console availability
    if (typeof console === 'undefined') return;
    
    const formatted = this.formatMessage(level, message, data);
    
    // Always use colored console output
    const style = `color: ${formatted.color}; font-weight: bold;`;
    if (data) {
      console.log(`%c${formatted.message}`, style, formatted.data);
    } else {
      console.log(`%c${formatted.message}`, style);
    }
  }

  info(message, data = null) {
    this.log('info', message, data);
  }

  warn(message, data = null) {
    this.log('warn', message, data);
  }

  error(message, data = null) {
    this.log('error', message, data);
  }

  debug(message, data = null) {
    this.log('debug', message, data);
  }

  // Specialized logging methods for common use cases
  apiCall(url, method = 'GET') {
    this.info(`API Call: ${method} ${url}`);
  }

  apiResponse(url, status, data = null) {
    if (status >= 200 && status < 300) {
      this.info(`API Response: ${status} ${url}`, data);
    } else if (status >= 400 && status < 500) {
      this.warn(`API Error: ${status} ${url}`, data);
    } else {
      this.error(`API Error: ${status} ${url}`, data);
    }
  }

  storeDetection(method, result) {
    if (result) {
      this.info(`Store Detection: ${method} - Found: ${result}`);
    } else {
      this.warn(`Store Detection: ${method} - Not found`);
    }
  }

  componentLifecycle(component, action, data = null) {
    this.debug(`Component: ${component} - ${action}`, data);
  }

  userAction(action, data = null) {
    this.info(`User Action: ${action}`, data);
  }
}

// Create singleton instance
const logger = new Logger();

export default logger;
