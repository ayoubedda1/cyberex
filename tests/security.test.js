const request = require('supertest');
const app = require('../server');

describe('Security Tests', () => {
  // Seed the test database before running security tests
  beforeAll(async () => {
    await global.testUtils.seedTestDatabase();
  });

  test('ASVS 2.1.1: Verify all authentication controls are enforced on the server side', async () => {
    // Test that protected route requires authentication
    const response = await request(app)
      .get('/api/protected');

    expect(response.status).toBe(401);
    expect(response.body).toHaveProperty('error', 'Unauthorized');
    expect(response.body).toHaveProperty('message', 'Access token is missing');
    expect(response.body).toHaveProperty('code', 'UNAUTHORIZED');
  });

  test('ASVS V2.1.2: Verify password length limits (64+ characters permitted, 128+ denied)', async () => {
    // Test password with 64 characters (should be permitted)
    const validPassword64 = 'a'.repeat(64);
    const response64 = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'admin@cyberx.com',
        password: validPassword64
      });

    // Should not fail due to password length (will fail due to wrong password, but not validation)
    expect(response64.status).not.toBe(400);
    expect(response64.body).not.toHaveProperty('error', 'Validation Error');

    // Test password with 129 characters (should be denied)
    const invalidPassword129 = 'a'.repeat(129);
    const response129 = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'admin@cyberx.com',
        password: invalidPassword129
      });

    // Should fail due to password length validation
    expect(response129.status).toBe(400);
    expect(response129.body).toHaveProperty('error', 'Validation Error');
    expect(response129.body).toHaveProperty('details');
    
    // Check that the validation error mentions password length
    expect(response129.body.details).toBeDefined();
    expect(response129.body.details.length).toBeGreaterThan(0);
    
    // Find password validation error
    const passwordError = response129.body.details.find(error => 
      error.param === 'password'
    );
    
    if (passwordError) {
      expect(passwordError.msg).toContain('128');
    } else {
      // If no specific password error, check that there's a validation error
      expect(response129.body.error).toBe('Validation Error');
    }
  });

  test('ASVS V2.2.1: Verify account lockout after multiple failed login attempts', async () => {
    // Attempt login 5 times with wrong password to trigger lockout
    for (let i = 0; i < 5; i++) {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'user@cyberx.com',
          password: 'wrongpassword'
        });

      // Should fail with 401 (wrong password)
      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('success', false);
    }

    // 6th attempt should result in account lock (423 status)
    const lockedResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'user@cyberx.com',
        password: 'user123' // Correct password
      });

    expect(lockedResponse.status).toBe(423);
    expect(lockedResponse.body).toHaveProperty('error', 'Account Locked');
    expect(lockedResponse.body).toHaveProperty('message');
    expect(lockedResponse.body.message).toContain('temporarily locked');
    expect(lockedResponse.body).toHaveProperty('lockedUntil');

    // Verify lockedUntil is a future date
    const lockedUntil = new Date(lockedResponse.body.lockedUntil);
    expect(lockedUntil.getTime()).toBeGreaterThan(Date.now());
  });

  test('ASVS V2.4.1: Verify JWT token secrets are cryptographically strong', async () => {
    // Test JWT_SECRET strength
    const jwtSecret = process.env.JWT_SECRET;
    expect(jwtSecret).toBeDefined();
    expect(jwtSecret).not.toBe('');
    expect(jwtSecret).not.toBe('your-secret-key'); // Default weak secret
    
    // Verify minimum length (at least 24 characters for strong secrets)
    expect(jwtSecret.length).toBeGreaterThanOrEqual(24);
    
    // Verify entropy (should not be a simple pattern)
    const entropy = calculateEntropy(jwtSecret);
    expect(entropy).toBeGreaterThan(3.0); // Good entropy threshold
    
    // Test JWT_SWAGGER_SECRET strength
    const swaggerSecret = process.env.JWT_SWAGGER_SECRET;
    expect(swaggerSecret).toBeDefined();
    expect(swaggerSecret).not.toBe('');
    expect(swaggerSecret.length).toBeGreaterThanOrEqual(24);
    
    const swaggerEntropy = calculateEntropy(swaggerSecret);
    expect(swaggerEntropy).toBeGreaterThan(3.0);
    
    // Verify secrets are different
    expect(jwtSecret).not.toBe(swaggerSecret);
    
    // Test that tokens can be generated and verified
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'admin@cyberx.com',
        password: 'admin123'
      });

    expect(loginResponse.status).toBe(200);
    expect(loginResponse.body).toHaveProperty('token');
    
    // Verify the token is valid by accessing a protected endpoint
    const protectedResponse = await request(app)
      .get('/api/protected/hello')
      .set('Authorization', `Bearer ${loginResponse.body.token}`);

    expect(protectedResponse.status).toBe(200);
  });
});

/**
 * Calculate entropy of a string to measure randomness
 * Higher entropy indicates more random/secure secrets
 * @param {string} str - The string to calculate entropy for
 * @returns {number} - Entropy value (higher is better)
 */
function calculateEntropy(str) {
  const charCount = {};
  for (let char of str) {
    charCount[char] = (charCount[char] || 0) + 1;
  }
  
  let entropy = 0;
  const len = str.length;
  
  for (let count of Object.values(charCount)) {
    const probability = count / len;
    entropy -= probability * Math.log2(probability);
  }
  
  return entropy;
}
