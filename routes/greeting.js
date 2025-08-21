const express = require('express');
const router = express.Router();
const logger = require('../config/logger');

/**
 * @swagger
 * /api/hello:
 *   get:
 *     summary: Get a greeting message
 *     description: Returns a simple "Hello World" message
 *     tags: [Greeting]
 *     responses:
 *       200:
 *         description: Successful response
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Hello World!"
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 endpoint:
 *                   type: string
 *                   example: "/api/hello"
 *                 ip:
 *                   type: string
 *                 method:
 *                   type: string
 *                   example: "GET"
 *                 service:
 *                   type: string
 *                   example: "development"
 */
router.get('/hello', (req, res) => {
  logger.info('Greeting endpoint accessed', {
    endpoint: req.path,
    ip: req.ip,
    method: req.method,
    service: process.env.NODE_ENV || 'development'
  });
  
  res.json({
    message: 'Hello World!',
    timestamp: new Date().toISOString(),
    endpoint: req.path,
    ip: req.ip,
    method: req.method,
    service: process.env.NODE_ENV || 'development'
  });
});

/**
 * @swagger
 * /api/protected:
 *   get:
 *     summary: Protected greeting message
 *     description: |
 *       Returns a greeting message for authenticated users only.
 *       
 *       **🔒 Authentication Required:**
 *       This endpoint requires a valid JWT token in the Authorization header.
 *       
 *       **📋 How to add Authorization Header:**
 *       1. First, obtain a JWT token by logging in at `/api/auth/login`
 *       2. Add the following header to your request:
 *          ```
 *          Authorization: Bearer <your-jwt-token>
 *          ```
 *       3. Example:
 *          ```
 *          Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *          ```
 *       
 *       **⚠️ Security Notes:**
 *       - Tokens expire after 24 hours
 *       - Invalid or expired tokens will return 401/403 errors
 *     tags: [Greeting]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: header
 *         name: Authorization
 *         required: true
 *         schema:
 *           type: string
 *         description: |
 *           JWT Bearer token. Format: `Bearer <token>`
 *           Example: `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
 *     responses:
 *       200:
 *         description: Successful response for authenticated user
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Hello authenticated user!"
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                       example: "123e4567-e89b-12d3-a456-426614174000"
 *                     email:
 *                       type: string
 *                       example: "user@example.com"
 *                     name:
 *                       type: string
 *                       example: "John Doe"
 *                     roles:
 *                       type: array
 *                       items:
 *                         type: string
 *                       example: ["user", "admin"]
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                   example: "2024-01-15T10:30:00.000Z"
 *                 endpoint:
 *                   type: string
 *                   example: "/api/protected"
 *                 ip:
 *                   type: string
 *                   example: "192.168.1.100"
 *                 method:
 *                   type: string
 *                   example: "GET"
 *                 service:
 *                   type: string
 *                   example: "development"
 *       401:
 *         description: Unauthorized - Missing or invalid JWT token
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Unauthorized"
 *                 message:
 *                   type: string
 *                   example: "Access token is missing"
 *                 code:
 *                   type: string
 *                   example: "UNAUTHORIZED"
 *       403:
 *         description: Forbidden - Invalid token
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Forbidden"
 *                 message:
 *                   type: string
 *                   example: "Invalid or expired token"
 *                 code:
 *                   type: string
 *                   example: "FORBIDDEN"
 */
router.get('/', (req, res) => {
  // Check if user data exists
  if (!req.user) {
    logger.error('Protected route accessed without user data', {
      endpoint: req.path,
      ip: req.ip,
      method: req.method,
      service: process.env.NODE_ENV || 'development'
    });
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'User authentication data not found',
      code: 'NO_USER_DATA'
    });
  }

  logger.info('Protected greeting endpoint accessed', {
    endpoint: req.path,
    ip: req.ip,
    method: req.method,
    userId: req.user?.userId,
    userEmail: req.user?.email,
    userRoles: req.user?.roles,
    service: process.env.NODE_ENV || 'development'
  });
  
  res.json({
    message: 'Hello authenticated user!',
    user: {
      id: req.user.userId,
      email: req.user.email,
      name: req.user.name,
      roles: req.user.roles
    },
    timestamp: new Date().toISOString(),
    endpoint: req.path,
    ip: req.ip,
    method: req.method,
    service: process.env.NODE_ENV || 'development'
  });
});

module.exports = router;
