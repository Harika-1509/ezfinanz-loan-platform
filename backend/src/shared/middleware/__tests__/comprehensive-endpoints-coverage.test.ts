import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../../../app';
import { prisma } from '../../../prisma/client';
import { ApplicationStage, Role } from '@prisma/client';
import { generateAccessToken } from '../../utils/jwt';

describe('Chunk 26: Comprehensive Endpoint & Authorization Coverage Test Suite', () => {
  const app = createApp();

  let customerToken: string;
  let customerUser: any;
  let customerApplication: any;

  let adminToken: string;
  let adminUser: any;

  beforeAll(async () => {
    const ts = Date.now();

    // 1. Create a baseline Customer user and application
    customerUser = await prisma.user.create({
      data: {
        email: `coverage_cust_${ts}@testfinanz.com`,
        passwordHash: '$2a$10$dummyhashedpasswordforcovtest1234567890abcdef',
        role: Role.CUSTOMER,
        emailVerified: true,
        phoneVerified: true,
        phone: `9${Math.floor(100000000 + Math.random() * 900000000)}`,
      },
    });

    customerApplication = await prisma.application.create({
      data: {
        userId: customerUser.id,
        stage: ApplicationStage.SIGNUP_COMPLETED,
      },
    });

    customerToken = generateAccessToken({
      userId: customerUser.id,
      email: customerUser.email!,
      role: Role.CUSTOMER,
    });

    // 2. Create an Admin user
    adminUser = await prisma.user.create({
      data: {
        email: `coverage_admin_${ts}@testfinanz.com`,
        passwordHash: '$2a$10$dummyhashedpasswordforcovtest1234567890abcdef',
        role: Role.ADMIN,
        emailVerified: true,
        phoneVerified: true,
      },
    });

    adminToken = generateAccessToken({
      userId: adminUser.id,
      email: adminUser.email!,
      role: Role.ADMIN,
    });
  });

  // ==========================================================================
  // 1. UNAUTHENTICATED ROUTE PROTECTION (401 Unauthorized)
  // ==========================================================================
  describe('Unauthenticated Route Protection (401 Unauthorized)', () => {
    it('should reject GET /api/v1/auth/me without token', async () => {
      const res = await request(app).get('/api/v1/auth/me');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should reject GET /api/v1/verification/status without token', async () => {
      const res = await request(app).get('/api/v1/verification/status');
      expect(res.status).toBe(401);
    });

    it('should reject POST /api/v1/kyc without token', async () => {
      const res = await request(app).post('/api/v1/kyc').send({});
      expect(res.status).toBe(401);
    });

    it('should reject GET /api/v1/kyc/status without token', async () => {
      const res = await request(app).get('/api/v1/kyc/status');
      expect(res.status).toBe(401);
    });

    it('should reject POST /api/v1/eligibility/check without token', async () => {
      const res = await request(app).post('/api/v1/eligibility/check').send({});
      expect(res.status).toBe(401);
    });

    it('should reject GET /api/v1/loan-terms/options without token', async () => {
      const res = await request(app).get('/api/v1/loan-terms/options');
      expect(res.status).toBe(401);
    });

    it('should reject POST /api/v1/bank-account without token', async () => {
      const res = await request(app).post('/api/v1/bank-account').send({});
      expect(res.status).toBe(401);
    });

    it('should reject POST /api/v1/declaration/accept without token', async () => {
      const res = await request(app).post('/api/v1/declaration/accept').send({});
      expect(res.status).toBe(401);
    });

    it('should reject POST /api/v1/selfie/upload without token', async () => {
      const res = await request(app).post('/api/v1/selfie/upload').send({});
      expect(res.status).toBe(401);
    });

    it('should reject GET /api/v1/admin/applications without token', async () => {
      const res = await request(app).get('/api/v1/admin/applications');
      expect(res.status).toBe(401);
    });

    it('should reject GET /api/v1/admin/stats without token', async () => {
      const res = await request(app).get('/api/v1/admin/stats');
      expect(res.status).toBe(401);
    });
  });

  // ==========================================================================
  // 2. ROLE-BASED ACCESS CONTROL (RBAC) REJECTION (403 Forbidden)
  // ==========================================================================
  describe('RBAC Customer vs Admin Route Guarding (403 Forbidden)', () => {
    it('should reject Customer role on GET /api/v1/admin/applications', async () => {
      const res = await request(app)
        .get('/api/v1/admin/applications')
        .set('Authorization', `Bearer ${customerToken}`);
      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('should reject Customer role on GET /api/v1/admin/stats', async () => {
      const res = await request(app)
        .get('/api/v1/admin/stats')
        .set('Authorization', `Bearer ${customerToken}`);
      expect(res.status).toBe(403);
    });

    it('should reject Customer role on POST /api/v1/admin/applications/:id/selfie/approve', async () => {
      const res = await request(app)
        .post(`/api/v1/admin/applications/${customerApplication.id}/selfie/approve`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({});
      expect(res.status).toBe(403);
    });

    it('should reject Customer role on POST /api/v1/admin/applications/:id/disburse', async () => {
      const res = await request(app)
        .post(`/api/v1/admin/applications/${customerApplication.id}/disburse`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({});
      expect(res.status).toBe(403);
    });
  });

  // ==========================================================================
  // 3. STAGEGUARD LIFECYCLE REJECTION (400/403/404 Out-of-Order Execution)
  // ==========================================================================
  describe('StageGuard Strict Lifecycle Progression Enforcement', () => {
    it('should reject POST /api/v1/eligibility/check when application is at REGISTERED stage', async () => {
      const res = await request(app)
        .post('/api/v1/eligibility/check')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          income: 50000,
          requestedAmount: 100000,
          creditScore: 750,
          existingDebts: 5000,
        });
      expect([400, 403]).toContain(res.status);
      expect(res.body.success).toBe(false);
      expect(res.body.error?.message || res.body.message).toMatch(/stage|KYC/i);
    });

    it('should reject POST /api/v1/loan-terms/confirm when application is at REGISTERED stage', async () => {
      const res = await request(app)
        .post('/api/v1/loan-terms/confirm')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          amount: 100000,
          tenureMonths: 12,
        });
      expect([400, 403]).toContain(res.status);
      expect(res.body.success).toBe(false);
    });

    it('should reject POST /api/v1/bank-account when application is at REGISTERED stage', async () => {
      const res = await request(app)
        .post('/api/v1/bank-account')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          accountNumber: '123456789012',
          confirmAccountNumber: '123456789012',
          ifscCode: 'HDFC0001234',
          bankName: 'HDFC Bank',
          accountHolderName: 'Customer Name',
        });
      expect([400, 403, 404]).toContain(res.status);
      expect(res.body.success).toBe(false);
    });

    it('should reject POST /api/v1/declaration/accept when application is at REGISTERED stage', async () => {
      const res = await request(app)
        .post('/api/v1/declaration/accept')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          accepted: true,
        });
      expect([400, 403]).toContain(res.status);
      expect(res.body.success).toBe(false);
    });

    it('should reject POST /api/v1/selfie/upload when application is at REGISTERED stage', async () => {
      const res = await request(app)
        .post('/api/v1/selfie/upload')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          imageBase64: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        });
      expect([400, 403, 404]).toContain(res.status);
      expect(res.body.success).toBe(false);
    });
  });

  // ==========================================================================
  // 4. VALIDATION ERROR PARITY (422 Unprocessable Entity)
  // ==========================================================================
  describe('Input Validation Error Parity (422 Unprocessable Entity)', () => {
    it('should reject POST /api/v1/auth/signup with invalid email format', async () => {
      const res = await request(app).post('/api/v1/auth/signup').send({
        email: 'invalid-email-address',
        password: 'Password123!',
      });
      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
      expect(res.body.error?.code).toBe('VALIDATION_ERROR');
    });

    it('should reject POST /api/v1/auth/signup with weak password (< 8 chars or no numbers)', async () => {
      const res = await request(app).post('/api/v1/auth/signup').send({
        email: 'valid_email@testfinanz.com',
        password: 'weak',
      });
      expect(res.status).toBe(422);
    });

    it('should reject POST /api/v1/loan-terms/calculate with unsupported tenure (e.g. 15 months)', async () => {
      const res = await request(app)
        .post('/api/v1/loan-terms/calculate')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          amount: 100000,
          tenureMonths: 15,
        });
      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
    });

    it('should reject POST /api/v1/loan-terms/calculate with amount below minimum ₹10,000', async () => {
      const res = await request(app)
        .post('/api/v1/loan-terms/calculate')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          amount: 5000,
          tenureMonths: 12,
        });
      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
    });
  });

  // ==========================================================================
  // 5. ADMIN ENDPOINT RESPONSES & CONTRACT SANITY
  // ==========================================================================
  describe('Admin Endpoint Contract Sanity & 404 Handling', () => {
    it('should return 404 when Admin requests a non-existent application ID', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';
      const res = await request(app)
        .get(`/api/v1/admin/applications/${nonExistentId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('should return 200 and application list for Admin on GET /api/v1/admin/applications', async () => {
      const res = await request(app)
        .get('/api/v1/admin/applications?page=1&limit=10')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.applications)).toBe(true);
      expect(res.body.data.pagination).toBeDefined();
    });

    it('should return 200 and dashboard statistics on GET /api/v1/admin/stats', async () => {
      const res = await request(app)
        .get('/api/v1/admin/stats')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.totalApplications).toBeDefined();
      expect(res.body.data.stageBreakdown).toBeDefined();
    });
  });
});
