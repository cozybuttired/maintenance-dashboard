const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const { PrismaClient } = require('@prisma/client');
const mockService = require('./mockService');
const dataService = require('./dataService');
const costCodeService = require('./costCodeService');
const dbManager = require('./dbManager');
const { authMiddleware, adminOnly, rowLevelSecurityFilter, filterDataByPermissions } = require('./authMiddleware');
const { registrationSchema, loginSchema, validate } = require('./validation');
const cacheService = require('./cacheService');
const { generateTemporaryPassword, validatePasswordStrength, passwordsMatch } = require('./passwordUtils');
const { logLoginSuccess, logLoginFailure, logAuthError } = require('./logger');

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3001;

// Helper: Validate date format (YYYY-MM-DD)
const isValidDateFormat = (dateString) => {
  if (!dateString) return true; // Optional parameter
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(dateString)) return false;
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date);
};

// Helper: Validate date range
const isValidDateRange = (startDate, endDate) => {
  if (!startDate || !endDate) return true; // At least one optional
  const start = new Date(startDate);
  const end = new Date(endDate);
  return start <= end;
};

// Middleware
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');

// Security headers with enhanced configuration
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"], // Chakra UI requires unsafe-inline
      imgSrc: ["'self'", 'data:', 'https:'],
      fontSrc: ["'self'", 'data:'],
      connectSrc: ["'self'", process.env.FRONTEND_URL || 'http://localhost:5173'],
      frameSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"]
    }
  },
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true
  },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  permissionsPolicy: {
    geolocation: [],
    microphone: [],
    camera: [],
    clipboard: []
  }
}));

// CORS configuration - restricted to frontend URL
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));

// Rate limiting for login attempts
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 attempts max for testing
  message: 'Too many login attempts, please try again later',
  standardHeaders: true, // Return rate limit info in headers
  legacyHeaders: false   // Disable X-RateLimit-* headers
});

// Rate limiting for data endpoints (prevent DoS and data exfiltration)
const dataLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30, // 30 requests per minute per IP
  message: 'Too many requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false
});

// Rate limiting for user management endpoints
const adminLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 20, // 20 requests per 5 minutes
  message: 'Too many requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false
});

app.use(cookieParser());
app.use(express.json({ limit: '10kb' })); // Limit payload size to prevent DoS

// Authentication Routes
app.post('/api/auth/login', loginLimiter, validate(loginSchema), async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      logLoginFailure(req, username, 'Missing username or password');
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const user = await prisma.user.findUnique({
      where: { username },
      select: {
        id: true,
        username: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        branch: true,
        assignedCostCodes: true,
        assignedGroups: true,
        passwordHash: true,
        isActive: true,
        passwordMustChange: true
      }
    });

    if (!user) {
      logLoginFailure(req, username, 'User not found');
      return res.status(401).json({ error: 'Invalid credentials or user inactive' });
    }

    if (!user.isActive) {
      logLoginFailure(req, username, 'User account is inactive');
      return res.status(401).json({ error: 'Invalid credentials or user inactive' });
    }

    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      logLoginFailure(req, username, 'Invalid password');
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    const { passwordHash, ...userWithoutPassword } = user;

    // Set httpOnly cookie for token
    res.cookie('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000
    });

    // Log successful login with full user details
    logLoginSuccess(req, user);

    res.json({
      message: 'Login successful',
      user: userWithoutPassword,
      passwordMustChange: user.passwordMustChange
    });
  } catch (error) {
    logAuthError(req, 'Server error during login', { 
      error: error.message,
      stack: process.env.NODE_ENV !== 'production' ? error.stack : undefined 
    });
    res.status(500).json({ error: 'Server error during login' });
  }
});

// Endpoint to get current user details
app.get('/api/auth/me', authMiddleware, async (req, res) => {
  try {
    // req.user is populated by authMiddleware
    if (!req.user) {
      return res.status(404).json({ error: 'User not found.' });
    }
    res.json({ user: req.user });
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('Error fetching current user:', error);
    }
    res.status(500).json({ error: 'Server error fetching user details.' });
  }
});

// Logout endpoint - clears auth token
app.post('/api/auth/logout', authMiddleware, (req, res) => {
  try {
    const username = req.user.username;
    res.clearCookie('auth_token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict'
    });
    
    // Log logout
    const { getTimestamp, getClientIp } = require('./logger');
    console.log(`[LOGOUT] ${getTimestamp()} - User: ${username} | IP: ${getClientIp(req)}`);
    
    res.json({ message: 'Logout successful' });
  } catch (error) {
    res.status(500).json({ error: 'Server error during logout' });
  }
});


