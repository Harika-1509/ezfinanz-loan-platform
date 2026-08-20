import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../../../app';
import { prisma } from '../../../prisma/client';
import { ApplicationStage, Role } from '@prisma/client';

const app = createApp();

describe('Chunk 24: Security Hardening Integration Test Suite', () => {
  const timestamp = Date.now();

  const customerA = {
    email: `sec_cust_a_${timestamp}@testfinanz.com`,
    password: 'SecurePassword@123',
    phone: `9${Math.floor(100000000 + Math.random() * 900000000)}`,
  };

  const customerB = {
    email: `sec_cust_b_${timestamp}@testfinanz.com`,
    password: 'SecurePassword@123',
    phone: `9${Math.floor(100000000 + Math.random() * 900000000)}`,
  };

  const adminCredentials = {
    email: `sec_admin_${timestamp}@testfinanz.com`,
    password: 'AdminPassword@123',
    phone: `9${Math.floor(100000000 + Math.random() * 900000000)}`,
  };

  let tokenA: string;
  let userAId: string;
  let appAId: string;
  let refreshTokenA: string;

  let tokenB: string;
  let userBId: string;
  let appBId: string;

  let adminToken: string;
  let adminId: string;

  beforeAll(async () => {
    // 1. Create Customer A (unverified initially)
    const resA = await request(app).post('/api/v1/auth/signup').send(customerA);
    tokenA = resA.body.data.accessToken;
    userAId = resA.body.data.user.id;
    appAId = resA.body.data.application.id;

    // Extract cookie or response refreshToken
    const cookies = resA.headers['set-cookie'] as unknown as string[] | undefined;
    if (cookies) {
      const match = cookies[0]?.match(/refreshToken=([^;]+)/);
      if (match) refreshTokenA = match[1];
    }
    if (!refreshTokenA) {
      const dbToken = await prisma.refreshToken.findFirst({
        where: { userId: userAId },
        orderBy: { createdAt: 'desc' },
      });
      refreshTokenA = dbToken?.token || '';
    }

    // 2. Create Customer B (verified)
    const resB = await request(app).post('/api/v1/auth/signup').send(customerB);
    tokenB = resB.body.data.accessToken;
    userBId = resB.body.data.user.id;
    appBId = resB.body.data.application.id;

    await prisma.user.update({
      where: { id: userBId },
      data: { emailVerified: true, phoneVerified: true },
    });

    // 3. Create Admin user
    const resAdmin = await request(app)
      .post('/api/v1/auth/signup')
      .send(adminCredentials);
    adminId = resAdmin.body.data.user.id;

    await prisma.user.update({
      where: { id: adminId },
      data: { role: Role.ADMIN, emailVerified: true, phoneVerified: true },
    });

    const loginAdmin = await request(app).post('/api/v1/auth/login').send({
      email: adminCredentials.email,
      password: adminCredentials.password,
    });
    adminToken = loginAdmin.body.data.accessToken;
  });

  afterAll(async () => {
    const userIds = [userAId, userBId, adminId].filter(Boolean);
    if (userIds.length > 0) {
      await prisma.kycDetails.deleteMany({
        where: { application: { userId: { in: userIds } } },
      });
      await prisma.application.deleteMany({
        where: { userId: { in: userIds } },
      });
      await prisma.refreshToken.deleteMany({
        where: { userId: { in: userIds } },
      });
      await prisma.user.deleteMany({
        where: { id: { in: userIds } },
      });
    }
  });

  // =========================================================================
  // 1. ADMIN RBAC ENFORCEMENT — NON-ADMIN TOKEN REJECTION (HTTP 403)
  // =========================================================================
  describe('Admin-Only Endpoint Server-Side Protection (RBAC)', () => {
    it('should reject non-admin customer token hitting GET /api/v1/admin/applications with 403 Forbidden', async () => {
      const res = await request(app)
        .get('/api/v1/admin/applications')
        .set('Authorization', `Bearer ${tokenA}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('should reject non-admin customer token hitting GET /api/v1/admin/applications/:id with 403 Forbidden', async () => {
      const res = await request(app)
        .get(`/api/v1/admin/applications/${appAId}`)
        .set('Authorization', `Bearer ${tokenA}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('should reject non-admin customer token hitting POST /api/v1/admin/applications/:id/selfie/approve with 403 Forbidden', async () => {
      const res = await request(app)
        .post(`/api/v1/admin/applications/${appAId}/selfie/approve`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({});

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('should reject non-admin customer token hitting POST /api/v1/admin/applications/:id/selfie/reject with 403 Forbidden', async () => {
      const res = await request(app)
        .post(`/api/v1/admin/applications/${appAId}/selfie/reject`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ reason: 'Photo is blurry' });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('should reject non-admin customer token hitting POST /api/v1/admin/applications/:id/disburse with 403 Forbidden', async () => {
      const res = await request(app)
        .post(`/api/v1/admin/applications/${appAId}/disburse`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({});

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('should reject non-admin customer token hitting GET /api/v1/admin/stats with 403 Forbidden', async () => {
      const res = await request(app)
        .get('/api/v1/admin/stats')
        .set('Authorization', `Bearer ${tokenA}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('should allow genuine admin token hitting GET /api/v1/admin/applications with 200 OK', async () => {
      const res = await request(app)
        .get('/api/v1/admin/applications')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.applications)).toBe(true);
    });
  });

  // =========================================================================
  // 2. STAGE PROGRESSION OUT-OF-ORDER DIRECT API CALL REJECTION
  // =========================================================================
  describe('Out-of-Order Lifecycle Stage Progression Enforcement', () => {
    it('should reject KYC submission when user email and phone are not yet verified (stage SIGNUP_COMPLETED) with 403', async () => {
      // Customer A is at SIGNUP_COMPLETED and unverified
      const res = await request(app)
        .post('/api/v1/kyc/submit')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          fullName: 'Customer A Name',
          dob: '1990-05-15',
          gender: 'MALE',
          address: '123 Test Address, Mumbai',
          idType: 'PAN',
          idNumber: 'ABCDE1234F',
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('FORBIDDEN');
      expect(res.body.message).toMatch(/verification required/i);
    });

    it('should reject direct call to /eligibility/check when application is at pre-KYC stage with 400 Bad Request', async () => {
      // Customer B is verified, but application is still at SIGNUP_COMPLETED / KYC_PENDING
      await prisma.application.update({
        where: { id: appBId },
        data: { stage: ApplicationStage.KYC_PENDING },
      });

      const res = await request(app)
        .post('/api/v1/eligibility/check')
        .set('Authorization', `Bearer ${tokenB}`)
        .send({
          income: 75000,
          requestedAmount: 300000,
          existingDebts: 5000,
          employerName: 'TCS',
          designation: 'Engineer',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/Invalid application state/i);
    });

    it('should reject direct call to /bank-account/submit when stage is prior to EMI_SELECTED with 400 Bad Request', async () => {
      // Set Customer B stage to KYC_SUBMITTED
      await prisma.application.update({
        where: { id: appBId },
        data: { stage: ApplicationStage.KYC_SUBMITTED },
      });

      const res = await request(app)
        .post('/api/v1/bank-account/submit')
        .set('Authorization', `Bearer ${tokenB}`)
        .send({
          holderName: 'Customer B',
          accountNumber: '123456789012',
          ifsc: 'HDFC0001234',
          bankName: 'HDFC Bank',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/Invalid application state/i);
    });

    it('should reject direct call to /declaration/accept when stage is prior to BANK_ADDED with 400 Bad Request', async () => {
      // Set Customer B stage to ELIGIBILITY_CHECKED
      await prisma.application.update({
        where: { id: appBId },
        data: { stage: ApplicationStage.ELIGIBILITY_CHECKED },
      });

      const res = await request(app)
        .post('/api/v1/declaration/accept')
        .set('Authorization', `Bearer ${tokenB}`)
        .send({
          accepted: true,
          termsVersion: 'v1.0',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/Invalid application state/i);
    });

    it('should reject direct call to /selfie/submit when stage is prior to DECLARATION_CONFIRMED with 400 Bad Request', async () => {
      // Set Customer B stage to BANK_ADDED
      await prisma.application.update({
        where: { id: appBId },
        data: { stage: ApplicationStage.BANK_ADDED },
      });

      const res = await request(app)
        .post('/api/v1/selfie/submit')
        .set('Authorization', `Bearer ${tokenB}`)
        .send({
          base64Data: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/Invalid application state/i);
    });

    it('should reject admin disburse attempt when application is at pre-APPROVED stage with 400 Bad Request', async () => {
      // Application B is at BANK_ADDED
      const res = await request(app)
        .post(`/api/v1/admin/applications/${appBId}/disburse`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/APPROVED/i);
    });
  });

  // =========================================================================
  // 3. CROSS-TENANT / CROSS-USER AUTHORIZATION ENFORCEMENT
  // =========================================================================
  describe('Cross-User Application Isolation & Authorization', () => {
    it('should prevent Customer A from mutating Customer B application with 403 Forbidden', async () => {
      // Customer A sends request supplying Customer B application ID in body/params
      const res = await request(app)
        .post('/api/v1/kyc/submit')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          applicationId: appBId, // Cross-tenant target
          fullName: 'Hacker Name',
          dob: '1990-01-01',
          gender: 'MALE',
          address: 'Unauthorized Street',
          idType: 'PAN',
          idNumber: 'ABCDE1234F',
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('FORBIDDEN');
      expect(res.body.message).toMatch(/authorized/i);
    });
  });

  // =========================================================================
  // 4. UNAUTHENTICATED & MALFORMED TOKEN ACCESS REJECTION (HTTP 401)
  // =========================================================================
  describe('Unauthenticated Request Handling', () => {
    it('should reject requests missing Authorization header with 401 Unauthorized', async () => {
      const res = await request(app).get('/api/v1/auth/me');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('should reject requests with malformed or tampered JWT with 401 Unauthorized', async () => {
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', 'Bearer forged.tampered.token.signature');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });
  });

  // =========================================================================
  // 5. JWT REFRESH TOKEN ROTATION & LOGOUT REVOCATION
  // =========================================================================
  describe('JWT Token Rotation & Invalidation on Logout', () => {
    let rotatedRefreshToken: string;

    it('should rotate refresh token and issue new access token on POST /auth/refresh', async () => {
      expect(refreshTokenA).toBeDefined();

      const res = await request(app)
        .post('/api/v1/auth/refresh')
        .set('Cookie', [`refreshToken=${refreshTokenA}`])
        .send({ refreshToken: refreshTokenA });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.accessToken).toBeDefined();

      // Extract rotated refresh token from cookies
      const cookies = res.headers['set-cookie'] as unknown as string[] | undefined;
      if (cookies) {
        const match = cookies[0]?.match(/refreshToken=([^;]+)/);
        if (match) rotatedRefreshToken = match[1];
      }

      // Check DB: old token should no longer exist
      const oldTokenInDb = await prisma.refreshToken.findUnique({
        where: { token: refreshTokenA },
      });
      expect(oldTokenInDb).toBeNull();
    });

    it('should reject previously used (rotated) refresh token with 401 Unauthorized', async () => {
      // Re-use old refreshTokenA
      const res = await request(app)
        .post('/api/v1/auth/refresh')
        .set('Cookie', [`refreshToken=${refreshTokenA}`])
        .send({ refreshToken: refreshTokenA });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('should revoke refresh token from DB and clear cookie on POST /auth/logout', async () => {
      const currentToken = rotatedRefreshToken || refreshTokenA;

      const logoutRes = await request(app)
        .post('/api/v1/auth/logout')
        .set('Cookie', [`refreshToken=${currentToken}`])
        .send({ refreshToken: currentToken });

      expect(logoutRes.status).toBe(200);
      expect(logoutRes.body.success).toBe(true);

      // Verify token deleted from database
      const tokenInDb = await prisma.refreshToken.findUnique({
        where: { token: currentToken },
      });
      expect(tokenInDb).toBeNull();

      // Attempting to refresh with the logged-out token should fail with 401
      const refreshRes = await request(app)
        .post('/api/v1/auth/refresh')
        .set('Cookie', [`refreshToken=${currentToken}`])
        .send({ refreshToken: currentToken });

      expect(refreshRes.status).toBe(401);
      expect(refreshRes.body.error.code).toBe('UNAUTHORIZED');
    });
  });

  // =========================================================================
  // 6. SENSITIVE PII MASKING IN SUMMARY RESPONSES
  // =========================================================================
  describe('Sensitive PII Masking in Summary Views', () => {
    it('should return masked bank account in declaration disclosures', async () => {
      // Set up a bank account for user B
      await prisma.bankAccount.upsert({
        where: { applicationId: appBId },
        create: {
          applicationId: appBId,
          holderName: 'Customer B',
          accountNumber: '987654321098',
          ifsc: 'HDFC0001234',
          bankName: 'HDFC Bank',
        },
        update: {
          holderName: 'Customer B',
          accountNumber: '987654321098',
          ifsc: 'HDFC0001234',
          bankName: 'HDFC Bank',
        },
      });

      const res = await request(app)
        .get('/api/v1/declaration/text')
        .set('Authorization', `Bearer ${tokenB}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.disbursementBank).toBeDefined();
      expect(res.body.data.disbursementBank.accountNumberMasked).toBe('XXXX-XXXX-1098');
      expect(res.body.data.disbursementBank.accountNumber).toBeUndefined();
    });

    it('should not expose raw ID numbers or unmasked bank accounts in admin list summary', async () => {
      const res = await request(app)
        .get('/api/v1/admin/applications')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      const list = res.body.data.applications;
      expect(Array.isArray(list)).toBe(true);
      list.forEach((item: any) => {
        expect(item.idNumber).toBeUndefined();
        expect(item.accountNumber).toBeUndefined();
        expect(item.rawId).toBeUndefined();
      });
    });
  });
});
