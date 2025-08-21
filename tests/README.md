# CyberX Backend Testing Framework

This directory contains a comprehensive testing framework for the CyberX Backend API using Jest, focusing on security compliance and component isolation.

## 🏗️ Test Structure

```
tests/
├── setup.js                 # Jest setup and global utilities
├── unit.test.js             # Unit tests for individual components
├── security.test.js         # Security tests (ASVS compliance + integration)
├── README.md               # This documentation
└── mocks/                  # Mock files and test data (future use)
```

## 🚀 Getting Started

### Prerequisites

- Node.js 16+ 
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Set up test environment
cp .env.test.example .env.test
# Edit .env.test with your test database configuration
```

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run specific test categories
npm run test:unit          # Unit tests only
npm run test:security      # Security tests only
```

## 📋 Test Categories

### 1. Unit Tests (`unit.test.js`)

**Purpose**: Test individual components in isolation

**Current Test**:
- **JWT Token Verification**: Tests the authentication middleware function
- **Mocked Dependencies**: Uses mocked JWT verification
- **Fast Execution**: No external dependencies

**Example**:
```javascript
test('should verify JWT token successfully', () => {
  // Mock JWT verification
  jwt.verify.mockImplementation((token, secret, callback) => {
    callback(null, decodedToken);
  });

  // Test middleware function
  verifyJwtToken(mockReq, mockRes, mockNext);

  // Verify behavior
  expect(mockReq.user).toBeDefined();
  expect(mockNext).toHaveBeenCalledWith();
});
```

### 2. Security Tests (`security.test.js`)

**Purpose**: Test security compliance and full API integration

**Current Tests**:
- **ASVS 2.1.1**: Authentication controls enforcement
- **OWASP Compliance**: Application Security Verification Standard
- **Security Validation**: Ensures proper authentication requirements
- **Integration Testing**: Full API endpoint testing with database
- **Database Integration**: Tests with SQLite in-memory database

**Example**:
```javascript
test('ASVS 2.1.1: Verify all authentication controls are enforced', async () => {
  const response = await request(app)
    .get('/api/protected');

  expect(response.status).toBe(401);
  expect(response.body).toHaveProperty('error', 'Unauthorized');
});
```

## 🛠️ Test Utilities

### Global Test Utilities (`setup.js`)

The `setup.js` file provides essential configuration and utilities for all tests:

```javascript
// Load test environment variables
require('dotenv').config({ path: '.env.test' });

// Set test environment
process.env.NODE_ENV = 'test';

// Increase timeout for database operations
jest.setTimeout(10000);

// Mock console methods to reduce noise
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Global test utilities
global.testUtils = {
  // Generate test JWT tokens
  generateTestToken: (payload = {}) => { /* ... */ },
  generateSwaggerToken: () => { /* ... */ },
  
  // Mock request/response objects
  mockRequest: (overrides = {}) => { /* ... */ },
  mockResponse: () => { /* ... */ },
  mockNext: jest.fn(),

  // Database seeding for tests
  seedTestDatabase: async () => { /* ... */ }
};

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
});
```

### Key Functions in `setup.js`:

1. **Environment Configuration**:
   - Loads `.env.test` file
   - Sets `NODE_ENV=test`
   - Configures test timeouts

2. **Console Mocking**:
   - Reduces test output noise
   - Prevents console logs during tests
   - Maintains clean test output

3. **Global Utilities**:
   - `generateTestToken()`: Creates JWT tokens for testing
   - `generateSwaggerToken()`: Creates Swagger-specific tokens
   - `mockRequest()`: Creates mock Express request objects
   - `mockResponse()`: Creates mock Express response objects
   - `mockNext()`: Creates mock Express next functions
   - `seedTestDatabase()`: Seeds SQLite test database with sample data

4. **Test Cleanup**:
   - Clears all mocks after each test
   - Ensures test isolation
   - Prevents test interference

## 🗄️ Test Environment Configuration

The test environment uses:
- **Database**: SQLite in-memory for fast, isolated testing
- **JWT Secrets**: Test-specific secrets from `.env.test`
- **Logging**: Error level only to reduce noise
- **Rate Limiting**: Relaxed for testing

### `.env.test` Configuration