// Login monitoring endpoint - admins only
app.get('/api/auth/login-stats', authMiddleware, adminOnly, (req, res) => {
  try {
    const { getLoginStats, getRecentLogins } = require('./logger');
    const stats = getLoginStats();
    const recentLogins = getRecentLogins(20);
    
    res.json({
      stats,
      recentLogins
    });
  } catch (error) {
    console.error('Error fetching login stats:', error);
    res.status(500).json({ error: 'Server error fetching login statistics' });
  }
});
// Password change endpoint - allows users to change password (especially after first login)
app.post('/api/auth/change-password', authMiddleware, async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;

    // Validate all fields provided
    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({ error: 'Current password, new password, and confirmation are required' });
    }

    // Validate new password matches confirmation
    if (!passwordsMatch(newPassword, confirmPassword)) {
      return res.status(400).json({ error: 'New passwords do not match' });
    }

    // Validate new password strength
    const passwordValidation = validatePasswordStrength(newPassword);
    if (!passwordValidation.isValid) {
      return res.status(400).json({
        error: 'Password does not meet requirements',
        requirements: passwordValidation.errors
      });
    }

    // Prevent using the same password
    if (currentPassword === newPassword) {
      return res.status(400).json({ error: 'New password must be different from current password' });
    }

    // Fetch user with password hash
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { passwordHash: true }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Verify current password
    const isPasswordCorrect = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isPasswordCorrect) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    // Hash new password
    const newPasswordHash = await bcrypt.hash(newPassword, 10);

    // Update password and clear passwordMustChange flag
    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        passwordHash: newPasswordHash,
        passwordMustChange: false // User has now set their own password
      },
      select: {
        id: true,
        username: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        branch: true,
        passwordMustChange: true,
        updatedAt: true
      }
    });

    console.log(`[${new Date().toISOString()}] 🔐 Password changed for user: ${updatedUser.username}`);

    res.json({
      message: 'Password changed successfully',
      user: updatedUser
    });
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('Error changing password:', error);
    }
    res.status(500).json({ error: 'Server error changing password' });
  }
});

app.post('/api/auth/register', authMiddleware, adminOnly, validate(registrationSchema), async (req, res) => {
  try {
    const { username, email, firstName, lastName, role = 'User', branch, assignedCostCodes, assignedGroups, userType } = req.body;
    // NOTE: Password is NO LONGER in this request. Users will set their own on first login.

    // Validate all required fields are provided
    if (!username || !email || !firstName || !lastName) {
      return res.status(400).json({ error: 'All required fields must be provided' });
    }

    // Validate role is allowed
    const allowedRoles = ['ADMIN', 'User'];
    if (!allowedRoles.includes(role)) {
      return res.status(400).json({ error: `Invalid role. Must be one of: ${allowedRoles.join(', ')}` });
    }

    // Validate branch is allowed
    const allowedBranches = ['PMB', 'PTA', 'QTN', 'CPT', 'ALL'];
    if (!allowedBranches.includes(branch)) {
      return res.status(400).json({ error: `Invalid branch. Must be one of: ${allowedBranches.join(', ')}` });
    }

    // Validate firstName and lastName are reasonable length
    if (firstName.length > 100 || lastName.length > 100) {
      return res.status(400).json({ error: 'firstName and lastName must be 100 characters or less' });
    }

    // Validate assignedCostCodes if provided
    if (assignedCostCodes && (!Array.isArray(assignedCostCodes) || !assignedCostCodes.every(code => typeof code === 'string'))) {
      return res.status(400).json({ error: 'Invalid assignedCostCodes. Must be an array of strings' });
    }

    // Validate assignedGroups if provided
    if (assignedGroups && (!Array.isArray(assignedGroups) || !assignedGroups.every(group => typeof group === 'string'))) {
      return res.status(400).json({ error: 'Invalid assignedGroups. Must be an array of strings' });
    }

    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { username },
          { email }
        ]
      }
    });

    if (existingUser) {
      return res.status(400).json({ error: 'Username or email already exists' });
    }

    // Generate temporary password (user will change on first login)
    const temporaryPassword = generateTemporaryPassword();
    const passwordHash = await bcrypt.hash(temporaryPassword, 10);

    // If userType is provided, look it up by name and get its ID
    let userTypeId = null;
    if (userType) {
      const foundUserType = await prisma.userType.findUnique({
        where: { name: userType }
      });
      if (foundUserType) {
        userTypeId = foundUserType.id;
      }
    }

    const user = await prisma.user.create({
      data: {
        username,
        email,
        passwordHash,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        role,
        branch,
        userTypeId: userTypeId, // Connect to UserType by ID
        assignedCostCodes: assignedCostCodes ? JSON.stringify(assignedCostCodes) : null,
        assignedGroups: assignedGroups ? JSON.stringify(assignedGroups) : null,
        passwordMustChange: true // Force password change on first login
      },
      select: {
        id: true,
        username: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        branch: true,
        assignedCostCodes: true,
        assignedGroups: true,
        isActive: true,
        passwordMustChange: true,
        createdAt: true
      }
    });

    // Return user info INCLUDING the temporary password (admin will share it securely)
    res.status(201).json({
      user,
      temporaryPassword: temporaryPassword,
      message: `User created successfully. Share this temporary password with ${firstName}: ${temporaryPassword}. They will be prompted to change it on first login.`
    });
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('Registration error:', error);
    }
    res.status(500).json({ error: 'Server error during registration' });
  }
});

