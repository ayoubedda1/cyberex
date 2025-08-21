const express = require('express');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const logger = require('../config/logger');
const { User, Role } = require('../models');

const router = express.Router();

// Validation middleware
const validateLogin = [
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 6, max: 128 })
    .withMessage('Password must be between 6 and 128 characters')
];



/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: User login
 *     description: Authenticate user with email and password
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "user@example.com"
 *               password:
 *                 type: string
 *                 minLength: 6
 *                 maxLength: 128
 *                 example: "password123"
 *     responses:
 *       200:
 *         description: Login successful
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
 *                   example: "Login successful"
 *                 token:
 *                   type: string
 *                   description: JWT token
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                     email:
 *                       type: string
 *                     name:
 *                       type: string
 *                     roles:
 *                       type: array
 *                       items:
 *                         type: object
 *       400:
 *         description: Validation error
 *       401:
 *         description: Authentication failed
 *       423:
 *         description: Account locked
 */
router.post('/login', validateLogin, async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.security('Login attempt with validation errors', {
        ip: req.ip,
        email: req.body.email,
        errors: errors.array(),
        timestamp: new Date().toISOString(),
        endpoint: '/api/auth/login',
        method: 'POST',
        threatLevel: 'low'
      });

      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        message: 'Invalid input data',
        details: errors.array()
      });
    }

    const { email, password } = req.body;

    // Find user by email
    const user = await User.findByEmail(email);
    
    if (!user) {
      logger.security('Login attempt with non-existent email', {
        ip: req.ip,
        email: email,
        timestamp: new Date().toISOString(),
        endpoint: '/api/auth/login',
        method: 'POST',
        threatLevel: 'medium'
      });

      return res.status(401).json({
        success: false,
        error: 'Authentication Failed',
        message: 'Invalid email or password'
      });
    }

    // Check if account is locked
    if (user.isLocked()) {
      logger.security('Login attempt on locked account', {
        ip: req.ip,
        email: email,
        userId: user.id,
        failedAttempts: user.failedLoginAttempts,
        lockedUntil: user.lockedUntil,
        timestamp: new Date().toISOString(),
        endpoint: '/api/auth/login',
        method: 'POST',
        threatLevel: 'high'
      });

      return res.status(423).json({
        success: false,
        error: 'Account Locked',
        message: 'Account is temporarily locked due to multiple failed login attempts',
        lockedUntil: user.lockedUntil
      });
    }

    // Check if account is active
    if (!user.isActive) {
      logger.security('Login attempt on inactive account', {
        ip: req.ip,
        email: email,
        userId: user.id,
        timestamp: new Date().toISOString(),
        endpoint: '/api/auth/login',
        method: 'POST',
        threatLevel: 'medium'
      });

      return res.status(401).json({
        success: false,
        error: 'Authentication Failed',
        message: 'Account is inactive'
      });
    }

    // Validate password
    const isValidPassword = await user.validatePassword(password);
    
    if (!isValidPassword) {
      await user.incrementFailedAttempts();
      
      logger.security('Login attempt with invalid password', {
        ip: req.ip,
        email: email,
        userId: user.id,
        failedAttempts: user.failedLoginAttempts,
        timestamp: new Date().toISOString(),
        endpoint: '/api/auth/login',
        method: 'POST',
        threatLevel: 'medium'
      });

      return res.status(401).json({
        success: false,
        error: 'Authentication Failed',
        message: 'Invalid email or password'
      });
    }

    // Reset failed attempts and update last login
    await user.resetFailedAttempts();

    // Get user roles
    const userWithRoles = await User.findByPk(user.id, {
      include: [{
        model: Role,
        as: 'roles',
        through: { attributes: [] },
        where: { isActive: true },
        required: false
      }]
    });

    // Generate JWT token
    const payload = {
      userId: user.id,
      email: user.email,
      name: user.name,
      roles: userWithRoles.roles.map(role => role.name),
      iat: Math.floor(Date.now() / 1000)
    };

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      logger.error('JWT_SECRET not configured', {
        ip: req.ip,
        email: email,
        userId: user.id
      });
      return res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        message: 'Authentication service not properly configured'
      });
    }

    const token = jwt.sign(payload, secret, { 
      expiresIn: '24h' 
    });

    logger.security('Login successful', {
      ip: req.ip,
      email: email,
      userId: user.id,
      roles: payload.roles,
      timestamp: new Date().toISOString(),
      endpoint: '/api/auth/login',
      method: 'POST',
      threatLevel: 'none',
      accessType: 'legitimate'
    });

    res.json({
      success: true,
      message: 'Login successful',
      token: token,
      expiresIn: '24h',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        roles: payload.roles,
        lastLoginAt: user.lastLoginAt
      }
    });

  } catch (error) {
    logger.error('Login error', {
      error: error.message,
      stack: error.stack,
      ip: req.ip,
      email: req.body.email
    });

    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'An error occurred during login'
    });
  }
});



module.exports = router;
