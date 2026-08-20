import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import {
  ApplicationStage,
  AdminReviewStatus,
  EligibilityResult,
  IdType,
  Role,
  OtpPurpose,
} from '@prisma/client';
import createApp from '../../../app';
import { prisma } from '../../../prisma/client';
import { generateAccessToken } from '../../../shared/utils/jwt';
import { otpService } from '../../../shared/services/otp.service';

const app = createApp();

describe('Admin Actions Integration Tests (Selfie Approval & Disbursement)', () => {
  const timestamp = Date.now();

  let adminToken: string;
  let adminUserId: string;
  let customerToken: string;
  let customerUserId: string;

  let happyAppId: string;
  let rejectAppId: string;

  const e2eUserIds: string[] = [];

  beforeAll(async () => {
    // 1. Admin User
    const adminUser = await prisma.user.create({
      data: {
        email: `admin_actions_${timestamp}@ezfinanz.com`,
        role: Role.ADMIN,
        emailVerified: true,
        phoneVerified: true,
      },
    });
    adminUserId = adminUser.id;
    adminToken = generateAccessToken({
      userId: adminUser.id,
      email: adminUser.email,
      role: Role.ADMIN,
    });

    // 2. Customer User
    const customerUser = await prisma.user.create({
      data: {
        email: `customer_actions_${timestamp}@ezfinanz.com`,
        phone: `91${String(timestamp).slice(-8)}`,
        role: Role.CUSTOMER,
        emailVerified: true,
        phoneVerified: true,
      },
    });
    customerUserId = customerUser.id;
    customerToken = generateAccessToken({
      userId: customerUser.id,
      email: customerUser.email,
      role: Role.CUSTOMER,
    });

    // 3. Application 1: Happy Path (WAITING_ADMIN_REVIEW)
    const happyApp = await prisma.application.create({
      data: {
        userId: customerUserId,
        stage: ApplicationStage.WAITING_ADMIN_REVIEW,
      },
    });
    happyAppId = happyApp.id;

    await prisma.kycDetails.create({
      data: {
        applicationId: happyAppId,
        fullName: 'Rohit Sharma',
        dob: new Date('1987-04-30'),
        gender: 'MALE',
        address: '10 Marine Drive, Mumbai 400020',
        idType: IdType.PAN,
        idNumber: 'ABCDE5678G',
      },
    });

    await prisma.eligibilityCheck.create({
      data: {
        applicationId: happyAppId,
        income: 200000,
        requestedAmount: 500000,
        creditScore: 810,
        existingDebts: 20000,
        employerName: 'BCCI Ltd',
        designation: 'Captain',
        dtiRatio: 10,
        result: EligibilityResult.ELIGIBLE,
        maxApprovedAmount: 1000000,
      },
    });

    await prisma.loanTerms.create({
      data: {
        applicationId: happyAppId,
        amount: 500000,
        tenureMonths: 24,
        interestRate: 11.5,
        processingFee: 10000,
        gst: 1800,
        otherCharges: 500,
        emi: 23425.0,
        totalInterest: 62200,
        totalRepayment: 562200,
        totalCharges: 12300,
        netDisbursement: 487700,
        irr: 13.8,
      },
    });

    await prisma.bankAccount.create({
      data: {
        applicationId: happyAppId,
        holderName: 'Rohit Sharma',
        accountNumber: '112233445566',
        ifsc: 'ICIC0000104',
        bankName: 'ICICI Bank Ltd',
      },
    });

    await prisma.declaration.create({
      data: {
        applicationId: happyAppId,
        acceptedAt: new Date(),
        termsVersion: 'v1.0',
        ipAddress: '127.0.0.1',
      },
    });

    await prisma.selfie.create({
      data: {
        applicationId: happyAppId,
        photoUrl: '/uploads/selfies/rohit_selfie.png',
        adminStatus: AdminReviewStatus.PENDING,
      },
    });

    // 4. Application 2: Rejection Path (WAITING_ADMIN_REVIEW)
    const rejectApp = await prisma.application.create({
      data: {
        userId: customerUserId,
        stage: ApplicationStage.WAITING_ADMIN_REVIEW,
      },
    });
    rejectAppId = rejectApp.id;

    await prisma.selfie.create({
      data: {
        applicationId: rejectAppId,
        photoUrl: '/uploads/selfies/blurry_selfie.png',
        adminStatus: AdminReviewStatus.PENDING,
      },
    });
  });

  afterAll(async () => {
    const userIds = [adminUserId, customerUserId, ...e2eUserIds].filter(Boolean);
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

  describe('RBAC & Unauthorized Protection on Admin Action Endpoints', () => {
    it('should reject unauthenticated calls to review/disburse endpoints with 401', async () => {
      const res1 = await request(app).post(
        `/api/v1/admin/applications/${happyAppId}/selfie/approve`
      );
      expect(res1.status).toBe(401);

      const res2 = await request(app).post(
        `/api/v1/admin/applications/${happyAppId}/disburse`
      );
      expect(res2.status).toBe(401);
    });

    it('should reject CUSTOMER role accessing review/disburse endpoints with 403', async () => {
      const res1 = await request(app)
        .post(`/api/v1/admin/applications/${happyAppId}/selfie/approve`)
        .set('Authorization', `Bearer ${customerToken}`);
      expect(res1.status).toBe(403);

      const res2 = await request(app)
        .post(`/api/v1/admin/applications/${happyAppId}/disburse`)
        .set('Authorization', `Bearer ${customerToken}`);
      expect(res2.status).toBe(403);
    });
  });

  describe('Disbursement Guard: Blocked Before Approval', () => {
    it('should reject disbursement attempt with 400 Bad Request when application is still WAITING_ADMIN_REVIEW', async () => {
      const res = await request(app)
        .post(`/api/v1/admin/applications/${happyAppId}/disburse`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/(APPROVED stage|approved selfie)/i);
    });
  });

  describe('Selfie Rejection Flow on POST /api/v1/admin/applications/:id/selfie/reject', () => {
    it('should reject missing reason on reject endpoint with 422 Validation Error', async () => {
      const res = await request(app)
        .post(`/api/v1/admin/applications/${rejectAppId}/selfie/reject`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({}); // missing reason

      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
    });

    it('should successfully reject selfie with reason and update stage to REJECTED', async () => {
      const res = await request(app)
        .post(`/api/v1/admin/applications/${rejectAppId}/selfie/reject`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          reason: 'Photo is blurry and lighting does not meet compliance standards.',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.selfie.adminStatus).toBe(AdminReviewStatus.REJECTED);
      expect(res.body.data.selfie.rejectReason).toBe(
        'Photo is blurry and lighting does not meet compliance standards.'
      );
      expect(res.body.data.selfie.reviewedBy).toBe(adminUserId);
      expect(res.body.data.application.stage).toBe(ApplicationStage.REJECTED);

      // Verify in DB
      const dbApp = await prisma.application.findUnique({
        where: { id: rejectAppId },
        include: { selfie: true },
      });
      expect(dbApp?.stage).toBe(ApplicationStage.REJECTED);
      expect(dbApp?.selfie?.adminStatus).toBe(AdminReviewStatus.REJECTED);
    });

    it('should reject disbursement attempt on a REJECTED application with 400 Bad Request', async () => {
      const res = await request(app)
        .post(`/api/v1/admin/applications/${rejectAppId}/disburse`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('Selfie Approval Flow on POST /api/v1/admin/applications/:id/selfie/approve', () => {
    it('should successfully approve selfie and advance application stage to APPROVED', async () => {
      const res = await request(app)
        .post(`/api/v1/admin/applications/${happyAppId}/selfie/approve`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.selfie.adminStatus).toBe(AdminReviewStatus.APPROVED);
      expect(res.body.data.selfie.reviewedBy).toBe(adminUserId);
      expect(res.body.data.selfie.reviewedAt).toBeDefined();
      expect(res.body.data.selfie.rejectReason).toBeNull();
      expect(res.body.data.application.stage).toBe(ApplicationStage.APPROVED);

      // Verify in DB
      const dbApp = await prisma.application.findUnique({
        where: { id: happyAppId },
        include: { selfie: true },
      });
      expect(dbApp?.stage).toBe(ApplicationStage.APPROVED);
      expect(dbApp?.selfie?.adminStatus).toBe(AdminReviewStatus.APPROVED);
    });
  });

  describe('Loan Disbursement on POST /api/v1/admin/applications/:id/disburse', () => {
    it('should successfully disburse loan for approved application and advance stage to DISBURSED', async () => {
      const res = await request(app)
        .post(`/api/v1/admin/applications/${happyAppId}/disburse`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          referenceId: 'NEFT_987654321_TEST',
          notes: 'Standard RTGS disbursement completed.',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.stage).toBe(ApplicationStage.DISBURSED);
      expect(res.body.data.referenceId).toBe('NEFT_987654321_TEST');
      expect(res.body.data.disbursedAmount).toBe(487700);
      expect(res.body.data.nominalAmount).toBe(500000);
      expect(res.body.data.beneficiaryAccount.accountNumber).toBe(
        '112233445566'
      );
      expect(res.body.data.beneficiaryAccount.bankName).toBe(
        'ICICI Bank Ltd'
      );

      // Verify in DB
      const dbApp = await prisma.application.findUnique({
        where: { id: happyAppId },
      });
      expect(dbApp?.stage).toBe(ApplicationStage.DISBURSED);
    });

    it('should reject redundant disbursement attempt with 400 Bad Request once already DISBURSED', async () => {
      const res = await request(app)
        .post(`/api/v1/admin/applications/${happyAppId}/disburse`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('Generic Review Endpoint on POST /api/v1/admin/applications/:id/selfie/review', () => {
    it('should support unified review endpoint with action APPROVE', async () => {
      const tempApp = await prisma.application.create({
        data: {
          userId: customerUserId,
          stage: ApplicationStage.WAITING_ADMIN_REVIEW,
        },
      });

      await prisma.selfie.create({
        data: {
          applicationId: tempApp.id,
          photoUrl: '/uploads/selfies/temp_selfie.png',
          adminStatus: AdminReviewStatus.PENDING,
        },
      });

      const res = await request(app)
        .post(`/api/v1/admin/applications/${tempApp.id}/selfie/review`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          action: 'APPROVE',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.application.stage).toBe(ApplicationStage.APPROVED);

      await prisma.selfie.deleteMany({ where: { applicationId: tempApp.id } });
      await prisma.application.deleteMany({ where: { id: tempApp.id } });
    });
  });

  describe('Complete End-to-End Journey from Fresh Signup to Loan Disbursement', () => {
    it(
      'should execute full 11-step customer & admin lifecycle ending in DISBURSED',
      async () => {
      const e2eTimestamp = Date.now() + 500;
      const borrower = {
        email: `e2e_full_happy_${e2eTimestamp}@testfinanz.com`,
        password: 'SecurePassword@2026',
        phone: `9${Math.floor(100000000 + Math.random() * 900000000)}`,
      };

      // 1. Signup
      const signupRes = await request(app).post('/api/v1/auth/signup').send(borrower);
      expect(signupRes.status).toBe(201);
      const token = signupRes.body.data.accessToken;
      const uid = signupRes.body.data.user.id;
      const appId = signupRes.body.data.application.id;
      e2eUserIds.push(uid);

      // 2. Email OTP Send & Verify
      await request(app)
        .post('/api/v1/verification/email/send')
        .set('Authorization', `Bearer ${token}`);
      const emailOtp = otpService.getTestGeneratedOtp(
        borrower.email.toLowerCase(),
        OtpPurpose.EMAIL_VERIFICATION
      );
      const emailRes = await request(app)
        .post('/api/v1/verification/email/verify')
        .set('Authorization', `Bearer ${token}`)
        .send({ otp: emailOtp });
      expect(emailRes.status).toBe(200);
      expect(emailRes.body.data.emailVerified).toBe(true);

      // 3. Phone OTP Send & Verify -> KYC_PENDING
      await request(app)
        .post('/api/v1/verification/phone/send')
        .set('Authorization', `Bearer ${token}`);
      const phoneOtp = otpService.getTestGeneratedOtp(
        borrower.phone,
        OtpPurpose.PHONE_VERIFICATION
      );
      const phoneRes = await request(app)
        .post('/api/v1/verification/phone/verify')
        .set('Authorization', `Bearer ${token}`)
        .send({ otp: phoneOtp });
      expect(phoneRes.status).toBe(200);
      expect(phoneRes.body.data.applicationStage).toBe(ApplicationStage.KYC_PENDING);

      // 4. KYC Submit -> KYC_SUBMITTED
      const kycRes = await request(app)
        .post('/api/v1/kyc/submit')
        .set('Authorization', `Bearer ${token}`)
        .send({
          fullName: 'Ananya Singhania',
          dob: '1995-08-15',
          gender: 'FEMALE',
          address: '42 Palm Avenue, Bengaluru, Karnataka 560001',
          idType: 'PAN',
          idNumber: 'ABCPS1234A',
        });
      expect(kycRes.status).toBe(201);
      expect(kycRes.body.data.application.stage).toBe(ApplicationStage.KYC_SUBMITTED);

      // 5. Eligibility Check -> ELIGIBILITY_CHECKED
      const eligRes = await request(app)
        .post('/api/v1/eligibility/check')
        .set('Authorization', `Bearer ${token}`)
        .send({
          income: 125000,
          requestedAmount: 500000,
          creditScore: 785,
          existingDebts: 15000,
          employerName: 'Infosys Ltd',
          designation: 'Senior Software Engineer',
        });
      expect(eligRes.status).toBe(200);
      expect(eligRes.body.data.application.stage).toBe(ApplicationStage.ELIGIBILITY_CHECKED);

      // 6. Loan Terms Confirm -> EMI_SELECTED
      const termsRes = await request(app)
        .post('/api/v1/loan-terms/confirm')
        .set('Authorization', `Bearer ${token}`)
        .send({
          amount: 500000,
          tenureMonths: 24,
        });
      expect(termsRes.status).toBe(200);
      expect(termsRes.body.data.application.stage).toBe(ApplicationStage.EMI_SELECTED);

      // 7. Bank Account -> BANK_ADDED
      const bankRes = await request(app)
        .post('/api/v1/bank-account/submit')
        .set('Authorization', `Bearer ${token}`)
        .send({
          holderName: 'Ananya Singhania',
          accountNumber: '998877665544',
          ifsc: 'HDFC0000240',
          bankName: 'HDFC Bank Ltd',
        });
      expect(bankRes.status).toBe(201);
      expect(bankRes.body.data.application.stage).toBe(ApplicationStage.BANK_ADDED);

      // 8. Declaration Accept -> DECLARATION_CONFIRMED
      const declRes = await request(app)
        .post('/api/v1/declaration/accept')
        .set('Authorization', `Bearer ${token}`)
        .send({
          accepted: true,
          termsVersion: 'v1.0',
        });
      expect(declRes.status).toBe(200);
      expect(declRes.body.data.application.stage).toBe(
        ApplicationStage.DECLARATION_CONFIRMED
      );

      // 9. Selfie Upload -> WAITING_ADMIN_REVIEW
      const base64Png =
        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
      const selfieRes = await request(app)
        .post('/api/v1/selfie/submit')
        .set('Authorization', `Bearer ${token}`)
        .send({ image: base64Png });
      expect(selfieRes.status).toBe(201);
      expect(selfieRes.body.data.application.stage).toBe(
        ApplicationStage.WAITING_ADMIN_REVIEW
      );

      // 10. Admin Approves Selfie -> APPROVED
      const adminApproveRes = await request(app)
        .post(`/api/v1/admin/applications/${appId}/selfie/approve`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(adminApproveRes.status).toBe(200);
      expect(adminApproveRes.body.data.application.stage).toBe(
        ApplicationStage.APPROVED
      );

      // 11. Admin Disburses Loan -> DISBURSED
      const disburseRes = await request(app)
        .post(`/api/v1/admin/applications/${appId}/disburse`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ referenceId: 'DISB_E2E_HAPPY_123' });
      expect(disburseRes.status).toBe(200);
      expect(disburseRes.body.data.stage).toBe(ApplicationStage.DISBURSED);
      expect(disburseRes.body.data.referenceId).toBe('DISB_E2E_HAPPY_123');
      expect(disburseRes.body.data.disbursedAmount).toBeGreaterThan(0);
    }, 120000);
  });
});
