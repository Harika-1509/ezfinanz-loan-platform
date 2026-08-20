import { describe, it, expect, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../../../app';
import { prisma } from '../../../prisma/client';
import { ApplicationStage } from '@prisma/client';

const app = createApp();

describe('Google OAuth Module Integration Tests', () => {
  const timestamp = Date.now();
  const googleUser1 = {
    googleId: `gid_${timestamp}_1`,
    email: `oauth_user_${timestamp}@gmail.com`,
    name: 'Google Test User',
  };

  const existingEmailUser = {
    email: `existing_${timestamp}@gmail.com`,
    password: 'StrongPassword@123',
    phone: `9${Math.floor(100000000 + Math.random() * 900000000)}`,
  };

  const googleUser2 = {
    googleId: `gid_${timestamp}_2`,
    email: existingEmailUser.email,
    name: 'Existing Linked User',
  };

  let user1Id: string;
  let user2Id: string;
  let oauthToken1: string;

  afterAll(async () => {
    try {
      const userIds = [user1Id, user2Id].filter(Boolean);
      if (userIds.length > 0) {
        await prisma.application.deleteMany({ where: { userId: { in: userIds } } });
        await prisma.refreshToken.deleteMany({ where: { userId: { in: userIds } } });
        await prisma.user.deleteMany({ where: { id: { in: userIds } } });
      }
    } catch {
      // Ignore cleanup errors
    }
  }, 10000);

  describe('POST /api/v1/auth/google/mock - First-Time OAuth Registration', () => {
    it('should auto-create user with emailVerified=true and provision initial loan application', async () => {
      const res = await request(app).post('/api/v1/auth/google/mock').send(googleUser1);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe(googleUser1.email.toLowerCase());
      expect(res.body.data.user.emailVerified).toBe(true); // Pre-verified by Google
      expect(res.body.data.user.oauthProvider).toBe('google');
      expect(res.body.data.user.oauthId).toBe(googleUser1.googleId);

      // Verify automatic application creation
      expect(res.body.data.application).toBeDefined();
      expect(res.body.data.application.stage).toBe(ApplicationStage.SIGNUP_COMPLETED);

      // Verify JWT and refresh cookie
      expect(res.body.data.accessToken).toBeDefined();
      oauthToken1 = res.body.data.accessToken;
      user1Id = res.body.data.user.id;

      const cookies = res.headers['set-cookie'] as unknown as string[];
      expect(cookies).toBeDefined();
      expect(cookies.some((c: string) => c.includes('refreshToken='))).toBe(true);
    });

    it('should reject invalid mock OAuth payload with 422 Validation Error', async () => {
      const res = await request(app).post('/api/v1/auth/google/mock').send({ googleId: '' }); // missing email and empty id

      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/auth/google/mock - Returning OAuth User Login', () => {
    it('should log in existing OAuth user and issue new access token', async () => {
      const res = await request(app).post('/api/v1/auth/google/mock').send(googleUser1);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.id).toBe(user1Id);
      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.application.id).toBeDefined();
    });
  });

  describe('POST /api/v1/auth/google/mock - Account Linking for Existing Email User', () => {
    it('should smoothly link Google OAuth to existing email/password account and mark emailVerified=true', async () => {
      // 1. Create standard email/password user first
      const signupRes = await request(app).post('/api/v1/auth/signup').send(existingEmailUser);

      expect(signupRes.status).toBe(201);
      user2Id = signupRes.body.data.user.id;
      expect(signupRes.body.data.user.emailVerified).toBe(false);
      expect(signupRes.body.data.user.oauthProvider).toBeNull();

      // 2. Log in with Google OAuth using the same email
      const oauthRes = await request(app).post('/api/v1/auth/google/mock').send(googleUser2);

      expect(oauthRes.status).toBe(200);
      expect(oauthRes.body.success).toBe(true);
      expect(oauthRes.body.data.user.id).toBe(user2Id);
      expect(oauthRes.body.data.user.oauthProvider).toBe('google');
      expect(oauthRes.body.data.user.oauthId).toBe(googleUser2.googleId);
      expect(oauthRes.body.data.user.emailVerified).toBe(true); // Now marked verified
    });
  });

  describe('Unified Auth Contract & Route Guarding', () => {
    it('should allow OAuth-authenticated user to access protected /api/v1/auth/me', async () => {
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${oauthToken1}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.id).toBe(user1Id);
      expect(res.body.data.user.email).toBe(googleUser1.email.toLowerCase());
      expect(res.body.data.application).toBeDefined();
    });
  });
});
