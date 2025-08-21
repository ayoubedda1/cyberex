const jwt = require('jsonwebtoken');
const { verifyJwtToken } = require('../middlewares/auth');

// Mock jsonwebtoken
jest.mock('jsonwebtoken');

describe('Unit Tests', () => {
  let mockReq, mockRes, mockNext;

  beforeEach(() => {
    mockReq = {
      headers: {},
      body: {},
      query: {},
      params: {},
      ip: '127.0.0.1',
      method: 'GET',
      path: '/test',
      get: jest.fn()
    };
    
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
      setHeader: jest.fn().mockReturnThis()
    };
    
    mockNext = jest.fn();
    
    // Reset all mocks
    jest.clearAllMocks();
  });

  test('should verify JWT token successfully', () => {
    const decodedToken = {
      userId: 'test-user-id',
      email: 'test@cyberx.com',
      name: 'Test User',
      roles: ['user']
    };
    
    mockReq.headers.authorization = 'Bearer valid.token.here';
    jwt.verify.mockImplementation((token, secret, callback) => {
      callback(null, decodedToken);
    });

    verifyJwtToken(mockReq, mockRes, mockNext);

    expect(mockReq.user).toBeDefined();
    expect(mockReq.user.userId).toBe('test-user-id');
    expect(mockReq.user.email).toBe('test@cyberx.com');
    expect(mockNext).toHaveBeenCalledWith();
  });
});
