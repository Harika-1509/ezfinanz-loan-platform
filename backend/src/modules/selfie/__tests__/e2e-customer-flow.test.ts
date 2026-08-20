import { describe, it, expect, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../../../app';
import { prisma } from '../../../prisma/client';
import { otpService } from '../../../shared/services/otp.service';
import {
  ApplicationStage,
  EligibilityResult,
  IdType,
  AdminReviewStatus,
  OtpPurpose,
} from '@prisma/client';

const app = createApp();

describe('Full End-to-End Customer Loan Application Chain (Signup through Selfie)', () => {
  const timestamp = Date.now();
  const borrower = {
    email: `e2e_borrower_${timestamp}@testfinanz.com`,
    password: 'SecurePassword@2026',
    phone: `9${Math.floor(100000000 + Math.random() * 900000000)}`,
  };

  let token: string;
  let userId: string;
  let applicationId: string;

  afterAll(async () => {
    if (userId) {
      await prisma.selfie.deleteMany({
        where: { application: { userId } },
      });
      await prisma.declaration.deleteMany({
        where: { application: { userId } },
      });
      await prisma.bankAccount.deleteMany({
        where: { application: { userId } },
      });
      await prisma.loanTerms.deleteMany({
        where: { application: { userId } },
      });
      await prisma.eligibilityCheck.deleteMany({
        where: { application: { userId } },
      });
      await prisma.kycDetails.deleteMany({
        where: { application: { userId } },
      });
      await prisma.application.deleteMany({ where: { userId } });
      await prisma.refreshToken.deleteMany({ where: { userId } });
      await prisma.user.deleteMany({ where: { id: userId } });
    }
  });

  it('Step 1: Customer Signup & Application Initialization (SIGNUP_COMPLETED)', async () => {
    const res = await request(app).post('/api/v1/auth/signup').send(borrower);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe(borrower.email);
    expect(res.body.data.application.stage).toBe(
      ApplicationStage.SIGNUP_COMPLETED
    );

    token = res.body.data.accessToken;
    userId = res.body.data.user.id;
    applicationId = res.body.data.application.id;
  });

  it('Step 2: Email & Phone Dual Verification (KYC_PENDING)', async () => {
    // Send & verify Email OTP
    await request(app)
      .post('/api/v1/verification/email/send')
      .set('Authorization', `Bearer ${token}`);

    const emailOtp = otpService.getTestGeneratedOtp(
      borrower.email.toLowerCase(),
      OtpPurpose.EMAIL_VERIFICATION
    );

    const verifyEmailRes = await request(app)
      .post('/api/v1/verification/email/verify')
      .set('Authorization', `Bearer ${token}`)
      .send({ otp: emailOtp });

    expect(verifyEmailRes.status).toBe(200);
    expect(verifyEmailRes.body.data.emailVerified).toBe(true);

    // Send & verify Phone OTP
    await request(app)
      .post('/api/v1/verification/phone/send')
      .set('Authorization', `Bearer ${token}`);

    const phoneOtp = otpService.getTestGeneratedOtp(
      borrower.phone,
      OtpPurpose.PHONE_VERIFICATION
    );

    const verifyPhoneRes = await request(app)
      .post('/api/v1/verification/phone/verify')
      .set('Authorization', `Bearer ${token}`)
      .send({ otp: phoneOtp });

    expect(verifyPhoneRes.status).toBe(200);
    expect(verifyPhoneRes.body.data.phoneVerified).toBe(true);
    expect(verifyPhoneRes.body.data.applicationStage).toBe(
      ApplicationStage.KYC_PENDING
    );
  });

  it('Step 3: KYC Submission with Format Validation (KYC_SUBMITTED)', async () => {
    const res = await request(app)
      .post('/api/v1/kyc/submit')
      .set('Authorization', `Bearer ${token}`)
      .send({
        fullName: 'Devendra Singhania',
        dob: '1988-11-22',
        gender: 'MALE',
        address: '702 Embassy Golf Links, Bengaluru 560071',
        idType: IdType.PAN,
        idNumber: 'ABCDE7890K',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.kycDetails.fullName).toBe('Devendra Singhania');
    expect(res.body.data.application.stage).toBe(
      ApplicationStage.KYC_SUBMITTED
    );
  });

  it('Step 4: Underwriting & Credit Bureau Eligibility Check (ELIGIBILITY_CHECKED)', async () => {
    const res = await request(app)
      .post('/api/v1/eligibility/check')
      .set('Authorization', `Bearer ${token}`)
      .send({
        income: 175000,
        requestedAmount: 400000,
        creditScore: 805,
        existingDebts: 15000,
        employerName: 'Microsoft R&D India',
        designation: 'Principal Group Manager',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.calculation.result).toBe(EligibilityResult.ELIGIBLE);
    expect(res.body.data.calculation.dtiRatio).toBeLessThan(35);
    expect(res.body.data.application.stage).toBe(
      ApplicationStage.ELIGIBILITY_CHECKED
    );
  });

  it('Step 5: Loan Terms Selection, Calculation & Confirmation (EMI_SELECTED)', async () => {
    // 5a. Dynamic calculation draft
    const calcRes = await request(app)
      .post('/api/v1/loan-terms/calculate')
      .set('Authorization', `Bearer ${token}`)
      .send({
        amount: 350000,
        tenureMonths: 18,
      });

    expect(calcRes.status).toBe(200);
    expect(calcRes.body.data.breakdown.emi).toBeGreaterThan(0);
    expect(calcRes.body.data.breakdown.irr).toBeGreaterThan(13.5);

    // 5b. Explicit confirmation
    const confirmRes = await request(app)
      .post('/api/v1/loan-terms/confirm')
      .set('Authorization', `Bearer ${token}`)
      .send({
        amount: 350000,
        tenureMonths: 18,
      });

    expect(confirmRes.status).toBe(200);
    expect(confirmRes.body.success).toBe(true);
    expect(confirmRes.body.data.application.stage).toBe(
      ApplicationStage.EMI_SELECTED
    );
  });

  it('Step 6: Disbursement Bank Account Linking (BANK_ADDED)', async () => {
    const res = await request(app)
      .post('/api/v1/bank-account/submit')
      .set('Authorization', `Bearer ${token}`)
      .send({
        holderName: 'Devendra Singhania',
        accountNumber: '20100456789012',
        ifsc: 'HDFC0000240',
        bankName: 'HDFC Bank',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.bankAccount.holderName).toBe('Devendra Singhania');
    expect(res.body.data.application.stage).toBe(ApplicationStage.BANK_ADDED);
  });

  it('Step 7: Loan Terms Legal Declaration Acceptance (DECLARATION_CONFIRMED)', async () => {
    // 7a. Fetch declaration text
    const textRes = await request(app)
      .get('/api/v1/declaration/text')
      .set('Authorization', `Bearer ${token}`);

    expect(textRes.status).toBe(200);
    expect(textRes.body.data.applicantName).toBe('Devendra Singhania');
    expect(textRes.body.data.loanSummary.sanctionedAmount).toBe(350000);

    // 7b. Accept declaration
    const acceptRes = await request(app)
      .post('/api/v1/declaration/accept')
      .set('Authorization', `Bearer ${token}`)
      .send({
        accepted: true,
        termsVersion: 'v1.0',
      });

    expect(acceptRes.status).toBe(200);
    expect(acceptRes.body.success).toBe(true);
    expect(acceptRes.body.data.application.stage).toBe(
      ApplicationStage.DECLARATION_CONFIRMED
    );
  });

  it('Step 8: Selfie Verification Photo Submission (WAITING_ADMIN_REVIEW)', async () => {
    const imageBuffer = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      'base64'
    );

    const res = await request(app)
      .post('/api/v1/selfie/submit')
      .set('Authorization', `Bearer ${token}`)
      .attach('selfie', imageBuffer, {
        filename: 'devendra_selfie.png',
        contentType: 'image/png',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.selfie.adminStatus).toBe(AdminReviewStatus.PENDING);
    expect(res.body.data.application.stage).toBe(
      ApplicationStage.WAITING_ADMIN_REVIEW
    );
  });

  it('Step 9: Complete Database Audit & Verification of the Full Onboarding Chain', async () => {
    // 9a. Verify authenticated profile reflects latest stage
    const profileRes = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(profileRes.status).toBe(200);
    expect(profileRes.body.data.application.stage).toBe(
      ApplicationStage.WAITING_ADMIN_REVIEW
    );

    // 9b. Deep audit of database records
    const fullApplication = await prisma.application.findUnique({
      where: { id: applicationId },
      include: {
        user: true,
        kycDetails: true,
        eligibilityCheck: true,
        loanTerms: true,
        bankAccount: true,
        declaration: true,
        selfie: true,
      },
    });

    expect(fullApplication).toBeDefined();
    expect(fullApplication?.stage).toBe(ApplicationStage.WAITING_ADMIN_REVIEW);
    expect(fullApplication?.user.emailVerified).toBe(true);
    expect(fullApplication?.user.phoneVerified).toBe(true);
    expect(fullApplication?.kycDetails?.idNumber).toBe('ABCDE7890K');
    expect(fullApplication?.eligibilityCheck?.result).toBe(
      EligibilityResult.ELIGIBLE
    );
    expect(Number(fullApplication?.loanTerms?.amount)).toBe(350000);
    expect(fullApplication?.bankAccount?.ifsc).toBe('HDFC0000240');
    expect(fullApplication?.declaration?.termsVersion).toBe('v1.0');
    expect(fullApplication?.selfie?.adminStatus).toBe(AdminReviewStatus.PENDING);
  });
});
