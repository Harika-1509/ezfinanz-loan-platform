import { describe, it, expect, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../../../app';
import { prisma } from '../../../prisma/client';
import { ApplicationStage, EligibilityResult, IdType } from '@prisma/client';

const app = createApp();

describe('Eligibility Module Integration Tests', () => {
  const timestamp = Date.now();
  const kycCustomer = {
    email: `elig_cust_${timestamp}@testfinanz.com`,
    password: 'StrongPassword@123',
    phone: `9${Math.floor(100000000 + Math.random() * 900000000)}`,
  };

  const preKycCustomer = {
    email: `prekyc_cust_${timestamp}@testfinanz.com`,
    password: 'StrongPassword@123',
    phone: `9${Math.floor(100000000 + Math.random() * 900000000)}`,
  };

  let kycToken: string;
  let kycUserId: string;
  let preKycToken: string;
  let preKycUserId: string;
  let applicationId: string;

  afterAll(async () => {
    const userIds = [kycUserId, preKycUserId].filter(Boolean);
    if (userIds.length > 0) {
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

  it('Setup: Create customers with KYC submitted and Pre-KYC stages', async () => {
    // 1. Setup KYC-submitted customer
    const kycRes = await request(app)
      .post('/api/v1/auth/signup')
      .send(kycCustomer);

    expect(kycRes.status).toBe(201);
    kycToken = kycRes.body.data.accessToken;
    kycUserId = kycRes.body.data.user.id;

    // Mark email and phone verified
    await prisma.user.update({
      where: { id: kycUserId },
      data: { emailVerified: true, phoneVerified: true },
    });

    const appRecord = await prisma.application.findFirst({
      where: { userId: kycUserId },
    });
    applicationId = appRecord!.id;

    // Create KYC record & advance application stage to KYC_SUBMITTED
    await prisma.kycDetails.create({
      data: {
        applicationId,
        fullName: 'Vikram Mehta',
        dob: new Date('1994-06-15'),
        gender: 'MALE',
        address: '102 Indiranagar, Bengaluru 560038',
        idType: IdType.PAN,
        idNumber: 'ABCDE1234F',
      },
    });

    await prisma.application.update({
      where: { id: applicationId },
      data: { stage: ApplicationStage.KYC_SUBMITTED },
    });

    // 2. Setup Pre-KYC customer
    const preKycRes = await request(app)
      .post('/api/v1/auth/signup')
      .send(preKycCustomer);

    expect(preKycRes.status).toBe(201);
    preKycToken = preKycRes.body.data.accessToken;
    preKycUserId = preKycRes.body.data.user.id;
  });

  describe('StageGuard Enforcement on POST /api/v1/eligibility/check', () => {
    it('should reject eligibility check with 403 Forbidden when KYC is not yet submitted', async () => {
      const res = await request(app)
        .post('/api/v1/eligibility/check')
        .set('Authorization', `Bearer ${preKycToken}`)
        .send({
          income: 75000,
          requestedAmount: 250000,
          existingDebts: 10000,
          employerName: 'Infosys Ltd',
          designation: 'Software Engineer',
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(JSON.stringify(res.body)).toMatch(/(Stage transition rejected|verification required)/i);
    });
  });

  describe('Input Validation on POST /api/v1/eligibility/check', () => {
    it('should reject missing required fields with 422 Validation Error', async () => {
      const res = await request(app)
        .post('/api/v1/eligibility/check')
        .set('Authorization', `Bearer ${kycToken}`)
        .send({
          income: 50000,
          // missing requestedAmount, employerName, designation
        });

      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
      expect(JSON.stringify(res.body)).toContain('required');
    });

    it('should reject invalid credit score boundary (< 300 or > 900) with 422 Validation Error', async () => {
      const res = await request(app)
        .post('/api/v1/eligibility/check')
        .set('Authorization', `Bearer ${kycToken}`)
        .send({
          income: 60000,
          requestedAmount: 200000,
          creditScore: 1050, // Invalid CIBIL score
          existingDebts: 5000,
          employerName: 'TCS Ltd',
          designation: 'Tech Lead',
        });

      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
      expect(JSON.stringify(res.body)).toContain('cannot exceed 900');
    });
  });

  describe('Successful Eligibility Evaluation & Lifecycle Progression', () => {
    it('should evaluate eligibility, persist check to database, and advance stage to ELIGIBILITY_CHECKED', async () => {
      const res = await request(app)
        .post('/api/v1/eligibility/check')
        .set('Authorization', `Bearer ${kycToken}`)
        .send({
          income: 80000,
          requestedAmount: 300000,
          creditScore: 780,
          existingDebts: 15000, // DTI = 18.75%
          employerName: 'Google India',
          designation: 'Senior Product Specialist',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.calculation.result).toBe(EligibilityResult.ELIGIBLE);
      expect(res.body.data.calculation.creditScoreBand).toBe('EXCELLENT');
      expect(res.body.data.calculation.dtiRatio).toBe(18.75);
      expect(res.body.data.calculation.maxApprovedAmount).toBeGreaterThanOrEqual(300000);
      expect(res.body.data.application.stage).toBe(ApplicationStage.ELIGIBILITY_CHECKED);

      // Verify in DB
      const dbCheck = await prisma.eligibilityCheck.findUnique({
        where: { applicationId },
      });
      expect(dbCheck).toBeDefined();
      expect(dbCheck?.creditScore).toBe(780);
      expect(dbCheck?.result).toBe(EligibilityResult.ELIGIBLE);
      expect(dbCheck?.employerName).toBe('Google India');
    });

    it('GET /api/v1/eligibility/status should return active eligibility assessment', async () => {
      const res = await request(app)
        .get('/api/v1/eligibility/status')
        .set('Authorization', `Bearer ${kycToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.eligibilityCheck).toBeDefined();
      expect(res.body.data.eligibilityCheck.result).toBe(EligibilityResult.ELIGIBLE);
      expect(res.body.data.application.stage).toBe(ApplicationStage.ELIGIBILITY_CHECKED);
    });
  });
});
