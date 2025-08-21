/**
 * Jest Setup File for CyberX Backend Tests
 * 
 * This file configures the test environment and provides global utilities
 * that are available to all test files.
 */

// Load environment variables from .env.test file
require('dotenv').config({ path: '.env.test' });

// Set the Node.js environment to 'test'
// This affects how the application behaves (e.g., database connections, logging)
process.env.NODE_ENV = 'test';

// Increase Jest timeout to 10 seconds for database operations
// This prevents tests from timing out during slow database queries
jest.setTimeout(10000);

// Mock console methods to reduce noise in test output
// This prevents console.log, console.error, etc. from cluttering test results
global.console = {
  ...console, // Keep original console methods
  log: jest.fn(),    // Mock console.log
  debug: jest.fn(),  // Mock console.debug
  info: jest.fn(),   // Mock console.info
  warn: jest.fn(),   // Mock console.warn
  error: jest.fn(),  // Mock console.error
};

/**
 * Global Test Utilities
 * 
 * These utilities are available in all test files via the global.testUtils object
 */
global.testUtils = {
  /**
   * Generate a test JWT token for authentication testing
   * @param {Object} payload - Additional payload to include in the token
   * @returns {string} JWT token string
   */
  generateTestToken: (payload = {}) => {
    const jwt = require('jsonwebtoken');
    const defaultPayload = {
      userId: 'test-user-id',
      email: 'test@cyberx.com',
      name: 'Test User',
      roles: ['user'],
      iat: Math.floor(Date.now() / 1000),        // Issued at
      exp: Math.floor(Date.now() / 1000) + 3600  // Expires in 1 hour
    };
    return jwt.sign(
      { ...defaultPayload, ...payload }, 
      process.env.JWT_SECRET || 'test-secret'
    );
  },

  /**
   * Generate a test Swagger JWT token for Swagger documentation access
   * @returns {string} JWT token string for Swagger
   */
  generateSwaggerToken: () => {
    const jwt = require('jsonwebtoken');
    const payload = {
      userId: 'swagger-user',
      email: 'swagger@cyberx.com',
      role: 'swagger-access',
      purpose: 'swagger-documentation',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600
    };
    return jwt.sign(
      payload, 
      process.env.JWT_SWAGGER_SECRET || process.env.JWT_SECRET || 'test-secret'
    );
  },

  /**
   * Create a mock Express request object for testing
   * @param {Object} overrides - Properties to override in the mock request
   * @returns {Object} Mock request object
   */
  mockRequest: (overrides = {}) => ({
    headers: {},
    body: {},
    query: {},
    params: {},
    ip: '127.0.0.1',
    method: 'GET',
    path: '/test',
    get: jest.fn(), // Mock the get() method for headers
    ...overrides
  }),

  /**
   * Create a mock Express response object for testing
   * @returns {Object} Mock response object with chained methods
   */
  mockResponse: () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);  // status() returns the response object
    res.json = jest.fn().mockReturnValue(res);    // json() returns the response object
    res.send = jest.fn().mockReturnValue(res);    // send() returns the response object
    res.setHeader = jest.fn().mockReturnValue(res); // setHeader() returns the response object
    return res;
  },

  /**
   * Create a mock Express next function for testing middleware
   * @returns {Function} Mock next function
   */
  mockNext: jest.fn(),

  /**
   * Seed the test database with sample data
   * This function creates the same test data as the main seed.js file
   * @returns {Promise<void>}
   */
  seedTestDatabase: async () => {
    try {
      const { User, Role, UserRole } = require('../models');
      const { syncDatabase } = require('../config/database');
      
      // Sync database (create tables)
      await syncDatabase(true); // Force sync to recreate tables
      
      // Create roles
      const roles = [
        {
          name: 'admin',
          description: 'Administrator with full access',
          permissions: ['read', 'write', 'delete', 'admin']
        },
        {
          name: 'user',
          description: 'Regular user with basic access',
          permissions: ['read', 'write']
        },
        {
          name: 'viewer',
          description: 'Read-only user',
          permissions: ['read']
        }
      ];
      
      const createdRoles = {};
      
      for (const roleData of roles) {
        const role = await Role.createRole(roleData);
        createdRoles[role.name] = role;
      }
      
      // Create test users
      const users = [
        {
          email: 'admin@cyberx.com',
          password: 'admin123',
          name: 'Admin User',
          roles: ['admin']
        },
        {
          email: 'user@cyberx.com',
          password: 'user123',
          name: 'Regular User',
          roles: ['user']
        },
        {
          email: 'viewer@cyberx.com',
          password: 'viewer123',
          name: 'Viewer User',
          roles: ['viewer']
        }
      ];
      
      for (const userData of users) {
        const user = await User.createUser({
          email: userData.email,
          password: userData.password,
          name: userData.name
        });
        
        // Assign roles to user
        for (const roleName of userData.roles) {
          const role = createdRoles[roleName];
          if (role) {
            await UserRole.create({
              userId: user.id,
              roleId: role.id,
              assignedBy: null // Self-assigned during seeding
            });
          }
        }
      }
      
    } catch (error) {
      console.error('❌ Test database seeding failed:', error.message);
      throw error;
    }
  }
};

/**
 * Test Cleanup Hook
 * 
 * This runs after each test to ensure clean state between tests
 */
afterEach(() => {
  // Clear all Jest mocks to prevent test interference
  jest.clearAllMocks();
});
