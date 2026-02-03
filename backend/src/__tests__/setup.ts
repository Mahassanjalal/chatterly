// Jest setup file
// Mock environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key';
process.env.MONGODB_URI = 'mongodb://localhost:27017/chatterly-test';
process.env.REDIS_URL = 'redis://localhost:6379';
process.env.PORT = '4000';
process.env.CORS_ORIGIN = 'http://localhost:3000';

// Clear all mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
});
