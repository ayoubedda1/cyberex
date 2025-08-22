// middleware/auth.js - Enhanced with RBAC functionality
const jwt = require('jsonwebtoken');
const logger = require('../config/logger');
const { User, Role } = require('../models');

/**
 * Generic JWT token verification middleware
 * Uses JWT_SECRET for all routes except swagger
 * Enhanced with user validation and role loading
 */
async function verifyJwtToken(req, res, next) {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      logger.security('Access attempt without token', {
        ip: req.ip,
        endpoint: req.path,
        method: req.method,
        timestamp: new Date().toISOString(),
        threatLevel: 'medium'
      });

      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Access token is missing',
        code: 'UNAUTHORIZED'
      });
    }

    // Use regular JWT secret for non-swagger routes
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      logger.error('JWT_SECRET not configured');
      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'JWT configuration not set up',
        code: 'CONFIG_ERROR'
      });
    }

    const decoded = jwt.verify(token, secret);

    // Get user with current roles for enhanced security
    const user = await User.findByPk(decoded.userId, {
      include: [{
        model: Role,
        as: 'roles',
        through: {
          attributes: [],
          where: { isActive: true }
        },
        where: { isActive: true },
        required: false
      }]
    });

    if (!user || !user.isActive) {
      logger.security('Token used for inactive/non-existent user', {
        ip: req.ip,
        userId: decoded.userId,
        endpoint: req.path,
        method: req.method,
        timestamp: new Date().toISOString(),
        threatLevel: 'high'
      });

      return res.status(403).json({
        error: 'Forbidden',
        message: 'User account is inactive or not found',
        code: 'INACTIVE_USER'
      });
    }

    // Check if user is locked
    if (user.isLocked()) {
      logger.security('Token used for locked user account', {
        ip: req.ip,
        userId: user.id,
        endpoint: req.path,
        method: req.method,
        lockedUntil: user.lockedUntil,
        timestamp: new Date().toISOString(),
        threatLevel: 'high'
      });

      return res.status(423).json({
        error: 'Account Locked',
        message: 'User account is temporarily locked',
        code: 'ACCOUNT_LOCKED',
        lockedUntil: user.lockedUntil
      });
    }

    // Attach enhanced user info to request
    req.user = {
      userId: user.id,
      email: user.email,
      name: user.name,
      roles: user.roles ? user.roles.map(role => role.name) : [],
      isActive: user.isActive,
      exercise_id: user.exercise_id
    };

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      logger.security('Invalid JWT token used', {
        ip: req.ip,
        endpoint: req.path,
        method: req.method,
        error: error.message,
        timestamp: new Date().toISOString(),
        threatLevel: 'high'
      });

      return res.status(403).json({
        error: 'Forbidden',
        message: 'Invalid token',
        code: 'INVALID_TOKEN'
      });
    }

    if (error.name === 'TokenExpiredError') {
      logger.security('Expired JWT token used', {
        ip: req.ip,
        endpoint: req.path,
        method: req.method,
        timestamp: new Date().toISOString(),
        threatLevel: 'medium'
      });

      return res.status(403).json({
        error: 'Forbidden',
        message: 'Token has expired',
        code: 'TOKEN_EXPIRED'
      });
    }

    logger.error('Authentication error', {
      error: error.message,
      stack: error.stack,
      ip: req.ip,
      endpoint: req.path,
      method: req.method
    });

    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Authentication service error',
      code: 'AUTH_ERROR'
    });
  }
}

/**
 * Swagger-specific JWT token verification middleware
 * Uses JWT_SWAGGER_SECRET for swagger routes
 */
function verifySwaggerToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    logger.security('Swagger access attempt without token', {
      ip: req.ip,
      endpoint: req.path,
      method: req.method,
      timestamp: new Date().toISOString(),
      threatLevel: 'medium'
    });

    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Access token is missing',
      code: 'UNAUTHORIZED'
    });
  }

  // Use swagger-specific JWT secret
  const secret = process.env.JWT_SWAGGER_SECRET || process.env.JWT_SECRET;
  if (!secret) {
    logger.error('JWT_SWAGGER_SECRET not configured');
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'JWT configuration not set up',
      code: 'CONFIG_ERROR'
    });
  }

  jwt.verify(token, secret, (err, decoded) => {
    if (err) {
      logger.security('Invalid swagger token used', {
        ip: req.ip,
        endpoint: req.path,
        method: req.method,
        error: err.message,
        timestamp: new Date().toISOString(),
        threatLevel: 'medium'
      });

      return res.status(403).json({
        error: 'Forbidden',
        message: 'Invalid or expired token',
        code: 'FORBIDDEN'
      });
    }

    req.user = decoded;

    logger.info('Swagger access granted', {
      ip: req.ip,
      userId: decoded.userId,
      endpoint: req.path,
      method: req.method,
      timestamp: new Date().toISOString()
    });

    next();
  });
}

/**
 * Role-based Authorization Middleware
 * Checks if user has required roles
 */