// Protected Routes
app.get('/api/maintenance/records', authMiddleware, dataLimiter, rowLevelSecurityFilter, async (req, res) => {
  try {
    let records;

    // Get date range from query parameters
    const { startDate, endDate } = req.query;

    // Validate date format
    if (!isValidDateFormat(startDate)) {
      return res.status(400).json({ error: 'Invalid startDate format. Use YYYY-MM-DD' });
    }
    if (!isValidDateFormat(endDate)) {
      return res.status(400).json({ error: 'Invalid endDate format. Use YYYY-MM-DD' });
    }

    // Validate date range
    if (!isValidDateRange(startDate, endDate)) {
      return res.status(400).json({ error: 'startDate must be before or equal to endDate' });
    }

    const filters = {};
    if (startDate) filters.startDate = startDate;
    if (endDate) filters.endDate = endDate;

    // Get pagination params (optional)
    const pageNumber = Math.max(1, parseInt(req.query.page) || 1);
    const pageSize = Math.min(500, Math.max(10, parseInt(req.query.pageSize) || 50)); // Min 10, max 500

    if (process.env.DATA_SOURCE === 'LIVE') {
      // Fetch from all branches in parallel
      const allRecords = await dataService.getPurchaseRecords(null, filters);
      records = filterDataByPermissions(allRecords, req.user);
    } else {
      // Use mock data
      const allRecords = mockService.generateMockRecords(50);
      records = filterDataByPermissions(allRecords, req.user);
    }

    // Apply pagination if page param is provided
    if (req.query.page) {
      const paginated = dataService.paginateRecords(records, pageNumber, pageSize);
      return res.json(paginated);
    }

    res.json({ records, recordCount: records.length });
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') console.error('Error fetching maintenance records:', error);
    res.status(500).json({ error: 'Server error fetching records' });
  }
});

app.get('/api/maintenance/stats', authMiddleware, dataLimiter, rowLevelSecurityFilter, async (req, res) => {
  try {
    let records;

    // Get date range from query parameters
    const { startDate, endDate } = req.query;

    // Validate date format
    if (!isValidDateFormat(startDate)) {
      return res.status(400).json({ error: 'Invalid startDate format. Use YYYY-MM-DD' });
    }
    if (!isValidDateFormat(endDate)) {
      return res.status(400).json({ error: 'Invalid endDate format. Use YYYY-MM-DD' });
    }

    // Validate date range
    if (!isValidDateRange(startDate, endDate)) {
      return res.status(400).json({ error: 'startDate must be before or equal to endDate' });
    }

    const filters = {};
    if (startDate) filters.startDate = startDate;
    if (endDate) filters.endDate = endDate;

    if (process.env.DATA_SOURCE === 'LIVE') {
      // Fetch from all branches in parallel
      const allRecords = await dataService.getPurchaseRecords(null, filters);
      records = filterDataByPermissions(allRecords, req.user);

      const stats = await dataService.getPurchaseStats(records);
      const monthlyTrends = dataService.getMonthlyTrends(records);

      res.json({ stats, monthlyTrends });
    } else {
      // Use mock data
      const allRecords = mockService.generateMockRecords(50);
      records = filterDataByPermissions(allRecords, req.user);

      const stats = mockService.getSummaryStats(records);
      const monthlyTrends = mockService.getMonthlyTrends(records);

      res.json({ stats, monthlyTrends });
    }
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') console.error('Error fetching maintenance stats:', error);
    res.status(500).json({ error: 'Server error fetching stats' });
  }
});

