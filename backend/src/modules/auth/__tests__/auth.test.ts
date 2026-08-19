import { describe, it, expect, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../../../app';
import { prisma } from '../../../prisma/client';

const app = createApp();

describe('Auth Module Integration & Unit Tests', () => {
  const testEmail = `auth_test_${Date.now()}@example.com`;
  const testPassword = 'StrongPassword@123';
  let accessToken: string;
  let refreshTokenCookie: string;

  afterAll(async () => {
    // Cleanup any test accounts created
    const testUsers = await prisma.user.findMany({
      where: { email: { startsWith: 'auth_test_' } },
      select: { id: true },
    });

    for (const u of testUsers) {
      await prisma.application.deleteMany({ where: { userId: u.id } });
      await prisma.refreshToken.deleteMany({ where: { userId: u.id } });
      await prisma.user.delete({ where: { id: u.id } });
    }
  });

  describe('POST /api/v1/auth/signup', () => {
    it('should successfully signup a new user and automatically create initial application row', async () => {
      const res = await request(app).post('/api/v1/auth/signup').send({
        email: testEmail,
        password: testPassword,
        phone: '9876543299',
      });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user).toBeDefined();
      expect(res.body.data.user.email).toBe(testEmail);
      expect(res.body.data.accessToken).toBeDefined();

      // Verify linked application row was created automatically at initial stage
      expect(res.body.data.application).toBeDefined();
      expect(res.body.data.application.stage).toBe('SIGNUP_COMPLETED');
      expect(res.body.data.application.userId).toBe(res.body.data.user.id);

      // Verify httpOnly cookie was set
      const cookies = res.headers['set-cookie'];
      expect(cookies).toBeDefined();
      expect(cookies[0]).toContain('refreshToken=');
      expect(cookies[0]).toContain('HttpOnly');
    });

    it('should reject duplicate email with 409 Conflict', async () => {
      const res = await request(app).post('/api/v1/auth/signup').send({
        email: testEmail,
        password: testPassword,
      });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('already exists');
    });

    it('should reject weak passwords with 422 Validation Error', async () => {
      // Test password too short (< 8 chars)
      const resShort = await request(app)
        .post('/api/v1/auth/signup')
        .send({
          email: `short_${Date.now()}@example.com`,
          password: 'short',
        });

      expect(resShort.status).toBe(422);
      expect(resShort.body.success).toBe(false);

      // Test password without special character or number
      const resNoSpecial = await request(app)
        .post('/api/v1/auth/signup')
        .send({
          email: `nospecial_${Date.now()}@example.com`,
          password: 'PasswordWithoutNumbers',
        });

      expect(resNoSpecial.status).toBe(422);
      expect(resNoSpecial.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/auth/login', () => {
    it('should successfully log in with correct credentials and return access token', async () => {
      const res = await request(app).post('/api/v1/auth/login').send({
        email: testEmail,
        password: testPassword,
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.user.email).toBe(testEmail);
      expect(res.body.data.application).toBeDefined();

      accessToken = res.body.data.accessToken;
      const cookies = res.headers['set-cookie'];
      refreshTokenCookie = cookies[0];
      expect(refreshTokenCookie).toContain('refreshToken=');
    });

    it('should reject login with wrong password (401 Unauthorized)', async () => {
      const res = await request(app).post('/api/v1/auth/login').send({
        email: testEmail,
        password: 'WrongPassword@999',
      });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Invalid email or password.');
    });

    it('should reject login with non-existent email (401 Unauthorized)', async () => {
      const res = await request(app).post('/api/v1/auth/login').send({
        email: 'nonexistent_user_999@example.com',
        password: testPassword,
      });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/auth/refresh', () => {
    it('should rotate tokens and return a fresh access token using cookie', async () => {
      const res = await request(app)
        .post('/api/v1/auth/refresh')
        .set('Cookie', refreshTokenCookie)
        .send({});

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.user.email).toBe(testEmail);

      // Verify a new refresh cookie was set
      const newCookies = res.headers['set-cookie'];
      expect(newCookies).toBeDefined();
      expect(newCookies[0]).toContain('refreshToken=');
    });

    it('should reject refresh request without a valid token', async () => {
      const res = await request(app).post('/api/v1/auth/refresh').send({});

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/auth/me (Protected Route)', () => {
    it('should reject access without token with 401 Unauthorized', async () => {
      const res = await request(app).get('/api/v1/auth/me');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should return user profile and active loan application when authorized', async () => {
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe(testEmail);
      expect(res.body.data.application).toBeDefined();
      expect(res.body.data.application.stage).toBe('SIGNUP_COMPLETED');
    });
  });
});
