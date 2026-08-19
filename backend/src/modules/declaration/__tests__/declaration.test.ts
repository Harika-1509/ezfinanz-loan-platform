import { describe, it, expect, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../../../app';
import { prisma } from '../../../prisma/client';
import { ApplicationStage, EligibilityResult, IdType } from '@prisma/client';

const app = createApp();

describe('Declaration Module Integration Tests', () => {
  const timestamp = Date.now();
  const readyCustomer = {
    email: `decl_ready_${timestamp}@testfinanz.com`,
    password: 'StrongPassword@123',
    phone: `9${Math.floor(100000000 + Math.random() * 900000000)}`,
  };

  const preBankCustomer = {
    email: `decl_pre_${timestamp}@testfinanz.com`,
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

  it('Setup: Create customer at BANK_ADDED stage and customer at EMI_SELECTED stage', async () => {
    // 1. Ready Customer (Reached BANK_ADDED)
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
        fullName: 'Ananya Sharma',
        dob: new Date('1994-08-10'),
        gender: 'FEMALE',
        address: '101 Bandra West, Mumbai 400050',
        idType: IdType.PAN,
        idNumber: 'ABCDE5678G',
      },
    });

    await prisma.eligibilityCheck.create({
      data: {
        applicationId: readyAppId,
        income: 150000,
        requestedAmount: 500000,
        creditScore: 820,
        existingDebts: 20000,
        employerName: 'Google India',
        designation: 'Staff Software Engineer',
        dtiRatio: 13.33,
        result: EligibilityResult.ELIGIBLE,
        maxApprovedAmount: 1000000,
      },
    });

    await prisma.loanTerms.create({
      data: {
        applicationId: readyAppId,
        amount: 500000,
        tenureMonths: 12,
        interestRate: 13.0,
        processingFee: 10000,
        gst: 1800,
        otherCharges: 500,
        emi: 44658.85,
        totalInterest: 35906.2,
        totalRepayment: 535906.2,
        totalCharges: 12300,
        netDisbursement: 487700,
        irr: 17.85,
      },
    });

    await prisma.bankAccount.create({
      data: {
        applicationId: readyAppId,
        holderName: 'Ananya Sharma',
        accountNumber: '50100234567890',
        ifsc: 'HDFC0000128',
        bankName: 'HDFC Bank',
      },
    });

    await prisma.application.update({
      where: { id: readyAppId },
      data: { stage: ApplicationStage.BANK_ADDED },
    });

    // 2. Pre-Bank Customer (At EMI_SELECTED)
    const res2 = await request(app)
      .post('/api/v1/auth/signup')
      .send(preBankCustomer);
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
      data: { stage: ApplicationStage.EMI_SELECTED },
    });
  });

  describe('StageGuard & Prerequisites', () => {
    it('should reject declaration acceptance with 400 when application is at pre-BANK_ADDED stage', async () => {
      const res = await request(app)
        .post('/api/v1/declaration/accept')
        .set('Authorization', `Bearer ${preToken}`)
        .send({
          accepted: true,
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Invalid application state');
    });
  });

  describe('Declaration Text & Validation Rules', () => {
    it('GET /api/v1/declaration/text should return legal clauses and populated borrower details', async () => {
      const res = await request(app)
        .get('/api/v1/declaration/text')
        .set('Authorization', `Bearer ${readyToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.applicantName).toBe('Ananya Sharma');
      expect(res.body.data.termsVersion).toBe('v1.0');
      expect(res.body.data.loanSummary.sanctionedAmount).toBe(500000);
      expect(res.body.data.disbursementBank.bankName).toBe('HDFC Bank');
      expect(res.body.data.clauses.length).toBeGreaterThan(0);
      expect(res.body.data.fullLegalText).toContain('EZFINANZ PERSONAL LOAN DECLARATION');
    });

    it('should reject missing or non-true declaration acceptance with 422 Validation Error', async () => {
      const res = await request(app)
        .post('/api/v1/declaration/accept')
        .set('Authorization', `Bearer ${readyToken}`)
        .send({
          accepted: false, // Invalid
        });

      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
      expect(JSON.stringify(res.body)).toContain('You must explicitly accept');
    });
  });

  describe('Successful Acceptance & Stage Progression', () => {
    it('should successfully accept declaration with timestamp and advance stage to DECLARATION_CONFIRMED', async () => {
      const res = await request(app)
        .post('/api/v1/declaration/accept')
        .set('Authorization', `Bearer ${readyToken}`)
        .send({
          accepted: true,
          termsVersion: 'v1.0',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.declaration).toBeDefined();
      expect(res.body.data.declaration.termsVersion).toBe('v1.0');
      expect(res.body.data.declaration.acceptedAt).toBeDefined();
      expect(res.body.data.application.stage).toBe(
        ApplicationStage.DECLARATION_CONFIRMED
      );

      // Verify in DB
      const appInDb = await prisma.application.findUnique({
        where: { id: readyAppId },
      });
      expect(appInDb?.stage).toBe(ApplicationStage.DECLARATION_CONFIRMED);

      const declInDb = await prisma.declaration.findUnique({
        where: { applicationId: readyAppId },
      });
      expect(declInDb).toBeDefined();
      expect(declInDb?.termsVersion).toBe('v1.0');
    });

    it('GET /api/v1/declaration/status should return confirmed declaration details', async () => {
      const res = await request(app)
        .get('/api/v1/declaration/status')
        .set('Authorization', `Bearer ${readyToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.declaration).toBeDefined();
      expect(res.body.data.declaration.termsVersion).toBe('v1.0');
      expect(res.body.data.application.stage).toBe(
        ApplicationStage.DECLARATION_CONFIRMED
      );
    });
  });
});