app.get('/api/branches', authMiddleware, async (req, res) => {
  try {
    const branches = dbManager.getAllBranches();
    res.json({ branches });
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') console.error('Error fetching branches:', error);
    res.status(500).json({ error: 'Server error fetching branches' });
  }
});

app.get('/api/users', authMiddleware, adminOnly, adminLimiter, async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        branch: true,
        assignedCostCodes: true,
        assignedGroups: true,
        isActive: true,
        createdAt: true,
        updatedAt: true
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ users });
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Server error fetching users' });
  }
});


app.put('/api/users/:id', authMiddleware, adminOnly, adminLimiter, async (req, res) => {
  try {
    const { id } = req.params;
    const { firstName, lastName, role, branch, assignedCostCodes, assignedGroups, isActive } = req.body;

    // Validate role is one of the allowed values (CRITICAL: prevent privilege escalation)
    const allowedRoles = ['ADMIN', 'User'];
    if (role && !allowedRoles.includes(role)) {
      return res.status(400).json({ error: `Invalid role. Must be one of: ${allowedRoles.join(', ')}` });
    }

    // Validate branch is one of the allowed values
    const allowedBranches = ['PMB', 'PTA', 'QTN', 'CPT', 'ALL'];
    if (branch && !allowedBranches.includes(branch)) {
      return res.status(400).json({ error: `Invalid branch. Must be one of: ${allowedBranches.join(', ')}` });
    }

    // Validate firstName and lastName are non-empty strings with reasonable length
    if (firstName && (typeof firstName !== 'string' || firstName.trim().length === 0 || firstName.length > 100)) {
      return res.status(400).json({ error: 'Invalid firstName. Must be a string between 1-100 characters' });
    }

    if (lastName && (typeof lastName !== 'string' || lastName.trim().length === 0 || lastName.length > 100)) {
      return res.status(400).json({ error: 'Invalid lastName. Must be a string between 1-100 characters' });
    }

    // Validate isActive is a boolean
    if (isActive !== undefined && typeof isActive !== 'boolean') {
      return res.status(400).json({ error: 'Invalid isActive. Must be a boolean' });
    }

    // Validate assignedCostCodes is an array of strings if provided
    if (assignedCostCodes && (!Array.isArray(assignedCostCodes) || !assignedCostCodes.every(code => typeof code === 'string'))) {
      return res.status(400).json({ error: 'Invalid assignedCostCodes. Must be an array of strings' });
    }

    // Validate assignedGroups is an array of strings if provided
    if (assignedGroups && (!Array.isArray(assignedGroups) || !assignedGroups.every(group => typeof group === 'string'))) {
      return res.status(400).json({ error: 'Invalid assignedGroups. Must be an array of strings' });
    }

    const user = await prisma.user.update({
      where: { id },
      data: {
        ...(firstName && { firstName: firstName.trim() }),
        ...(lastName && { lastName: lastName.trim() }),
        ...(role && { role }),
        ...(branch && { branch }),
        // Handle assignedCostCodes: null (group-level) or array (specific codes)
        ...(assignedCostCodes !== undefined && { assignedCostCodes: Array.isArray(assignedCostCodes) ? JSON.stringify(assignedCostCodes) : null }),
        // Handle assignedGroups: [] (all groups) or array (specific groups)
        ...(assignedGroups !== undefined && { assignedGroups: Array.isArray(assignedGroups) && assignedGroups.length > 0 ? JSON.stringify(assignedGroups) : null }),
        ...(isActive !== undefined && { isActive })
      },
      select: {
        id: true,
        username: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        branch: true,
        assignedCostCodes: true,
        assignedGroups: true,
        isActive: true,
        updatedAt: true
      }
    });

    res.json({ user });
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') console.error('Error updating user:', error);
    res.status(500).json({ error: 'Server error updating user' });
  }
});

