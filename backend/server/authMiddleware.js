const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const costCodeService = require('./costCodeService');

const prisma = new PrismaClient();

const authMiddleware = async (req, res, next) => {
  try {
    // Check for token in cookies first (httpOnly), then in Authorization header
    let token = req.cookies.auth_token || req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
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
        isActive: true
      }
    });

    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'Invalid token or user inactive.' });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token.' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired.' });
    }
    res.status(500).json({ error: 'Server error during authentication.' });
  }
};

const adminOnly = (req, res, next) => {
  if (req.user.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Access denied. Admin privileges required.' });
  }
  next();
};

const rowLevelSecurityFilter = (req, res, next) => {
  req.dataFilter = {
    role: req.user.role,
    branch: req.user.branch,
    assignedCostCodes: req.user.assignedCostCodes ? JSON.parse(req.user.assignedCostCodes) : [],
    assignedGroups: req.user.assignedGroups ? JSON.parse(req.user.assignedGroups) : []
  };
  next();
};

const filterDataByPermissions = (data, user) => {
  let filteredData = data;

  // Filter by branch for both ADMIN and User (unless branch is 'ALL')
  if (user.branch && user.branch !== 'ALL') {
    filteredData = filteredData.filter(item => item.branch === user.branch);
  }

  // Parse groups and codes once
  const assignedGroups = user.assignedGroups
    ? (typeof user.assignedGroups === 'string'
      ? JSON.parse(user.assignedGroups)
      : user.assignedGroups)
    : null;

  const assignedCodes = user.assignedCostCodes
    ? (typeof user.assignedCostCodes === 'string'
      ? JSON.parse(user.assignedCostCodes)
      : user.assignedCostCodes)
    : null;

  // Apply permission filters (groups and/or cost codes)
  if (user.role !== 'ADMIN') {
    const hasGroupRestrictions = assignedGroups && assignedGroups.length > 0;
    const hasCodeRestrictions = Array.isArray(assignedCodes) && assignedCodes.length > 0;

    if (hasGroupRestrictions || hasCodeRestrictions) {
      // If both group and code restrictions exist: show (items in groups) OR (items in codes)
      // If only group restrictions: show items in groups
      // If only code restrictions: show items in codes
      filteredData = filteredData.filter(item => {
        const inAssignedGroup = hasGroupRestrictions && assignedGroups.includes(item.group);
        // Use EXACT matching for assigned codes (no fuzzy matching for user selections)
        const inAssignedCodes = hasCodeRestrictions && assignedCodes.some(code => item.costCode === code);
        return inAssignedGroup || inAssignedCodes;
      });
    } else if (assignedCodes !== null && Array.isArray(assignedCodes) && assignedCodes.length === 0) {
      // User has cost code restrictions set (empty array) but no group restrictions = show nothing
      filteredData = [];
    }
  }

  return filteredData;
};

module.exports = {
  authMiddleware,
  adminOnly,
  rowLevelSecurityFilter,
  filterDataByPermissions
};