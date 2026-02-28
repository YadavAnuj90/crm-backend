const request = require('supertest');
const app = require('../app');
const User = require('../models/user.model');

describe('Auth Controller', () => {
  beforeEach(async () => {
    await User.deleteMany({});
  });

  describe('POST /api/v1/auth/signup', () => {
    it('should create a new customer user', async () => {
      const res = await request(app)
        .post('/api/v1/auth/signup')
        .send({
          name: 'Test User',
          userId: 'testuser01',
          email: 'testuser@example.com',
          password: 'TestPass@123',
          userType: 'CUSTOMER'
        });
      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('email', 'testuser@example.com');
    });

    it('should reject duplicate email', async () => {
      const userData = {
        name: 'Test User', userId: 'testuser01',
        email: 'dup@example.com', password: 'TestPass@123', userType: 'CUSTOMER'
      };
      await request(app).post('/api/v1/auth/signup').send(userData);
      const res = await request(app).post('/api/v1/auth/signup')
        .send({ ...userData, userId: 'testuser02' });
      expect(res.status).toBe(400);
    });

    it('should reject missing required fields', async () => {
      const res = await request(app)
        .post('/api/v1/auth/signup')
        .send({ email: 'incomplete@example.com' });
      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/v1/auth/login', () => {
    beforeEach(async () => {
      await request(app).post('/api/v1/auth/signup').send({
        name: 'Login User', userId: 'loginuser',
        email: 'login@example.com', password: 'LoginPass@123', userType: 'CUSTOMER'
      });
    });

    it('should login with valid credentials', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'login@example.com', password: 'LoginPass@123' });
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty('token');
      expect(res.body.data).toHaveProperty('refreshToken');
    });

    it('should reject invalid password', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'login@example.com', password: 'WrongPassword' });
      expect(res.status).toBe(400);
    });

    it('should reject missing credentials', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'login@example.com' });
      expect(res.status).toBe(400);
    });
  });

  describe('GET /health', () => {
    it('should return health status', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('status');
      expect(res.body).toHaveProperty('services');
    });
  });
});
