const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const swaggerUi = require('swagger-ui-express');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // Large margin: 500 API requests per 15 minutes
  message: {
    error: 'API rate limit exceeded',
    message: 'Too many API requests. Please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const swaggerLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // Large margin: 200 Swagger requests per 15 minutes
  message: {
    error: 'Swagger rate limit exceeded',
    message: 'Too many documentation requests. Please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Import configurations
const logger = require('./config/logger');
const swaggerSpecs = require('./config/swagger');
const { testConnection, syncDatabase } = require('./config/database');

// Import middleware
const { verifyJwtToken, verifySwaggerToken } = require('./middlewares/auth');

// Import models
require('./models');

// Import routes
const greetingRoutes = require('./routes/greeting');
const swaggerAuthRoutes = require('./routes/swagger-auth');
const authRoutes = require('./routes/auth');
const exerciseRoutes = require('./routes/exercise');
const userRoutes = require('./routes/user');
const taskRoutes = require('./routes/task');
const roleRoutes = require('./routes/role');

// Middleware
app.use(helmet()); // Security headers
app.use(cors()); // Enable CORS
app.use(express.json()); // Parse JSON bodies

// Apply rate limiting
app.use('/api', apiLimiter); // Specific rate limiting for API routes

// Root endpoint (NO JWT required)
app.get('/', (req, res) => {
  logger.info('Root endpoint accessed');
  res.json({ message: 'Hello World!' });
});

// API routes (NO JWT required)
app.use('/api', greetingRoutes);
app.use('/api/swagger', swaggerAuthRoutes);
app.use('/api/auth', authRoutes);

// Protected routes (JWT required)
app.use('/api/protected', verifyJwtToken, greetingRoutes);
app.use('/api/exercises', verifyJwtToken, exerciseRoutes);
app.use('/api/users', verifyJwtToken, userRoutes);
app.use('/api/tasks', verifyJwtToken, taskRoutes);
app.use('/api/roles', verifyJwtToken, roleRoutes);

// Legacy routes (keeping for backward compatibility) - NO JWT required
app.get('/api', (req, res) => {
  logger.info('API endpoint accessed');
  res.json({
    message: 'Hello World from CyberX Backend API!',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

app.get('/health', (req, res) => {
  logger.info('Health check endpoint accessed');
  res.json({
    status: 'OK',
    service: 'cyberx-backend',
    timestamp: new Date().toISOString()
  });
});

// Database test endpoint (NO JWT required)
app.get('/api/db-test', async (req, res) => {
  try {
    const { sequelize } = require('./config/database');
    const result = await sequelize.query('SELECT NOW() as current_time');
    logger.info('Database test successful');
    res.json({
      message: 'Database connection successful!',
      currentTime: result[0][0].current_time,
      service: 'cyberx-backend',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Database test failed', { error: error.message });
    console.error('Database query error:', error);
    res.status(500).json({
      error: 'Database connection failed',
      message: error.message
    });
  }
});

// Swagger documentation - PROTECTED with Swagger JWT (ONLY this endpoint)
app.use(
  '/api/docs',
  swaggerLimiter, // Rate limiting for Swagger
  verifySwaggerToken, // 🔒 Require Swagger JWT ONLY for Swagger
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpecs, {
    swaggerOptions: {
      defaultModelsExpandDepth: -1,
      tryItOutEnabled: process.env.NODE_ENV === 'development',
      requestInterceptor: (req) => {
        req.headers['X-Content-Type-Options'] = 'nosniff';
        req.headers['X-Frame-Options'] = 'DENY';
        req.headers['X-XSS-Protection'] = '1; mode=block';
        return req;
      }
    },
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'CyberX API Documentation'
  })
);

// Error handling middleware
app.use((err, req, res, next) => {
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  // Always log the full error details for debugging
  logger.error('Unhandled error occurred', { 
    error: err.message, 
    stack: err.stack,
    path: req.path,
    method: req.method,
    ip: req.ip
  });
  
  // In development, log to console for immediate visibility
  if (isDevelopment) {
    console.error('🔴 Error Stack Trace:', err.stack);
  }
  
  // Prepare response based on environment
  const errorResponse = {
    error: 'Internal Server Error',
    message: isDevelopment ? err.message : 'Something went wrong on our end. Please try again later.',
    ...(isDevelopment && {
      stack: err.stack,
      details: {
        name: err.name,
        path: req.path,
        method: req.method,
        timestamp: new Date().toISOString()
      }
    })
  };
  
  res.status(500).json(errorResponse);
});

// 404 handler
app.use('*', (req, res) => {
  logger.info('Route not found', { path: req.originalUrl });
  res.status(404).json({
    error: 'Route not found',
    path: req.originalUrl
  });
});

// Start server
app.listen(PORT, async () => {
  logger.info(`🚀 CyberX Backend API server running on port ${PORT}`);
  console.log(`🚀 CyberX Backend API server running on port ${PORT}`);
  console.log(`📡 Health check available at: http://localhost:${PORT}/health`);
  console.log(`🌍 Hello World endpoint: http://localhost:${PORT}/api/hello`);
  console.log(`🔐 Protected endpoint: http://localhost:${PORT}/api/protected (JWT Required)`);
      console.log(`💪 Exercise endpoints: http://localhost:${PORT}/api/exercises (JWT Required)`);
    console.log(`👥 User endpoints: http://localhost:${PORT}/api/users (JWT Required)`);
    console.log(`📋 Task endpoints: http://localhost:${PORT}/api/tasks (JWT Required)`);
    console.log(`🔐 Role endpoints: http://localhost:${PORT}/api/roles (JWT Required)`);
    console.log(`🗄️  Database test endpoint: http://localhost:${PORT}/api/db-test`);
    console.log(`📚 API Documentation: http://localhost:${PORT}/api/docs (JWT Protected)`);
  
  // Test database connection and sync
  try {
    const connected = await testConnection();
    if (connected) {
      await syncDatabase(false); // Don't force sync in production
      console.log(`✅ Database connected and synchronized successfully!`);
    }
  } catch (error) {
    logger.error('Database connection failed', { error: error.message });
    console.error('❌ Database connection failed:', error.message);
  }
});

module.exports = app;
