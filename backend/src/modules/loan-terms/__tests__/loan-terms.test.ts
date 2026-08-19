import { describe, it, expect, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../../../app';
import { prisma } from '../../../prisma/client';
import { ApplicationStage, EligibilityResult, IdType } from '@prisma/client';

const app = createApp();

describe('Loan Terms Module Integration Tests', () => {
  const timestamp = Date.now();
  const eligibleCustomer = {
    email: `terms_eligible_${timestamp}@testfinanz.com`,
    password: 'StrongPassword@123',
    phone: `9${Math.floor(100000000 + Math.random() * 900000000)}`,
  };

  const declinedCustomer = {
    email: `terms_declined_${timestamp}@testfinanz.com`,
    password: 'StrongPassword@123',
    phone: `9${Math.floor(100000000 + Math.random() * 900000000)}`,
  };

  const preEligibilityCustomer = {
    email: `terms_pre_${timestamp}@testfinanz.com`,
    password: 'StrongPassword@123',
    phone: `9${Math.floor(100000000 + Math.random() * 900000000)}`,
  };

  let eligibleToken: string;
  let eligibleUserId: string;
  let eligibleAppId: string;

  let declinedToken: string;
  let declinedUserId: string;

  let preToken: string;
  let preUserId: string;

  afterAll(async () => {
    const userIds = [eligibleUserId, declinedUserId, preUserId].filter(Boolean);
    if (userIds.length > 0) {
      await prisma.loanTerms.deleteMany({
        where: { application: { userId: { in: userIds } } },
      });
      await prisma.eligibilityCheck.deleteMany({
        where: { application: { userId: { in: userIds } } },
      });
      await prisma.kycDetails.deleteMany({
        where: { application: { userId: { in: userIds } } },
      });
      await prisma.application.deleteMany({ where: { userId: { in: userIds } } });
      await prisma.refreshToken.deleteMany({ where: { userId: { in: userIds } } });
      await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    }
  });

  it('Setup: Create eligible, declined, and pre-eligibility customer applications', async () => {
    // 1. Setup Eligible Customer
    const res1 = await request(app)
      .post('/api/v1/auth/signup')
      .send(eligibleCustomer);
    expect(res1.status).toBe(201);
    eligibleToken = res1.body.data.accessToken;
    eligibleUserId = res1.body.data.user.id;

    await prisma.user.update({
      where: { id: eligibleUserId },
      data: { emailVerified: true, phoneVerified: true },
    });

    const app1 = await prisma.application.findFirst({
      where: { userId: eligibleUserId },
    });
    eligibleAppId = app1!.id;

    await prisma.kycDetails.create({
      data: {
        applicationId: eligibleAppId,
        fullName: 'Rahul Deshmukh',
        dob: new Date('1992-05-20'),
        gender: 'MALE',
        address: '202 Marine Drive, Mumbai 400020',
        idType: IdType.PAN,
        idNumber: 'ABCDE1234F',
      },
    });

    await prisma.eligibilityCheck.create({
      data: {
        applicationId: eligibleAppId,
        income: 100000,
        requestedAmount: 300000,
        creditScore: 780,
        existingDebts: 15000,
        employerName: 'Tata Consultancy Services',
        designation: 'Architect',
        dtiRatio: 15.0,
        result: EligibilityResult.ELIGIBLE,
        maxApprovedAmount: 500000, // Maximum cap ₹5,00,000
      },
    });

    await prisma.application.update({
      where: { id: eligibleAppId },
      data: { stage: ApplicationStage.ELIGIBILITY_CHECKED },
    });

    // 2. Setup Declined Customer
    const res2 = await request(app)
      .post('/api/v1/auth/signup')
      .send(declinedCustomer);
    declinedToken = res2.body.data.accessToken;
    declinedUserId = res2.body.data.user.id;

    await prisma.user.update({
      where: { id: declinedUserId },
      data: { emailVerified: true, phoneVerified: true },
    });

    const app2 = await prisma.application.findFirst({
      where: { userId: declinedUserId },
    });

    await prisma.eligibilityCheck.create({
      data: {
        applicationId: app2!.id,
        income: 20000,
        requestedAmount: 500000,
        creditScore: 520,
        existingDebts: 18000,
        employerName: 'Small Enterprise',
        designation: 'Assistant',
        dtiRatio: 90.0,
        result: EligibilityResult.NOT_ELIGIBLE,
        maxApprovedAmount: 0,
      },
    });

    await prisma.application.update({
      where: { id: app2!.id },
      data: { stage: ApplicationStage.ELIGIBILITY_CHECKED },
    });

    // 3. Setup Pre-Eligibility Customer
    const res3 = await request(app)
      .post('/api/v1/auth/signup')
      .send(preEligibilityCustomer);
    preToken = res3.body.data.accessToken;
    preUserId = res3.body.data.user.id;
  });

  describe('StageGuard & Underwriting Pre-conditions', () => {
    it('should reject loan terms calculation with 403 Forbidden when application is at pre-eligibility stage', async () => {
      const res = await request(app)
        .post('/api/v1/loan-terms/calculate')
        .set('Authorization', `Bearer ${preToken}`)
        .send({
          amount: 100000,
          tenureMonths: 12,
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('should reject loan terms calculation with 403 Forbidden when customer evaluation is NOT_ELIGIBLE', async () => {
      const res = await request(app)
        .post('/api/v1/loan-terms/calculate')
        .set('Authorization', `Bearer ${declinedToken}`)
        .send({
          amount: 100000,
          tenureMonths: 12,
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('NOT_ELIGIBLE');
    });
  });

  describe('Validation & Cap Enforcement', () => {
    it('should reject invalid tenure options (e.g. 15 months) with 422 Validation Error', async () => {
      const res = await request(app)
        .post('/api/v1/loan-terms/calculate')
        .set('Authorization', `Bearer ${eligibleToken}`)
        .send({
          amount: 200000,
          tenureMonths: 15, // Invalid tenure
        });

      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
      expect(JSON.stringify(res.body)).toContain('Supported tenure options');
    });

    it('should reject requested amount exceeding maximum sanctioned limit with 400 Bad Request', async () => {
      const res = await request(app)
        .post('/api/v1/loan-terms/calculate')
        .set('Authorization', `Bearer ${eligibleToken}`)
        .send({
          amount: 800000, // Exceeds approved ₹5,00,000
          tenureMonths: 24,
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('exceeds the maximum approved limit');
    });
  });

  describe('Idempotent Calculation on POST /api/v1/loan-terms/calculate', () => {
    it('should calculate loan terms and save draft without advancing application stage', async () => {
      const res = await request(app)
        .post('/api/v1/loan-terms/calculate')
        .set('Authorization', `Bearer ${eligibleToken}`)
        .send({
          amount: 250000,
          tenureMonths: 12,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Number(res.body.data.loanTerms.amount)).toBe(250000);
      expect(res.body.data.loanTerms.tenureMonths).toBe(12);
      expect(res.body.data.breakdown.emi).toBeGreaterThan(0);
      expect(res.body.data.breakdown.netDisbursement).toBeLessThan(250000);
      expect(res.body.data.breakdown.irr).toBeGreaterThan(13.0);

      // Verify stage did NOT advance yet
      const appRecord = await prisma.application.findUnique({
        where: { id: eligibleAppId },
      });
      expect(appRecord?.stage).toBe(ApplicationStage.ELIGIBILITY_CHECKED);
    });

    it('should allow recalculating with different tenure idempotently', async () => {
      const res = await request(app)
        .post('/api/v1/loan-terms/calculate')
        .set('Authorization', `Bearer ${eligibleToken}`)
        .send({
          amount: 300000,
          tenureMonths: 24,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Number(res.body.data.loanTerms.amount)).toBe(300000);
      expect(res.body.data.loanTerms.tenureMonths).toBe(24);
    });
  });

  describe('Explicit Confirmation on POST /api/v1/loan-terms/confirm', () => {
    it('should confirm loan terms and advance application stage to EMI_SELECTED', async () => {
      const res = await request(app)
        .post('/api/v1/loan-terms/confirm')
        .set('Authorization', `Bearer ${eligibleToken}`)
        .send({
          amount: 300000,
          tenureMonths: 24,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.application.stage).toBe(ApplicationStage.EMI_SELECTED);

      // Verify in DB
      const dbTerms = await prisma.loanTerms.findUnique({
        where: { applicationId: eligibleAppId },
      });
      expect(dbTerms).toBeDefined();
      expect(Number(dbTerms?.amount)).toBe(300000);
      expect(dbTerms?.tenureMonths).toBe(24);
    });

    it('GET /api/v1/loan-terms/options should return available tenures and borrowing ceiling', async () => {
      const res = await request(app)
        .get('/api/v1/loan-terms/options')
        .set('Authorization', `Bearer ${eligibleToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.allowedTenures).toEqual([6, 12, 18, 24, 36]);
      expect(res.body.data.maxApprovedAmount).toBe(500000);
      expect(res.body.data.currentTerms).toBeDefined();
    });

    it('GET /api/v1/loan-terms/status should return confirmed loan terms', async () => {
      const res = await request(app)
        .get('/api/v1/loan-terms/status')
        .set('Authorization', `Bearer ${eligibleToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.loanTerms).toBeDefined();
      expect(Number(res.body.data.loanTerms.amount)).toBe(300000);
      expect(res.body.data.application.stage).toBe(ApplicationStage.EMI_SELECTED);
    });
  });
});