app.delete('/api/users/:id', authMiddleware, adminOnly, adminLimiter, async (req, res) => {
  try {
    const { id } = req.params;

    // Validate user ID format (basic check)
    if (!id || typeof id !== 'string' || id.trim().length === 0) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    // Prevent admin from deleting themselves
    if (req.user.id === id) {
      return res.status(403).json({ error: 'Admins cannot delete their own account through this interface.' });
    }

    // Verify user exists before deleting
    const userToDelete = await prisma.user.findUnique({
      where: { id }
    });

    if (!userToDelete) {
      return res.status(404).json({ error: 'User not found.' });
    }

    await prisma.user.delete({
      where: { id }
    });

    res.status(200).json({ message: 'User deleted successfully', deletedUserId: id });
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') console.error('Error deleting user:', error);

    if (error.code === 'P2025') { // Prisma error code for record not found
      return res.status(404).json({ error: 'User not found.' });
    }

    res.status(500).json({ error: 'Server error deleting user.' });
  }
});

    

    // Settings Management Endpoints

    app.get('/api/settings', authMiddleware, adminOnly, async (req, res) => {

      try {

        const settings = await prisma.setting.findMany();

        res.json({ settings });

      } catch (error) {

        if (process.env.NODE_ENV !== 'production') console.error('Error fetching settings:', error);

        res.status(500).json({ error: 'Server error fetching settings' });

      }

    });

    

    app.put('/api/settings', authMiddleware, adminOnly, adminLimiter, async (req, res) => {

      try {

        const { settings } = req.body; // Expects an array of { key: string, value: string }



        if (!Array.isArray(settings)) {

          return res.status(400).json({ error: 'Request body must contain an array of settings.' });

        }

        // Validate settings array length to prevent abuse
        if (settings.length === 0) {
          return res.status(400).json({ error: 'Settings array must contain at least one item.' });
        }

        if (settings.length > 50) {
          return res.status(400).json({ error: 'Settings array can contain at most 50 items.' });
        }

        // Validate each setting
        for (const setting of settings) {
          if (!setting.key || typeof setting.key !== 'string' || setting.key.trim().length === 0) {
            return res.status(400).json({ error: 'Each setting must have a non-empty key string.' });
          }

          if (typeof setting.value !== 'string' || setting.value.length > 5000) {
            return res.status(400).json({ error: 'Each setting value must be a string with max 5000 characters.' });
          }

          if (setting.key.length > 255) {
            return res.status(400).json({ error: 'Setting key must be 255 characters or less.' });
          }
        }



        const transaction = settings.map(setting =>

          prisma.setting.upsert({

            where: { key: setting.key.trim() },

            update: { value: setting.value },

            create: { key: setting.key.trim(), value: setting.value },

          })

        );



        await prisma.$transaction(transaction);

        res.json({ message: 'Settings updated successfully.' });

      } catch (error) {

        if (process.env.NODE_ENV !== 'production') console.error('Error updating settings:', error);

        res.status(500).json({ error: 'Server error updating settings.' });

      }

    });



