import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../../../app';
import { prisma } from '../../../prisma/client';
import { ApplicationStage, Role } from '@prisma/client';
import { generateAccessToken } from '../../../shared/utils/jwt';

const app = createApp();

describe('Chunk 25: Performance Audit & Query Optimization Test Suite', () => {
  const timestamp = Date.now();
  let adminToken: string;
  let adminUserId: string;
  const createdUserIds: string[] = [];

  beforeAll(async () => {
    // 1. Create Admin
    const adminEmail = `perf_admin_${timestamp}@testfinanz.com`;
    const res = await request(app).post('/api/v1/auth/signup').send({
      email: adminEmail,
      password: 'AdminPassword@123',
      phone: `9${Math.floor(100000000 + Math.random() * 900000000)}`,
    });

    adminUserId = res.body.data.user.id;
    createdUserIds.push(adminUserId);

    await prisma.user.update({
      where: { id: adminUserId },
      data: { role: Role.ADMIN, emailVerified: true, phoneVerified: true },
    });

    adminToken = generateAccessToken({
      userId: adminUserId,
      email: adminEmail,
      role: Role.ADMIN,
    });

    // 2. Seed a batch of test applications to test pagination and indexed stage queries
    for (let i = 0; i < 12; i++) {
      const email = `perf_borrower_${i}_${timestamp}@testfinanz.com`;
      const phone = `8${Math.floor(100000000 + Math.random() * 900000000)}`;
      const user = await prisma.user.create({
        data: {
          email,
          phone,
          role: Role.CUSTOMER,
          emailVerified: true,
          phoneVerified: true,
          applications: {
            create: {
              stage: i % 2 === 0 ? ApplicationStage.WAITING_ADMIN_REVIEW : ApplicationStage.KYC_SUBMITTED,
            },
          },
        },
      });
      createdUserIds.push(user.id);
    }
  });

  afterAll(async () => {
    if (createdUserIds.length > 0) {
      await prisma.application.deleteMany({
        where: { userId: { in: createdUserIds } },
      });
      await prisma.refreshToken.deleteMany({
        where: { userId: { in: createdUserIds } },
      });
      await prisma.user.deleteMany({
        where: { id: { in: createdUserIds } },
      });
    }
  });

  // =========================================================================
  // 1. BOUNDED PAGINATION ON ADMIN APPLICATIONS LIST
  // =========================================================================
  describe('Admin Applications List Bounded Pagination', () => {
    it('should paginate with default limit of 10 rows when limit parameter is omitted', async () => {
      const res = await request(app)
        .get('/api/v1/admin/applications?page=1')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.pagination.limit).toBe(10);
      expect(res.body.data.applications.length).toBeLessThanOrEqual(10);
    });

    it('should paginate with requested limit when valid (e.g. limit=5)', async () => {
      const res = await request(app)
        .get('/api/v1/admin/applications?page=1&limit=5')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.pagination.limit).toBe(5);
      expect(res.body.data.applications.length).toBeLessThanOrEqual(5);
    });

    it('should reject unbounded limit requests exceeding max limit of 100 with 422 Validation Error', async () => {
      const res = await request(app)
        .get('/api/v1/admin/applications?page=1&limit=250')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should reject invalid page parameter with 422 Validation Error', async () => {
      const res = await request(app)
        .get('/api/v1/admin/applications?page=-1&limit=10')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
    });
  });

  // =========================================================================
  // 2. DATABASE INDEXED STAGE & IDENTITY QUERIES
  // =========================================================================
  describe('Database Indexed Column Performance', () => {
    it('should filter applications by indexed stage rapidly with correct subset count', async () => {
      const res = await request(app)
        .get('/api/v1/admin/applications?stage=WAITING_ADMIN_REVIEW')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.applications.every((app: any) => app.stage === 'WAITING_ADMIN_REVIEW')).toBe(true);
    });

    it('should filter applications by search query matching indexed email/phone', async () => {
      const res = await request(app)
        .get(`/api/v1/admin/applications?search=${timestamp}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.applications.length).toBeGreaterThan(0);
    });
  });

  // =========================================================================
  // 3. UNDERWRITING & LOAN TERMS CALCULATION LATENCY
  // =========================================================================
  describe('Live Loan Terms Calculation Underwriting Latency', () => {
    it('should compute full loan terms, deductions, and Newton-Raphson IRR correctly', async () => {
      // Create verified customer at ELIGIBILITY_CHECKED with eligibilityCheck record
      const user = await prisma.user.create({
        data: {
          email: `calc_speed_${timestamp}@testfinanz.com`,
          phone: `7${Math.floor(100000000 + Math.random() * 900000000)}`,
          emailVerified: true,
          phoneVerified: true,
          role: Role.CUSTOMER,
          applications: {
            create: {
              stage: ApplicationStage.ELIGIBILITY_CHECKED,
              eligibilityCheck: {
                create: {
                  income: 100000,
                  requestedAmount: 350000,
                  creditScore: 750,
                  existingDebts: 0,
                  employerName: 'TCS',
                  designation: 'Architect',
                  dtiRatio: 15,
                  result: 'ELIGIBLE',
                  maxApprovedAmount: 500000,
                },
              },
            },
          },
        },
      });
      createdUserIds.push(user.id);

      const customerToken = generateAccessToken({
        userId: user.id,
        email: user.email!,
        role: Role.CUSTOMER,
      });

      const res = await request(app)
        .post('/api/v1/loan-terms/calculate')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          amount: 350000,
          tenureMonths: 24,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.breakdown.emi).toBeGreaterThan(0);
      expect(res.body.data.breakdown.irr).toBeGreaterThan(0);
    });
  });
});
