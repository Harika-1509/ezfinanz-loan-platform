import { describe, it, expect, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../../../app';
import { prisma } from '../../../prisma/client';
import {
  ApplicationStage,
  AdminReviewStatus,
  EligibilityResult,
  IdType,
} from '@prisma/client';

const app = createApp();

describe('Selfie Module Integration Tests', () => {
  const timestamp = Date.now();
  const readyCustomer = {
    email: `selfie_ready_${timestamp}@testfinanz.com`,
    password: 'StrongPassword@123',
    phone: `9${Math.floor(100000000 + Math.random() * 900000000)}`,
  };

  const preDeclCustomer = {
    email: `selfie_pre_${timestamp}@testfinanz.com`,
    password: 'StrongPassword@123',
    phone: `9${Math.floor(100000000 + Math.random() * 900000000)}`,
  };

  const base64Customer = {
    email: `selfie_b64_${timestamp}@testfinanz.com`,
    password: 'StrongPassword@123',
    phone: `9${Math.floor(100000000 + Math.random() * 900000000)}`,
  };

  let readyToken: string;
  let readyUserId: string;
  let readyAppId: string;

  let preToken: string;
  let preUserId: string;

  let base64Token: string;
  let base64UserId: string;

  // 1x1 transparent PNG base64
  const samplePngBase64 =
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

  afterAll(async () => {
    const userIds = [readyUserId, preUserId, base64UserId].filter(Boolean);
    if (userIds.length > 0) {
      await prisma.selfie.deleteMany({
        where: { application: { userId: { in: userIds } } },
      });
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

  it('Setup: Create customer at DECLARATION_CONFIRMED stage, BANK_ADDED stage, and another for base64', async () => {
    // 1. Ready Customer (Reached DECLARATION_CONFIRMED)
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
        fullName: 'Karan Kapoor',
        dob: new Date('1991-03-25'),
        gender: 'MALE',
        address: '501 Juhu Tara Road, Mumbai 400049',
        idType: IdType.PAN,
        idNumber: 'ABCDE9012H',
      },
    });

    await prisma.eligibilityCheck.create({
      data: {
        applicationId: readyAppId,
        income: 180000,
        requestedAmount: 400000,
        creditScore: 790,
        existingDebts: 25000,
        employerName: 'Amazon Development Centre',
        designation: 'Senior SDE',
        dtiRatio: 13.88,
        result: EligibilityResult.ELIGIBLE,
        maxApprovedAmount: 800000,
      },
    });

    await prisma.loanTerms.create({
      data: {
        applicationId: readyAppId,
        amount: 400000,
        tenureMonths: 18,
        interestRate: 13.5,
        processingFee: 10000,
        gst: 1800,
        otherCharges: 500,
        emi: 24653.25,
        totalInterest: 43758.5,
        totalRepayment: 443758.5,
        totalCharges: 12300,
        netDisbursement: 387700,
        irr: 17.65,
      },
    });

    await prisma.bankAccount.create({
      data: {
        applicationId: readyAppId,
        holderName: 'Karan Kapoor',
        accountNumber: '11223344556677',
        ifsc: 'ICIC0000104',
        bankName: 'ICICI Bank',
      },
    });

    await prisma.declaration.create({
      data: {
        applicationId: readyAppId,
        acceptedAt: new Date(),
        termsVersion: 'v1.0',
        ipAddress: '127.0.0.1',
      },
    });

    await prisma.application.update({
      where: { id: readyAppId },
      data: { stage: ApplicationStage.DECLARATION_CONFIRMED },
    });

    // 2. Pre-Declaration Customer (At BANK_ADDED)
    const res2 = await request(app)
      .post('/api/v1/auth/signup')
      .send(preDeclCustomer);
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
      data: { stage: ApplicationStage.BANK_ADDED },
    });

    // 3. Base64 Customer
    const res3 = await request(app)
      .post('/api/v1/auth/signup')
      .send(base64Customer);
    base64Token = res3.body.data.accessToken;
    base64UserId = res3.body.data.user.id;

    await prisma.user.update({
      where: { id: base64UserId },
      data: { emailVerified: true, phoneVerified: true },
    });

    const app3 = await prisma.application.findFirst({
      where: { userId: base64UserId },
    });

    await prisma.declaration.create({
      data: {
        applicationId: app3!.id,
        acceptedAt: new Date(),
        termsVersion: 'v1.0',
      },
    });

    await prisma.application.update({
      where: { id: app3!.id },
      data: { stage: ApplicationStage.DECLARATION_CONFIRMED },
    });
  });

  describe('StageGuard & Prerequisites', () => {
    it('should reject selfie submission with 400 when application is at pre-DECLARATION_CONFIRMED stage', async () => {
      const res = await request(app)
        .post('/api/v1/selfie/submit')
        .set('Authorization', `Bearer ${preToken}`)
        .attach('selfie', Buffer.from('fake image content'), 'photo.jpg');

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Invalid application state');
    });
  });

  describe('Input Validation & Format Enforcement', () => {
    it('should reject non-image file uploads (e.g. PDF document) with 400 Bad Request', async () => {
      const res = await request(app)
        .post('/api/v1/selfie/submit')
        .set('Authorization', `Bearer ${readyToken}`)
        .attach(
          'selfie',
          Buffer.from('%PDF-1.4 fake pdf content'),
          'document.pdf'
        );

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Only JPEG, PNG, and WEBP');
    });

    it('should reject empty submission when neither file nor base64 is provided', async () => {
      const res = await request(app)
        .post('/api/v1/selfie/submit')
        .set('Authorization', `Bearer ${readyToken}`)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Selfie photo is required');
    });
  });

  describe('Successful Multipart Upload & Stage Advancement', () => {
    it('should successfully upload selfie via multipart form-data and advance stage to WAITING_ADMIN_REVIEW', async () => {
      const imageBuffer = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        'base64'
      );

      const res = await request(app)
        .post('/api/v1/selfie/submit')
        .set('Authorization', `Bearer ${readyToken}`)
        .attach('selfie', imageBuffer, {
          filename: 'karan_selfie.png',
          contentType: 'image/png',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.selfie).toBeDefined();
      expect(res.body.data.selfie.adminStatus).toBe(AdminReviewStatus.PENDING);
      expect(res.body.data.selfie.photoUrl).toContain('/uploads/selfies/');
      expect(res.body.data.application.stage).toBe(
        ApplicationStage.WAITING_ADMIN_REVIEW
      );

      // Verify in DB
      const appInDb = await prisma.application.findUnique({
        where: { id: readyAppId },
      });
      expect(appInDb?.stage).toBe(ApplicationStage.WAITING_ADMIN_REVIEW);

      const selfieInDb = await prisma.selfie.findUnique({
        where: { applicationId: readyAppId },
      });
      expect(selfieInDb).toBeDefined();
      expect(selfieInDb?.adminStatus).toBe(AdminReviewStatus.PENDING);
    });

    it('GET /api/v1/selfie/status should return active selfie submission', async () => {
      const res = await request(app)
        .get('/api/v1/selfie/status')
        .set('Authorization', `Bearer ${readyToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.selfie).toBeDefined();
      expect(res.body.data.selfie.adminStatus).toBe(AdminReviewStatus.PENDING);
      expect(res.body.data.application.stage).toBe(
        ApplicationStage.WAITING_ADMIN_REVIEW
      );
    });
  });

  describe('Successful Base64 Payload Submission', () => {
    it('should successfully submit selfie via Base64 data URL and advance stage to WAITING_ADMIN_REVIEW', async () => {
      const res = await request(app)
        .post('/api/v1/selfie/submit')
        .set('Authorization', `Bearer ${base64Token}`)
        .send({
          imageBase64: samplePngBase64,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.selfie).toBeDefined();
      expect(res.body.data.selfie.adminStatus).toBe(AdminReviewStatus.PENDING);
      expect(res.body.data.selfie.photoUrl).toContain('/uploads/selfies/');
      expect(res.body.data.application.stage).toBe(
        ApplicationStage.WAITING_ADMIN_REVIEW
      );
    });
  });
});