// Group Endpoints
app.get('/api/groups', authMiddleware, dataLimiter, async (req, res) => {
  try {
    // Fetch groups from MySQL database (excluding 'Unknown')
    const groups = await prisma.group.findMany({
      where: {
        isActive: true,
        name: { not: 'Unknown' }
      },
      orderBy: { name: 'asc' }
    });

    const groupNames = groups.map(g => g.name);

    res.json({
      groups: groupNames,
      count: groupNames.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') console.error('Error fetching groups:', error);
    res.status(500).json({ error: 'Server error fetching groups' });
  }
});

// Cost Code Endpoints
app.get('/api/cost-codes', authMiddleware, dataLimiter, async (req, res) => {
  try {
    // Fetch all cost codes from MySQL database (excluding 'Unknown' group)
    const costCodes = await prisma.costCode.findMany({
      where: {
        isActive: true,
        group: {
          name: { not: 'Unknown' }
        }
      },
      include: { group: true },
      orderBy: { code: 'asc' }
    });

    const formattedCodes = costCodes.map(cc => ({
      id: cc.id,
      code: cc.code,
      group: cc.group.name,
      branch: cc.branch
    }));

    res.json({
      costCodes: formattedCodes,
      count: formattedCodes.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') console.error('Error fetching cost codes:', error);
    res.status(500).json({ error: 'Server error fetching cost codes' });
  }
});

app.get('/api/cost-codes/by-group/:group', authMiddleware, dataLimiter, async (req, res) => {
  try {
    const { group } = req.params;

    // Validate and decode group parameter
    if (!group || typeof group !== 'string' || group.trim().length === 0) {
      return res.status(400).json({ error: 'Invalid group parameter' });
    }

    const decodedGroup = decodeURIComponent(group);

    // Validate decoded group length
    if (decodedGroup.length > 255) {
      return res.status(400).json({ error: 'Group parameter too long' });
    }

    // Fetch cost codes for the specified group from MySQL database
    const groupRecord = await prisma.group.findUnique({
      where: { name: decodedGroup },
      include: {
        costCodes: {
          where: { isActive: true },
          orderBy: { code: 'asc' }
        }
      }
    });

    if (!groupRecord) {
      return res.json({
        group: decodedGroup,
        costCodes: [],
        count: 0,
        timestamp: new Date().toISOString()
      });
    }

    const costCodes = groupRecord.costCodes.map(cc => ({
      id: cc.id,
      code: cc.code,
      branch: cc.branch
    }));

    res.json({
      group: decodedGroup,
      costCodes: costCodes,
      count: costCodes.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') console.error('Error fetching cost codes by group:', error);
    res.status(500).json({ error: 'Server error fetching cost codes by group' });
  }
});

app.get('/api/cost-codes/branch/:branch', authMiddleware, dataLimiter, async (req, res) => {
  try {
    const { branch } = req.params;
    const validBranches = ['PMB', 'PTA', 'QTN', 'CPT'];

    if (!validBranches.includes(branch.toUpperCase())) {
      return res.status(400).json({ error: 'Invalid branch code' });
    }

    const branchCostCodes = await dataService.getAvailableCostCodes(branch.toUpperCase());
    res.json({
      branch: branch.toUpperCase(),
      costCodes: branchCostCodes,
      count: branchCostCodes.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') console.error('Error fetching branch cost codes:', error);
    res.status(500).json({ error: 'Server error fetching branch cost codes' });
  }
});

app.get('/api/cost-codes/grouped/by-category', authMiddleware, dataLimiter, async (req, res) => {
  try {
    // Fetch cost codes from all branches
    const allCostCodes = await dataService.getAvailableCostCodes(null);
    const grouped = costCodeService.groupByCategory(allCostCodes);

    res.json({
      grouped,
      totalCodes: allCostCodes.length,
      categories: Object.keys(grouped),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') console.error('Error fetching grouped cost codes:', error);
    res.status(500).json({ error: 'Server error fetching grouped cost codes' });
  }
});

// Health check endpoint - public status only, detailed info requires auth
app.get('/api/health', async (req, res) => {
  try {
    const connectionStatus = await dbManager.getConnectionStatus();
    const allConnected = Object.values(connectionStatus).every(s => s.connected);

    res.json({
      status: allConnected ? 'OK' : 'PARTIAL',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      status: 'ERROR',
      timestamp: new Date().toISOString()
    });
  }
});

// Detailed health check endpoint - requires authentication
app.get('/api/health/detailed', authMiddleware, adminOnly, async (req, res) => {
  try {
    const connectionStatus = await dbManager.getConnectionStatus();
    const allConnected = Object.values(connectionStatus).every(s => s.connected);

    res.json({
      status: allConnected ? 'OK' : 'PARTIAL',
      timestamp: new Date().toISOString(),
      dataSource: process.env.DATA_SOURCE || 'MOCK',
      connections: connectionStatus
    });
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') console.error('Error checking detailed health:', error);
    res.status(500).json({
      status: 'ERROR',
      timestamp: new Date().toISOString(),
      error: 'Server error checking health'
    });
  }
});

// Connection status endpoint (requires auth)
app.get('/api/connection-status', async (req, res) => {
  try {
    const connectionStatus = await dbManager.getConnectionStatus();

    // Filter out IP addresses for security, keep only essential info
    const filteredStatus = {};
    for (const [branch, status] of Object.entries(connectionStatus)) {
      filteredStatus[branch] = {
        connected: status.connected,
        name: status.name,
        timestamp: status.timestamp
      };
    }

    res.json({
      connections: filteredStatus,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') console.error('Error checking connection status:', error);
    res.status(500).json({ error: 'Server error checking connection status' });
  }
});

// Test branch connection (requires auth)
app.post('/api/test-connection/:branch', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { branch } = req.params;
    const validBranches = ['PMB', 'PTA', 'QTN', 'CPT'];

    if (!validBranches.includes(branch.toUpperCase())) {
      return res.status(400).json({ error: 'Invalid branch code' });
    }

    const branchUpper = branch.toUpperCase();
    const testQuery = 'SELECT COUNT(*) as recordCount FROM [dbo].[TNT_vw_MaintenancePurchases]';

    const result = await dbManager.queryBranch(branchUpper, testQuery);

    if (result.success) {
      // Clear cache for this branch after successful connection
      cacheService.clearPattern(`records:${branchUpper}`);
      cacheService.clearPattern(`groups:${branchUpper}`);
      cacheService.clearPattern(`costCodes:${branchUpper}`);

      res.json({
        status: 'success',
        branch: branchUpper,
        message: `Successfully connected to ${branchUpper}. Cache cleared.`,
        recordCount: result.data?.[0]?.recordCount || 0,
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(500).json({
        status: 'failed',
        branch: branchUpper,
        error: result.error,
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') console.error('Error testing connection:', error);
    res.status(500).json({ error: 'Server error testing connection' });
  }
});

// Diagnostic endpoint (requires auth) - shows connection config and details
app.get('/api/diagnostics', authMiddleware, adminOnly, async (req, res) => {
  try {
    const branches = dbManager.getAllBranches();
    const connectionStatus = await dbManager.getConnectionStatus();

    // Get database names from branch configs
    const branchDatabases = {
      PMB: process.env.PMB_DB,
      PTA: process.env.PTA_DB,
      QTN: process.env.QTN_DB,
      CPT: process.env.CPT_DB
    };

    const diagnostics = {
      timestamp: new Date().toISOString(),
      dataSource: process.env.DATA_SOURCE,
      nodeEnv: process.env.NODE_ENV,
      configuredBranches: branches.map(b => ({
        code: b.code,
        name: b.name,
        server: b.server,
        database: branchDatabases[b.code],
        port: process.env.MSSQL_PORT,
        user: process.env.MSSQL_USER
      })),
      connectionStatus,
      mssqlConfig: {
        encrypt: 'true',
        trustServerCertificate: 'true',
        enableArithAbort: 'true',
        integratedSecurity: 'false'
      }
    };

    res.json(diagnostics);
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') console.error('Error getting diagnostics:', error);
    res.status(500).json({ error: 'Server error getting diagnostics' });
  }
});

// User Type Endpoints
app.get('/api/user-types', authMiddleware, adminOnly, dataLimiter, async (req, res) => {
  try {
    const userTypes = await prisma.userType.findMany({
      orderBy: { createdAt: 'desc' }
    });

    const formattedTypes = userTypes.map(type => ({
      id: type.id,
      name: type.name,
      role: type.role,
      branch: type.branch,
      assignedGroups: type.assignedGroups ? JSON.parse(type.assignedGroups) : [],
      costCodes: type.costCodes ? JSON.parse(type.costCodes) : []
    }));

    res.json({
      userTypes: formattedTypes,
      count: formattedTypes.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') console.error('Error fetching user types:', error);
    res.status(500).json({ error: 'Server error fetching user types' });
  }
});

app.post('/api/user-types', authMiddleware, adminOnly, adminLimiter, async (req, res) => {
  try {
    const { name, role, branch, assignedGroups, costCodes } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'User type name is required' });
    }

    const userType = await prisma.userType.create({
      data: {
        name,
        role: role || 'User',
        branch: branch || 'ALL',
        assignedGroups: assignedGroups ? JSON.stringify(assignedGroups) : null,
        costCodes: costCodes ? JSON.stringify(costCodes) : null
      }
    });

    res.status(201).json({
      userType: {
        id: userType.id,
        name: userType.name,
        role: userType.role,
        branch: userType.branch,
        assignedGroups: assignedGroups || [],
        costCodes: costCodes || []
      }
    });
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'User type name already exists' });
    }
    if (process.env.NODE_ENV !== 'production') console.error('Error creating user type:', error);
    res.status(500).json({ error: 'Server error creating user type' });
  }
});

app.put('/api/user-types/:id', authMiddleware, adminOnly, adminLimiter, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, role, branch, assignedGroups, costCodes } = req.body;

    const userType = await prisma.userType.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(role && { role }),
        ...(branch && { branch }),
        ...(assignedGroups !== undefined && { assignedGroups: JSON.stringify(assignedGroups) }),
        ...(costCodes !== undefined && { costCodes: JSON.stringify(costCodes) })
      }
    });

    res.json({
      userType: {
        id: userType.id,
        name: userType.name,
        role: userType.role,
        branch: userType.branch,
        assignedGroups: userType.assignedGroups ? JSON.parse(userType.assignedGroups) : [],
        costCodes: userType.costCodes ? JSON.parse(userType.costCodes) : []
      }
    });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'User type not found' });
    }
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'User type name already exists' });
    }
    if (process.env.NODE_ENV !== 'production') console.error('Error updating user type:', error);
    res.status(500).json({ error: 'Server error updating user type' });
  }
});

