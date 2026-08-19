import { describe, it, expect, afterAll } from 'vitest';
import request from 'supertest';
import express from 'express';
import { createApp } from '../../../app';
import { prisma } from '../../../prisma/client';
import { emailService } from '../../../shared/services/email.service';
import { ApplicationStage } from '@prisma/client';
import { authGuard, stageGuard, errorHandler } from '../../../shared/middleware';
import { sendSuccess } from '../../../shared/utils/api-response';

const app = createApp();

// Setup a dedicated mini test app for stageGuard route testing
const testGuardApp = express();
testGuardApp.use(express.json());
testGuardApp.post(
  '/api/v1/test-kyc-submit',
  authGuard,
  stageGuard(ApplicationStage.KYC_PENDING),
  (_req, res) => {
    sendSuccess(res, { submitted: true }, 'KYC permitted');
  }
);
testGuardApp.use(errorHandler);

describe('Verification Module Integration Tests', () => {
  const timestamp = Date.now();
  const testEmail = `verify_${timestamp}@testfinanz.com`;
  const testPhone = `9${Math.floor(100000000 + Math.random() * 900000000)}`;
  const testPassword = 'StrongPassword@123';

  let accessToken: string;
  let userId: string;

  afterAll(async () => {
    if (userId) {
      await prisma.application.deleteMany({ where: { userId } });
      await prisma.refreshToken.deleteMany({ where: { userId } });
      await prisma.user.deleteMany({ where: { id: userId } });
    }
  });

  it('Setup: Should create an unverified test user and return auth token', async () => {
    const signupRes = await request(app).post('/api/v1/auth/signup').send({
      email: testEmail,
      password: testPassword,
      phone: testPhone,
    });

    expect(signupRes.status).toBe(201);
    expect(signupRes.body.success).toBe(true);
    accessToken = signupRes.body.data.accessToken;
    userId = signupRes.body.data.user.id;

    // Verify initial state is unverified
    expect(signupRes.body.data.user.emailVerified).toBe(false);
    expect(signupRes.body.data.user.phoneVerified).toBe(false);
  });

  describe('GET /api/v1/verification/status', () => {
    it('should return initial unverified status for both email and phone', async () => {
      const res = await request(app)
        .get('/api/v1/verification/status')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.emailVerified).toBe(false);
      expect(res.body.data.phoneVerified).toBe(false);
      expect(res.body.data.isFullyVerified).toBe(false);
      expect(res.body.data.canProceedToKyc).toBe(false);
    });
  });

  describe('StageGuard Enforcement Before Verification', () => {
    it('should block KYC progression with 403 Forbidden when unverified', async () => {
      const res = await request(testGuardApp)
        .post('/api/v1/test-kyc-submit')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('verification required');
    });
  });

  describe('Email Verification Flow', () => {
    it('should send email verification OTP and record email dispatch in EmailService', async () => {
      emailService.clearSentEmails();

      const res = await request(app)
        .post('/api/v1/verification/email/send')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({});

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.target).toBe(testEmail.toLowerCase());

      // Check simulated email delivery
      const sentEmails = emailService.getSentEmails(testEmail);
      expect(sentEmails.length).toBeGreaterThan(0);
      expect(sentEmails[0].subject).toContain('Email Verification');
    });

    it('should reject email verification with incorrect OTP (400 Bad Request)', async () => {
      const res = await request(app)
        .post('/api/v1/verification/email/verify')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ otp: '000000' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Invalid or expired');
    });

    it('should successfully verify email with valid demo/generated OTP', async () => {
      // Use demo bypass OTP 123456 supported by MockOtpService
      const res = await request(app)
        .post('/api/v1/verification/email/verify')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ otp: '123456' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.emailVerified).toBe(true);

      // Verify in DB
      const user = await prisma.user.findUnique({ where: { id: userId } });
      expect(user?.emailVerified).toBe(true);
    });

    it('should reject redundant email OTP send after email is already verified', async () => {
      const res = await request(app)
        .post('/api/v1/verification/email/send')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('already verified');
    });
  });

  describe('Phone OTP Verification Flow', () => {
    it('should send phone verification OTP', async () => {
      const res = await request(app)
        .post('/api/v1/verification/phone/send')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({});

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.target).toBe(testPhone);
    });

    it('should support resending OTP while unverified', async () => {
      const resendRes = await request(app)
        .post('/api/v1/verification/phone/send')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({});

      expect(resendRes.status).toBe(200);
      expect(resendRes.body.success).toBe(true);
      expect(resendRes.body.data.target).toBe(testPhone);
    });

    it('should reject phone verification with wrong OTP (400 Bad Request)', async () => {
      const res = await request(app)
        .post('/api/v1/verification/phone/verify')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ otp: '999999' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Invalid or expired');
    });

    it('should successfully verify phone with valid OTP and advance application to KYC_PENDING', async () => {
      const verifyRes = await request(app)
        .post('/api/v1/verification/phone/verify')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ otp: '123456' });

      expect(verifyRes.status).toBe(200);
      expect(verifyRes.body.success).toBe(true);
      expect(verifyRes.body.data.phoneVerified).toBe(true);

      // Both are now verified -> Application stage should advance to KYC_PENDING
      expect(verifyRes.body.data.applicationStage).toBe(ApplicationStage.KYC_PENDING);

      // Verify in DB
      const user = await prisma.user.findUnique({ where: { id: userId } });
      expect(user?.phoneVerified).toBe(true);
      expect(user?.emailVerified).toBe(true);
    });
  });

  describe('StageGuard Permitted After Dual Verification', () => {
    it('should now allow progression past verification check to KYC', async () => {
      const res = await request(testGuardApp)
        .post('/api/v1/test-kyc-submit')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.submitted).toBe(true);
    });

    it('should reflect full verification in verification status endpoint', async () => {
      const res = await request(app)
        .get('/api/v1/verification/status')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.isFullyVerified).toBe(true);
      expect(res.body.data.canProceedToKyc).toBe(true);
      expect(res.body.data.currentApplicationStage).toBe(ApplicationStage.KYC_PENDING);
    });
  });
});
