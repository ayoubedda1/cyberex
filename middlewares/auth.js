const jwt = require('jsonwebtoken');

/**
 * Generic JWT token verification middleware
 * Uses JWT_SECRET for all routes except swagger
 */
function verifyJwtToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Access token is missing',
      code: 'UNAUTHORIZED'
    });
  }

  // Use regular JWT secret for non-swagger routes
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'JWT configuration not set up',
      code: 'CONFIG_ERROR'
    });
  }

  jwt.verify(token, secret, (err, decoded) => {
    if (err) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Invalid or expired token',
        code: 'FORBIDDEN'
      });
    }
    
    req.user = decoded;
    next();
  });
}

/**
 * Swagger-specific JWT token verification middleware
 * Uses JWT_SWAGGER_SECRET for swagger routes
 */
function verifySwaggerToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Access token is missing',
      code: 'UNAUTHORIZED'
    });
  }

  // Use swagger-specific JWT secret
  const secret = process.env.JWT_SWAGGER_SECRET || process.env.JWT_SECRET;
  if (!secret) {
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'JWT configuration not set up',
      code: 'CONFIG_ERROR'
    });
  }

  jwt.verify(token, secret, (err, decoded) => {
    if (err) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Invalid or expired token',
        code: 'FORBIDDEN'
      });
    }
    
    req.user = decoded;
    next();
  });
}

module.exports = {
  verifyJwtToken,
  verifySwaggerToken
};