app.delete('/api/user-types/:id', authMiddleware, adminOnly, adminLimiter, async (req, res) => {
  try {
    const { id } = req.params;

    // Set userTypeId to NULL for all users with this type
    await prisma.user.updateMany({
      where: { userTypeId: id },
      data: { userTypeId: null }
    });

    // Delete the user type
    await prisma.userType.delete({
      where: { id }
    });

    res.json({ message: 'User type deleted successfully' });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'User type not found' });
    }
    if (process.env.NODE_ENV !== 'production') console.error('Error deleting user type:', error);
    res.status(500).json({ error: 'Server error deleting user type' });
  }
});

// Cache stats endpoint (admin only) - view current cache state
app.get('/api/cache/stats', authMiddleware, adminOnly, async (req, res) => {
  try {
    const stats = cacheService.getStats();
    res.json({
      timestamp: new Date().toISOString(),
      cache: stats
    });
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') console.error('Error getting cache stats:', error);
    res.status(500).json({ error: 'Server error getting cache stats' });
  }
});

// Clear cache endpoint (admin only) - manually invalidate cache
app.post('/api/cache/clear', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { pattern } = req.body;

    let clearedCount = 0;
    if (pattern) {
      // Clear specific pattern (e.g., 'records:' to clear all maintenance records)
      clearedCount = cacheService.clearPattern(pattern);
      console.log(`[${new Date().toISOString()}] 🗑️  Cleared ${clearedCount} cache items matching pattern: ${pattern}`);
    } else {
      // Clear all cache
      clearedCount = cacheService.clearAll();
      console.log(`[${new Date().toISOString()}] 🗑️  Cleared entire cache (${clearedCount} items)`);
    }

    res.json({
      message: pattern ? `Cleared ${clearedCount} items matching pattern: ${pattern}` : `Cleared all ${clearedCount} cache items`,
      clearedCount,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') console.error('Error clearing cache:', error);
    res.status(500).json({ error: 'Server error clearing cache' });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  if (process.env.NODE_ENV !== 'production') console.error('Unhandled error:', error);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
const server = app.listen(PORT, async () => {
  console.log('\n' + '='.repeat(60));
  console.log(`🚀 Server started at ${new Date().toISOString()}`);
  console.log(`📍 Port: ${PORT}`);
  console.log(`🔄 Data Source: ${process.env.DATA_SOURCE || 'MOCK'}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:5173'}`);

  // MySQL/Prisma Database Connection Info
  console.log('\n🗄️  Prisma Database Connection:');
  try {
    const databaseUrl = process.env.DATABASE_URL || '';
    if (databaseUrl.includes('mysql://')) {
      const urlObj = new URL(databaseUrl);
      const host = urlObj.hostname;
      const database = urlObj.pathname.replace('/', '');
      const user = urlObj.username;
      console.log(`  ✅ Connected to MySQL`);
      console.log(`     🖥️  Host: ${host}`);
      console.log(`     🗄️  Database: ${database}`);
      console.log(`     👤 User: ${user}`);

      // Test the connection
      const result = await prisma.$queryRaw`SELECT 1 as connected`;
      console.log(`     ✅ Connection verified`);
    } else if (databaseUrl.includes('file://') || databaseUrl.includes('file:')) {
      console.log(`  ℹ️  Using SQLite (local database)`);
      console.log(`     📁 Database: ${databaseUrl}`);
    }
  } catch (error) {
    console.error(`  ❌ Database connection error: ${error.message}`);
  }

  if (process.env.DATA_SOURCE === 'LIVE') {
    console.log('\n📊 MSSQL Connections:');
    try {
      const status = await dbManager.getConnectionStatus();
      Object.entries(status).forEach(([branch, info]) => {
        const icon = info.connected ? '✅' : '❌';
        console.log(`  ${icon} ${branch} (${info.name}): ${info.ip}`);
      });
    } catch (error) {
      console.error('  ⚠️  Could not check connection status:', error.message);
    }
  }

  console.log('='.repeat(60) + '\n');
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  await dbManager.closeAllPools();
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully');
  await dbManager.closeAllPools();
  await prisma.$disconnect();
  process.exit(0);
});

module.exports = app;