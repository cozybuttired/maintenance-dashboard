const fs = require('fs');
const path = require('path');

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Define log file paths
const loginLogFile = path.join(logsDir, 'login.log');
const errorLogFile = path.join(logsDir, 'errors.log');

/**
 * Get client IP address from request
 */
const getClientIp = (req) => {
  return req.ip || 
         req.connection.remoteAddress || 
         req.socket.remoteAddress || 
         req.connection.socket?.remoteAddress ||
         'UNKNOWN';
};

/**
 * Format timestamp in readable format
 */
const getTimestamp = () => {
  return new Date().toISOString();
};

/**
 * Log login attempt to file and console
 */
const logLoginAttempt = (req, username, status, details = {}) => {
  const timestamp = getTimestamp();
  const ipAddress = getClientIp(req);
  
  const logEntry = {
    timestamp,
    username,
    ipAddress,
    status,
    userAgent: req.get('user-agent') || 'UNKNOWN',
    ...details
  };

  const logLine = JSON.stringify(logEntry);
  
  // Log to console with color coding
  const statusColor = status === 'success' ? '\x1b[32m' : '\x1b[31m';
  const reset = '\x1b[0m';
  console.log(`${statusColor}[LOGIN] ${timestamp} - User: ${username} | Status: ${status} | IP: ${ipAddress}${reset}`);
  
  // Log to file
  try {
    fs.appendFileSync(loginLogFile, logLine + '\n');
  } catch (error) {
    console.error('Error writing to login log:', error);
  }

  return logEntry;
};

/**
 * Log user login success with full user details
 */
const logLoginSuccess = (req, user) => {
  return logLoginAttempt(req, user.username, 'success', {
    userId: user.id,
    email: user.email,
    firstName: user.firstName || 'N/A',
    lastName: user.lastName || 'N/A',
    role: user.role,
    branch: user.branch || 'N/A',
    message: `User ${user.firstName} ${user.lastName} logged in successfully`
  });
};

/**
 * Log login failure
 */
const logLoginFailure = (req, username, reason) => {
  return logLoginAttempt(req, username || 'UNKNOWN', 'failed', {
    reason,
    message: `Login failed: ${reason}`
  });
};

/**
 * Log authentication errors
 */
const logAuthError = (req, errorMessage, errorDetails = {}) => {
  const timestamp = getTimestamp();
  const ipAddress = getClientIp(req);
  
  const errorEntry = {
    timestamp,
    type: 'auth_error',
    ipAddress,
    message: errorMessage,
    userAgent: req.get('user-agent') || 'UNKNOWN',
    ...errorDetails
  };

  const logLine = JSON.stringify(errorEntry);
  
  console.error(`[AUTH ERROR] ${timestamp} - ${errorMessage} | IP: ${ipAddress}`);
  
  try {
    fs.appendFileSync(errorLogFile, logLine + '\n');
  } catch (error) {
    console.error('Error writing to error log:', error);
  }

  return errorEntry;
};

/**
 * Get recent login logs
 */
const getRecentLogins = (limit = 50) => {
  try {
    const logs = fs.readFileSync(loginLogFile, 'utf-8')
      .split('\n')
      .filter(line => line.trim())
      .slice(-limit)
      .map(line => {
        try {
          return JSON.parse(line);
        } catch {
          return null;
        }
      })
      .filter(log => log !== null);
    
    return logs;
  } catch (error) {
    console.error('Error reading login logs:', error);
    return [];
  }
};

/**
 * Get login stats
 */
const getLoginStats = () => {
  try {
    const logs = fs.readFileSync(loginLogFile, 'utf-8')
      .split('\n')
      .filter(line => line.trim())
      .map(line => {
        try {
          return JSON.parse(line);
        } catch {
          return null;
        }
      })
      .filter(log => log !== null);

    const successCount = logs.filter(log => log.status === 'success').length;
    const failureCount = logs.filter(log => log.status === 'failed').length;
    const uniqueUsers = new Set(logs.map(log => log.username)).size;
    const uniqueIPs = new Set(logs.map(log => log.ipAddress)).size;

    return {
      totalLogins: logs.length,
      successfulLogins: successCount,
      failedLogins: failureCount,
      uniqueUsers,
      uniqueIPs,
      lastLogin: logs[logs.length - 1]?.timestamp || null,
      logs: logs.slice(-10)
    };
  } catch (error) {
    console.error('Error calculating login stats:', error);
    return {
      totalLogins: 0,
      successfulLogins: 0,
      failedLogins: 0,
      uniqueUsers: 0,
      uniqueIPs: 0,
      lastLogin: null,
      logs: []
    };
  }
};

module.exports = {
  logLoginAttempt,
  logLoginSuccess,
  logLoginFailure,
  logAuthError,
  getClientIp,
  getTimestamp,
  getRecentLogins,
  getLoginStats
};