```bash
# Test Environment Configuration
NODE_ENV=test
PORT=3001
SERVICE_NAME=cyberx-api-test

# Database Configuration (SQLite for testing)
DB_HOST=localhost
DB_PORT=5432
DB_NAME=cyberx_test
DB_USER=test_user
DB_PASSWORD=test_password

# JWT Configuration
JWT_SECRET=test-jwt-secret-key-2024
JWT_SWAGGER_SECRET=test-swagger-secret-key-2024
SWAGGER_SECRET=cyberx-swagger-access-secret-2024

# Logging
LOG_LEVEL=error

# Security
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

## 📊 Test Coverage

The current test suite provides:

- **Unit Tests**: 1 test covering JWT middleware
- **Security Tests**: 1 test covering ASVS authentication compliance

### Coverage Report

```bash
npm run test:coverage
```

This generates a detailed coverage report showing:
- Line coverage
- Branch coverage
- Function coverage
- Statement coverage

## 🔒 Security Testing

### ASVS Compliance

The security tests ensure compliance with OWASP ASVS (Application Security Verification Standard):

- **Level 1**: Basic security requirements
- **Level 2**: Enhanced security requirements
- **Level 3**: Advanced security requirements

### Current Security Test

**ASVS 2.1.1 - Authentication Architecture**
- ✅ Verifies authentication controls are enforced on the server side
- ✅ Tests protected route access without authentication
- ✅ Validates proper error responses

### Planned Security Tests

**Authentication & Session Management**
- ASVS 2.1.2: Authentication controls fail securely
- ASVS 2.1.3: Password-based authentication
- ASVS 2.1.4: Multi-factor authentication
- ASVS 2.1.5: Session management

**User Management (Admin Only)**
- Admin user creation and management
- Role assignment and permissions
- User account status management

**Access Control**
- ASVS 4.1.1: Access control policy enforcement
- ASVS 4.1.2: Role-based access control
- ASVS 4.1.3: Resource access control

**Input Validation**
- ASVS 5.1.1: Input validation policy
- ASVS 5.1.2: Input validation implementation
- ASVS 5.1.3: Output encoding

## 🚨 Test Failures and Debugging

### Common Issues

1. **Database Connection Failures**
   ```bash
   # Ensure test database is properly seeded
   npm test
   ```

2. **JWT Token Issues**
   ```bash
   # Check JWT secrets in .env.test
   echo $JWT_SECRET
   ```

3. **Port Conflicts**
   ```bash
   # Check if port 3001 is in use
   lsof -i :3001
   ```

### Debugging Tests

```bash
# Run specific test with verbose output
npm test -- --verbose tests/unit.test.js

# Run tests with debugging
DEBUG=* npm test

# Run single test
npm test -- --testNamePattern="should verify JWT token"
```

## 📝 Adding New Tests

### Unit Test Example

```javascript
// Add to unit.test.js
test('should handle invalid JWT token', () => {
  mockReq.headers.authorization = 'Bearer invalid.token';
  
  jwt.verify.mockImplementation((token, secret, callback) => {
    callback(new Error('Invalid token'), null);
  });

  verifyJwtToken(mockReq, mockRes, mockNext);

  expect(mockRes.status).toHaveBeenCalledWith(403);
  expect(mockNext).not.toHaveBeenCalled();
});
```

### Security Test Example

```javascript
// Add to security.test.js
test('ASVS 2.1.2: Verify authentication controls fail securely', async () => {
  const response = await request(app)
    .get('/api/protected')
    .set('Authorization', 'Bearer invalid.token');

  expect(response.status).toBe(403);
  expect(response.body).toHaveProperty('error', 'Forbidden');
});
```

## 🎯 Best Practices

1. **Test Isolation**: Each test should be independent
2. **Mock External Dependencies**: Use mocks for external APIs
3. **Clear Test Names**: Descriptive test names that explain the scenario
4. **Arrange-Act-Assert**: Structure tests with clear sections
5. **Edge Cases**: Test both success and failure scenarios
6. **Security Focus**: Always include security considerations in tests
7. **Database Seeding**: Use the provided seeding utilities for consistent test data

## 📚 Additional Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Supertest Documentation](https://github.com/visionmedia/supertest)
- [OWASP ASVS](https://owasp.org/www-project-application-security-verification-standard/)
- [Node.js Testing Best Practices](https://nodejs.org/en/docs/guides/testing-and-debugging/)

## 🤝 Contributing

When adding new features or fixing bugs:

1. Write tests first (TDD approach)
2. Ensure all tests pass
3. Maintain or improve test coverage
4. Update this documentation if needed
5. Include security tests for new endpoints

---

**Note**: This testing framework provides comprehensive coverage for security compliance and component isolation, with room for expansion as the application grows.

**Important**: The current `/api/auth/register` endpoint is temporary and will be replaced with admin-only user management functionality.