const requireRole = (requiredRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      logger.security('Authorization check attempted without authentication', {
        ip: req.ip,
        endpoint: req.path,
        method: req.method,
        timestamp: new Date().toISOString(),
        threatLevel: 'high'
      });

      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required',
        code: 'NO_AUTH'
      });
    }

    const userRoles = req.user.roles || [];
    const hasRequiredRole = requiredRoles.some(role => userRoles.includes(role));

    if (!hasRequiredRole) {
      logger.security('Insufficient permissions for access', {
        ip: req.ip,
        userId: req.user.userId,
        userRoles: userRoles,
        requiredRoles: requiredRoles,
        endpoint: req.path,
        method: req.method,
        timestamp: new Date().toISOString(),
        threatLevel: 'medium'
      });

      return res.status(403).json({
        error: 'Forbidden',
        message: 'Insufficient permissions',
        code: 'INSUFFICIENT_PERMISSIONS',
        required: requiredRoles,
        current: userRoles
      });
    }

    logger.info('Authorization successful', {
      ip: req.ip,
      userId: req.user.userId,
      userRoles: userRoles,
      endpoint: req.path,
      method: req.method,
      timestamp: new Date().toISOString()
    });

    next();
  };
};

/**
 * Admin-only access middleware
 * Shortcut for requiring admin or super_admin roles
 */
const requireAdmin = requireRole(['admin', 'super_admin']);

/**
 * Check if user can modify resource (admin or owner)
 * Used for user profile modifications
 */
const canModifyUser = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Authentication required',
      code: 'NO_AUTH'
    });
  }

  const targetUserId = req.params.id;
  const currentUserId = req.user.userId;
  const userRoles = req.user.roles || [];

  // Admin can modify any user
  const isAdmin = userRoles.includes('admin') || userRoles.includes('super_admin');

  // User can modify themselves
  const isOwner = currentUserId === targetUserId;

  if (!isAdmin && !isOwner) {
    logger.security('Unauthorized user modification attempt', {
      ip: req.ip,
      currentUserId: currentUserId,
      targetUserId: targetUserId,
      userRoles: userRoles,
      endpoint: req.path,
      method: req.method,
      timestamp: new Date().toISOString(),
      threatLevel: 'high'
    });

    return res.status(403).json({
      error: 'Forbidden',
      message: 'You can only modify your own account or you need admin privileges',
      code: 'INSUFFICIENT_PERMISSIONS'
    });
  }

  // Add flags to indicate user's permissions level
  req.isAdmin = isAdmin;
  req.isOwner = isOwner;

  logger.info('User modification authorized', {
    ip: req.ip,
    currentUserId: currentUserId,
    targetUserId: targetUserId,
    isAdmin: isAdmin,
    isOwner: isOwner,
    endpoint: req.path,
    method: req.method,
    timestamp: new Date().toISOString()
  });

  next();
};

/**
 * Middleware to prevent users from escalating their own privileges
 * Prevents regular users from modifying sensitive fields on their own account
 */
const preventSelfPrivilegeEscalation = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Authentication required'
    });
  }

  const targetUserId = req.params.id;
  const currentUserId = req.user.userId;
  const userRoles = req.user.roles || [];
  const isAdmin = userRoles.includes('admin') || userRoles.includes('super_admin');

  // If user is trying to modify themselves and they're not admin
  if (currentUserId === targetUserId && !isAdmin) {
    const updateData = req.body;

    // Define fields that regular users cannot modify on their own account
    const restrictedFields = ['isActive', 'exercise_id', 'failedLoginAttempts', 'lockedUntil'];
    const hasRestrictedFields = restrictedFields.some(field => updateData.hasOwnProperty(field));

    if (hasRestrictedFields) {
      const attemptedFields = restrictedFields.filter(field => updateData.hasOwnProperty(field));

      logger.security('User attempted to modify restricted fields on own account', {
        ip: req.ip,
        userId: currentUserId,
        restrictedFields: attemptedFields,
        endpoint: req.path,
        method: req.method,
        timestamp: new Date().toISOString(),
        threatLevel: 'medium'
      });

      return res.status(403).json({
        error: 'Forbidden',
        message: 'You cannot modify these fields on your own account',
        code: 'RESTRICTED_SELF_MODIFICATION',
        restrictedFields: restrictedFields,
        attemptedFields: attemptedFields
      });
    }
  }

  next();
};

/**
 * Check if user has specific role
 * Utility function for conditional logic in route handlers
 */
const hasRole = (req, roleName) => {
  return req.user && req.user.roles && req.user.roles.includes(roleName);
};

/**
 * Check if user is admin
 * Utility function for conditional logic in route handlers
 */
const isAdmin = (req) => {
  return hasRole(req, 'admin') || hasRole(req, 'super_admin');
};

/**
 * Get user roles
 * Utility function to get user's roles
 */
const getUserRoles = (req) => {
  return req.user ? req.user.roles || [] : [];
};

// Legacy compatibility - alias for verifyJwtToken
const authenticateToken = verifyJwtToken;

module.exports = {
  verifyJwtToken,
  verifySwaggerToken,
  authenticateToken,        // Legacy compatibility
  requireRole,
  requireAdmin,
  canModifyUser,
  preventSelfPrivilegeEscalation,
  hasRole,
  isAdmin,
  getUserRoles
};
