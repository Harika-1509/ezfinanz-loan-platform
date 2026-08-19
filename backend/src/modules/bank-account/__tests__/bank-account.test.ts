import { describe, it, expect, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../../../app';
import { prisma } from '../../../prisma/client';
import { ApplicationStage, EligibilityResult, IdType } from '@prisma/client';

const app = createApp();

describe('Bank Account Module Integration Tests', () => {
  const timestamp = Date.now();
  const readyCustomer = {
    email: `bank_ready_${timestamp}@testfinanz.com`,
    password: 'StrongPassword@123',
    phone: `9${Math.floor(100000000 + Math.random() * 900000000)}`,
  };

  const preEmiCustomer = {
    email: `bank_pre_${timestamp}@testfinanz.com`,
    password: 'StrongPassword@123',
    phone: `9${Math.floor(100000000 + Math.random() * 900000000)}`,
  };

  let readyToken: string;
  let readyUserId: string;
  let readyAppId: string;

  let preToken: string;
  let preUserId: string;

  afterAll(async () => {
    const userIds = [readyUserId, preUserId].filter(Boolean);
    if (userIds.length > 0) {
      await prisma.declaration.deleteMany({
        where: { application: { userId: { in: userIds } } },
      });
      await prisma.bankAccount.deleteMany({
        where: { application: { userId: { in: userIds } } },
      });
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

  it('Setup: Create customer at EMI_SELECTED stage and customer at KYC_SUBMITTED stage', async () => {
    // 1. Ready Customer (Reached EMI_SELECTED)
    const res1 = await request(app)
      .post('/api/v1/auth/signup')
      .send(readyCustomer);
    expect(res1.status).toBe(201);
    readyToken = res1.body.data.accessToken;
    readyUserId = res1.body.data.user.id;

    await prisma.user.update({
      where: { id: readyUserId },
      data: { emailVerified: true, phoneVerified: true },
    });

    const app1 = await prisma.application.findFirst({
      where: { userId: readyUserId },
    });
    readyAppId = app1!.id;

    await prisma.kycDetails.create({
      data: {
        applicationId: readyAppId,
        fullName: 'Vikram Malhotra',
        dob: new Date('1990-01-15'),
        gender: 'MALE',
        address: '404 MG Road, Bengaluru 560001',
        idType: IdType.PAN,
        idNumber: 'ABCDE1234F',
      },
    });

    await prisma.eligibilityCheck.create({
      data: {
        applicationId: readyAppId,
        income: 120000,
        requestedAmount: 300000,
        creditScore: 800,
        existingDebts: 10000,
        employerName: 'Infosys Limited',
        designation: 'Principal Engineer',
        dtiRatio: 8.33,
        result: EligibilityResult.ELIGIBLE,
        maxApprovedAmount: 600000,
      },
    });

    await prisma.loanTerms.create({
      data: {
        applicationId: readyAppId,
        amount: 300000,
        tenureMonths: 24,
        interestRate: 14.0,
        processingFee: 7500,
        gst: 1350,
        otherCharges: 750,
        emi: 14403.86,
        totalInterest: 45692.64,
        totalRepayment: 345692.64,
        totalCharges: 9600,
        netDisbursement: 290400,
        irr: 18.25,
      },
    });

    await prisma.application.update({
      where: { id: readyAppId },
      data: { stage: ApplicationStage.EMI_SELECTED },
    });

    // 2. Pre-EMI Customer (At KYC_SUBMITTED)
    const res2 = await request(app)
      .post('/api/v1/auth/signup')
      .send(preEmiCustomer);
    preToken = res2.body.data.accessToken;
    preUserId = res2.body.data.user.id;

    await prisma.user.update({
      where: { id: preUserId },
      data: { emailVerified: true, phoneVerified: true },
    });

    const app2 = await prisma.application.findFirst({
      where: { userId: preUserId },
    });

    await prisma.application.update({
      where: { id: app2!.id },
      data: { stage: ApplicationStage.KYC_SUBMITTED },
    });
  });

  describe('StageGuard & Prerequisites', () => {
    it('should reject bank account submission with 400/403 when application is not at EMI_SELECTED stage', async () => {
      const res = await request(app)
        .post('/api/v1/bank-account/submit')
        .set('Authorization', `Bearer ${preToken}`)
        .send({
          holderName: 'Vikram Malhotra',
          accountNumber: '123456789012',
          ifsc: 'HDFC0001234',
          bankName: 'HDFC Bank',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Invalid application state');
    });
  });

  describe('Validation Rules on POST /api/v1/bank-account/submit', () => {
    it('should reject invalid IFSC code format with 422 Validation Error', async () => {
      const res = await request(app)
        .post('/api/v1/bank-account/submit')
        .set('Authorization', `Bearer ${readyToken}`)
        .send({
          holderName: 'Vikram Malhotra',
          accountNumber: '123456789012',
          ifsc: 'INVALID123', // Invalid IFSC
          bankName: 'HDFC Bank',
        });

      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
      expect(JSON.stringify(res.body)).toContain('Invalid IFSC code format');
    });

    it('should reject invalid account number with 422 Validation Error', async () => {
      const res = await request(app)
        .post('/api/v1/bank-account/submit')
        .set('Authorization', `Bearer ${readyToken}`)
        .send({
          holderName: 'Vikram Malhotra',
          accountNumber: '12345', // Too short (< 9 digits)
          ifsc: 'SBIN0001234',
          bankName: 'State Bank of India',
        });

      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
      expect(JSON.stringify(res.body)).toContain('Invalid bank account number');
    });
  });

  describe('Successful Submission & Stage Progression', () => {
    it('should successfully submit valid bank account and advance stage to BANK_ADDED', async () => {
      const res = await request(app)
        .post('/api/v1/bank-account/submit')
        .set('Authorization', `Bearer ${readyToken}`)
        .send({
          holderName: 'Vikram Malhotra',
          accountNumber: '98765432101234',
          ifsc: 'HDFC0001234',
          bankName: 'HDFC Bank',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.bankAccount.holderName).toBe('Vikram Malhotra');
      expect(res.body.data.bankAccount.accountNumber).toBe('98765432101234');
      expect(res.body.data.bankAccount.ifsc).toBe('HDFC0001234');
      expect(res.body.data.bankAccount.bankName).toBe('HDFC Bank');
      expect(res.body.data.application.stage).toBe(ApplicationStage.BANK_ADDED);

      // Verify in DB
      const appInDb = await prisma.application.findUnique({
        where: { id: readyAppId },
      });
      expect(appInDb?.stage).toBe(ApplicationStage.BANK_ADDED);
    });

    it('GET /api/v1/bank-account/status should return linked bank account details', async () => {
      const res = await request(app)
        .get('/api/v1/bank-account/status')
        .set('Authorization', `Bearer ${readyToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.bankAccount).toBeDefined();
      expect(res.body.data.bankAccount.accountNumber).toBe('98765432101234');
      expect(res.body.data.application.stage).toBe(ApplicationStage.BANK_ADDED);
    });
  });
});
