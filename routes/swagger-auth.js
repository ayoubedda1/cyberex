const express = require('express');
const jwt = require('jsonwebtoken');
const logger = require('../config/logger');

const router = express.Router();

/**
 * @swagger
 * /api/swagger/token:
 *   post:
 *     summary: Generate JWT token for Swagger access
 *     description: Authenticate using SWAGGER_SECRET to get a JWT token for accessing Swagger documentation
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - swaggerSecret
 *             properties:
 *               swaggerSecret:
 *                 type: string
 *                 description: The swagger access secret
 *                 example: "your-swagger-access-secret-here"
 *     responses:
 *       200:
 *         description: JWT token generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "JWT token generated successfully"
 *                 token:
 *                   type: string
 *                   description: The JWT token for Swagger access
 *                   example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *                 expiresIn:
 *                   type: string
 *                   description: Token expiration time
 *                   example: "24h"
 *       401:
 *         description: Invalid swagger secret
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: "Unauthorized"
 *                 message:
 *                   type: string
 *                   example: "Invalid swagger secret"
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: "Internal Server Error"
 *                 message:
 *                   type: string
 *                   example: "Failed to generate token"
 */
router.post('/token', (req, res) => {
  try {
    const { swaggerSecret } = req.body;

    // Check if swagger secret is provided
    if (!swaggerSecret) {
      logger.security('Swagger token request missing secret - potential security threat', {
        ip: req.ip,
        timestamp: new Date().toISOString(),
        endpoint: '/api/swagger/token',
        method: 'POST'
      });
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Swagger secret is required'
      });
    }

    // Get the expected swagger secret from environment
    const expectedSecret = process.env.SWAGGER_SECRET;
    
    if (!expectedSecret) {
      logger.security('SWAGGER_SECRET environment variable not set - configuration security issue', {
        ip: req.ip,
        timestamp: new Date().toISOString(),
        endpoint: '/api/swagger/token',
        method: 'POST',
        threatLevel: 'high',
        issue: 'missing_environment_variable'
      });
      return res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        message: 'Swagger authentication not configured'
      });
    }

    // Verify the provided secret
    if (swaggerSecret !== expectedSecret) {
      logger.security('Invalid swagger secret provided - potential brute force attempt', {
        ip: req.ip,
        providedSecretLength: swaggerSecret.length,
        providedSecretPrefix: swaggerSecret.substring(0, 4) + '...', // Log partial secret for debugging
        timestamp: new Date().toISOString(),
        endpoint: '/api/swagger/token',
        method: 'POST',
        threatLevel: 'medium'
      });
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Invalid swagger secret'
      });
    }

    // Get the JWT secret for swagger
    const jwtSecret = process.env.JWT_SWAGGER_SECRET;
    
    if (!jwtSecret) {
      logger.security('JWT_SWAGGER_SECRET environment variable not set - configuration security issue', {
        ip: req.ip,
        timestamp: new Date().toISOString(),
        endpoint: '/api/swagger/token',
        method: 'POST',
        threatLevel: 'high',
        issue: 'missing_jwt_secret'
      });
      return res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        message: 'JWT configuration not set up'
      });
    }

    // Create JWT payload for swagger access
    const payload = {
      userId: 'swagger-user',
      email: 'swagger@cyberx.com',
      role: 'swagger-access',
      purpose: 'swagger-documentation',
      iat: Math.floor(Date.now() / 1000)
    };

    // Generate JWT token with 24 hours expiry
    const token = jwt.sign(payload, jwtSecret, { expiresIn: '24h' });

    logger.security('Swagger JWT token generated successfully - legitimate access', {
      ip: req.ip,
      userId: payload.userId,
      timestamp: new Date().toISOString(),
      endpoint: '/api/swagger/token',
      method: 'POST',
      threatLevel: 'none',
      accessType: 'legitimate'
    });

    res.json({
      success: true,
      message: 'JWT token generated successfully',
      token: token,
      expiresIn: '24h',
      tokenType: 'Bearer'
    });

  } catch (error) {
    logger.error('Error generating swagger JWT token', {
      error: error.message,
      stack: error.stack,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to generate token'
    });
  }
});


module.exports = router;
