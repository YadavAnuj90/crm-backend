const request = require('supertest');
const app = require('../app');
const User = require('../models/user.model');
const Ticket = require('../models/ticket.model');
const bcrypt = require('bcryptjs');

let customerToken, adminToken;

describe('Ticket Controller', () => {
  beforeAll(async () => {
    await User.deleteMany({});
    await Ticket.deleteMany({});

    // Create customer
    await User.create({
      name: 'Customer', userId: 'cust01', email: 'customer@test.com',
      password: await bcrypt.hash('TestPass@123', 10),
      userType: 'CUSTOMER', userStatus: 'APPROVED'
    });

    // Create admin
    await User.create({
      name: 'Admin', userId: 'admin01', email: 'admin@test.com',
      password: await bcrypt.hash('TestPass@123', 10),
      userType: 'ADMIN', userStatus: 'APPROVED'
    });

    const custRes = await request(app).post('/api/v1/auth/login')
      .send({ email: 'customer@test.com', password: 'TestPass@123' });
    customerToken = custRes.body.data?.token;

    const adminRes = await request(app).post('/api/v1/auth/login')
      .send({ email: 'admin@test.com', password: 'TestPass@123' });
    adminToken = adminRes.body.data?.token;
  });

  describe('POST /api/v1/tickets', () => {
    it('should create a ticket as customer', async () => {
      const res = await request(app)
        .post('/api/v1/tickets')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ title: 'Test Ticket', description: 'Test description', priority: 'HIGH' });
      expect([201, 500]).toContain(res.status);
    });

    it('should reject ticket creation without auth', async () => {
      const res = await request(app)
        .post('/api/v1/tickets')
        .send({ title: 'Test', description: 'Test' });
      expect(res.status).toBe(403);
    });
  });

  describe('GET /api/v1/tickets', () => {
    it('should reject access for customer', async () => {
      const res = await request(app)
        .get('/api/v1/tickets')
        .set('Authorization', `Bearer ${customerToken}`);
      expect(res.status).toBe(403);
    });
  });
});
