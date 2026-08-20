import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../../../app';
import { prisma } from '../../../prisma/client';
import { ApplicationStage, Role } from '@prisma/client';

const app = createApp();

describe('Validation & Global Error Handling Edge Cases Audit', () => {
  const timestamp = Date.now();

  const testUser = {
    email: `valid_audit_${timestamp}@testfinanz.com`,
    password: 'Password@123',
    phone: `9${Math.floor(100000000 + Math.random() * 900000000)}`,
  };

  const adminUser = {
    email: `admin_audit_${timestamp}@testfinanz.com`,
    password: 'Password@123',
    phone: `9${Math.floor(100000000 + Math.random() * 900000000)}`,
  };

  let userToken: string;
  let userId: string;
  let adminToken: string;
  let adminId: string;
  let applicationId: string;

  beforeAll(async () => {
    // 1. Create standard customer user
    const signupRes = await request(app)
      .post('/api/v1/auth/signup')
      .send(testUser);

    userToken = signupRes.body.data.accessToken;
    userId = signupRes.body.data.user.id;

    // Mark verified and set application to KYC_PENDING
    await prisma.user.update({
      where: { id: userId },
      data: { emailVerified: true, phoneVerified: true },
    });

    const appRecord = await prisma.application.findFirst({
      where: { userId },
    });
    if (appRecord) {
      applicationId = appRecord.id;
      await prisma.application.update({
        where: { id: applicationId },
        data: { stage: ApplicationStage.KYC_PENDING },
      });
    }

    // 2. Create admin user
    const adminSignupRes = await request(app)
      .post('/api/v1/auth/signup')
      .send(adminUser);

    adminId = adminSignupRes.body.data.user.id;

    await prisma.user.update({
      where: { id: adminId },
      data: { role: Role.ADMIN, emailVerified: true, phoneVerified: true },
    });

    // Login as admin to get an access token with Role.ADMIN in claims
    const adminLoginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: adminUser.email,
        password: adminUser.password,
      });

    adminToken = adminLoginRes.body.data.accessToken;
  });

  afterAll(async () => {
    const userIds = [userId, adminId].filter(Boolean);
    if (userIds.length > 0) {
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

  // ==========================================
  // 1. GLOBAL ERROR & NOT FOUND HANDLING
  // ==========================================
  describe('Global Error Format & HTTP Status Contracts', () => {
    it('should return 404 with consistent json payload for undefined routes', async () => {
      const res = await request(app).get('/api/v1/unknown-endpoint-route');

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBeDefined();
      expect(res.body.error.code).toMatch(/NOT_FOUND/);
      expect(res.body.meta).toHaveProperty('timestamp');
    });

    it('should return 401 UNAUTHORIZED when protected routes are accessed without a bearer token', async () => {
      const res = await request(app).get('/api/v1/auth/me');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });
  });

  // ==========================================
  // 2. KYC VALIDATION EDGE CASES
  // ==========================================
  describe('KYC Endpoint Validation Edge Cases', () => {
    it('should reject applicant younger than 18 years old with 422 VALIDATION_ERROR', async () => {
      const res = await request(app)
        .post('/api/v1/kyc/submit')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          fullName: 'Underage Applicant',
          dob: '2015-05-10', // 11 years old
          gender: 'MALE',
          address: '123 Test Street, Mumbai, Maharashtra',
          idType: 'PAN',
          idNumber: 'ABCDE1234F',
        });

      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(Array.isArray(res.body.error.details)).toBe(true);

      const dobError = res.body.error.details.find((d: any) => d.path === 'dob');
      expect(dobError).toBeDefined();
      expect(dobError.message).toMatch(/18 years/i);
    });

    it('should reject invalid PAN card format (e.g. 12345ABCDE) with 422', async () => {
      const res = await request(app)
        .post('/api/v1/kyc/submit')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          fullName: 'Valid Name',
          dob: '1995-01-15',
          gender: 'MALE',
          address: '456 MG Road, Bangalore, Karnataka',
          idType: 'PAN',
          idNumber: '12345ABCDE', // Invalid PAN format
        });

      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
      const idError = res.body.error.details.find((d: any) => d.path === 'idNumber');
      expect(idError).toBeDefined();
      expect(idError.message).toMatch(/PAN/i);
    });

    it('should reject invalid Aadhaar format (e.g. starting with 0 or 1, or 10 digits) with 422', async () => {
      const res = await request(app)
        .post('/api/v1/kyc/submit')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          fullName: 'Valid Name',
          dob: '1995-01-15',
          gender: 'FEMALE',
          address: '789 Connaught Place, New Delhi',
          idType: 'AADHAAR',
          idNumber: '123456789012', // Starts with 1 (invalid per UIDAI)
        });

      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
      const idError = res.body.error.details.find((d: any) => d.path === 'idNumber');
      expect(idError).toBeDefined();
      expect(idError.message).toMatch(/Aadhaar/i);
    });

    it('should reject invalid gender with 422', async () => {
      const res = await request(app)
        .post('/api/v1/kyc/submit')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          fullName: 'Valid Name',
          dob: '1995-01-15',
          gender: 'UNKNOWN_GENDER',
          address: 'Valid Address Here',
          idType: 'PAN',
          idNumber: 'ABCDE1234F',
        });

      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
      const genderError = res.body.error.details.find((d: any) => d.path === 'gender');
      expect(genderError).toBeDefined();
    });

    it('should accept valid KYC payload and advance application stage', async () => {
      const res = await request(app)
        .post('/api/v1/kyc/submit')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          fullName: 'Rohan Sharma',
          dob: '1992-06-20',
          gender: 'MALE',
          address: 'Flat 402, Sunshine Apartments, Mumbai, Maharashtra 400001',
          idType: 'PAN',
          idNumber: 'ABCDE1234F',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.kycDetails.fullName).toBe('Rohan Sharma');
    });
  });

  // ==========================================
  // 3. ELIGIBILITY VALIDATION EDGE CASES
  // ==========================================
  describe('Eligibility Endpoint Validation Edge Cases', () => {
    it('should reject non-positive income with 422', async () => {
      const res = await request(app)
        .post('/api/v1/eligibility/check')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          income: 0,
          requestedAmount: 200000,
          existingDebts: 0,
          employerName: 'Infosys',
          designation: 'Engineer',
        });

      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
      const incomeErr = res.body.error.details.find((d: any) => d.path === 'income');
      expect(incomeErr).toBeDefined();
    });

    it('should reject loan amount below minimum ₹10,000 with 422', async () => {
      const res = await request(app)
        .post('/api/v1/eligibility/check')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          income: 50000,
          requestedAmount: 5000, // Below min ₹10,000
          existingDebts: 0,
          employerName: 'Infosys',
          designation: 'Engineer',
        });

      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
      const amountErr = res.body.error.details.find((d: any) => d.path === 'requestedAmount');
      expect(amountErr).toBeDefined();
    });

    it('should reject loan amount exceeding maximum ₹50,00,000 with 422', async () => {
      const res = await request(app)
        .post('/api/v1/eligibility/check')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          income: 500000,
          requestedAmount: 6000000, // Above max ₹50,00,000
          existingDebts: 0,
          employerName: 'Infosys',
          designation: 'Director',
        });

      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
      const amountErr = res.body.error.details.find((d: any) => d.path === 'requestedAmount');
      expect(amountErr).toBeDefined();
    });

    it('should reject negative existing debts with 422', async () => {
      const res = await request(app)
        .post('/api/v1/eligibility/check')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          income: 50000,
          requestedAmount: 200000,
          existingDebts: -5000, // Negative debt
          employerName: 'Infosys',
          designation: 'Engineer',
        });

      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
      const debtErr = res.body.error.details.find((d: any) => d.path === 'existingDebts');
      expect(debtErr).toBeDefined();
    });
  });

  // ==========================================
  // 4. LOAN TERMS VALIDATION EDGE CASES
  // ==========================================
  describe('Loan Terms Calculation & Confirmation Validation Edge Cases', () => {
    it('should reject unsupported tenure values (e.g. 15 months) with 422', async () => {
      const res = await request(app)
        .post('/api/v1/loan-terms/calculate')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          amount: 200000,
          tenureMonths: 15, // Unsupported (valid are 6, 12, 18, 24, 36)
        });

      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
      const tenureErr = res.body.error.details.find((d: any) => d.path === 'tenureMonths');
      expect(tenureErr).toBeDefined();
      expect(tenureErr.message).toMatch(/tenure/i);
    });

    it('should reject negative loan amount with 422', async () => {
      const res = await request(app)
        .post('/api/v1/loan-terms/calculate')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          amount: -100000,
          tenureMonths: 12,
        });

      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
      const amountErr = res.body.error.details.find((d: any) => d.path === 'amount');
      expect(amountErr).toBeDefined();
    });
  });

  // ==========================================
  // 5. BANK ACCOUNT VALIDATION EDGE CASES
  // ==========================================
  describe('Bank Account Validation Edge Cases', () => {
    it('should reject invalid IFSC code format (e.g. 5th character not 0 or too short) with 422', async () => {
      const res = await request(app)
        .post('/api/v1/bank-account/submit')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          holderName: 'Rohan Sharma',
          accountNumber: '123456789012',
          ifsc: 'HDFC1001234', // 5th character is 1, not 0
          bankName: 'HDFC Bank',
        });

      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
      const ifscErr = res.body.error.details.find((d: any) => d.path === 'ifsc');
      expect(ifscErr).toBeDefined();
      expect(ifscErr.message).toMatch(/IFSC/i);
    });

    it('should reject bank account number with fewer than 9 digits with 422', async () => {
      const res = await request(app)
        .post('/api/v1/bank-account/submit')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          holderName: 'Rohan Sharma',
          accountNumber: '12345', // Too short (min 9 digits)
          ifsc: 'HDFC0001234',
          bankName: 'HDFC Bank',
        });

      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
      const accErr = res.body.error.details.find((d: any) => d.path === 'accountNumber');
      expect(accErr).toBeDefined();
    });
  });

  // ==========================================
  // 6. ADMIN ACTIONS VALIDATION EDGE CASES
  // ==========================================
  describe('Admin Review & Actions Validation Edge Cases', () => {
    it('should reject selfie rejection when reason is fewer than 3 characters with 422', async () => {
      const res = await request(app)
        .post(`/api/v1/admin/applications/${applicationId}/selfie/reject`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          reason: 'no', // Less than 3 chars
        });

      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
      const reasonErr = res.body.error.details.find((d: any) => d.path === 'reason');
      expect(reasonErr).toBeDefined();
    });

    it('should reject selfie rejection with missing reason field with 422', async () => {
      const res = await request(app)
        .post(`/api/v1/admin/applications/${applicationId}/selfie/reject`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});

      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
      const reasonErr = res.body.error.details.find((d: any) => d.path === 'reason');
      expect(reasonErr).toBeDefined();
    });

    it('should reject non-admin users attempting admin action with 403 FORBIDDEN', async () => {
      const res = await request(app)
        .post(`/api/v1/admin/applications/${applicationId}/selfie/approve`)
        .set('Authorization', `Bearer ${userToken}`) // Normal customer token
        .send({});

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });
  });
});
