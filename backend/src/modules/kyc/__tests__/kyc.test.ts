import { describe, it, expect, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../../../app';
import { prisma } from '../../../prisma/client';
import { ApplicationStage, IdType } from '@prisma/client';

const app = createApp();

describe('KYC Module Integration Tests', () => {
  const timestamp = Date.now();
  const verifiedCustomer = {
    email: `kyc_cust_${timestamp}@testfinanz.com`,
    password: 'StrongPassword@123',
    phone: `9${Math.floor(100000000 + Math.random() * 900000000)}`,
  };

  const unverifiedCustomer = {
    email: `unverified_cust_${timestamp}@testfinanz.com`,
    password: 'StrongPassword@123',
    phone: `9${Math.floor(100000000 + Math.random() * 900000000)}`,
  };

  let verifiedToken: string;
  let verifiedUserId: string;
  let unverifiedToken: string;
  let unverifiedUserId: string;

  afterAll(async () => {
    const userIds = [verifiedUserId, unverifiedUserId].filter(Boolean);
    if (userIds.length > 0) {
      await prisma.kycDetails.deleteMany({
        where: { application: { userId: { in: userIds } } },
      });
      await prisma.application.deleteMany({ where: { userId: { in: userIds } } });
      await prisma.refreshToken.deleteMany({ where: { userId: { in: userIds } } });
      await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    }
  });

  it('Setup: Create verified and unverified test customers', async () => {
    // 1. Create verified customer (email_verified & phone_verified = true, application = KYC_PENDING)
    const verifiedRes = await request(app)
      .post('/api/v1/auth/signup')
      .send(verifiedCustomer);

    expect(verifiedRes.status).toBe(201);
    verifiedToken = verifiedRes.body.data.accessToken;
    verifiedUserId = verifiedRes.body.data.user.id;

    // Manually mark verified & advance stage to KYC_PENDING
    await prisma.user.update({
      where: { id: verifiedUserId },
      data: { emailVerified: true, phoneVerified: true },
    });
    await prisma.application.updateMany({
      where: { userId: verifiedUserId },
      data: { stage: ApplicationStage.KYC_PENDING },
    });

    // 2. Create unverified customer
    const unverifiedRes = await request(app)
      .post('/api/v1/auth/signup')
      .send(unverifiedCustomer);

    expect(unverifiedRes.status).toBe(201);
    unverifiedToken = unverifiedRes.body.data.accessToken;
    unverifiedUserId = unverifiedRes.body.data.user.id;
  });

  describe('StageGuard Verification Pre-condition', () => {
    it('should reject KYC submission with 403 Forbidden when customer email/phone is unverified', async () => {
      const res = await request(app)
        .post('/api/v1/kyc/submit')
        .set('Authorization', `Bearer ${unverifiedToken}`)
        .send({
          fullName: 'Unverified Applicant',
          dob: '1995-05-15',
          gender: 'MALE',
          address: '42 MG Road, Bengaluru, Karnataka 560001',
          idType: IdType.PAN,
          idNumber: 'ABCDE1234F',
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(JSON.stringify(res.body)).toContain('verification required');
    });
  });

  describe('Validation Rules on POST /api/v1/kyc/submit', () => {
    it('should reject underage applicant (< 18 years old) with 422 Validation Error', async () => {
      const res = await request(app)
        .post('/api/v1/kyc/submit')
        .set('Authorization', `Bearer ${verifiedToken}`)
        .send({
          fullName: 'Underage User',
          dob: '2015-01-01', // Age ~11 years
          gender: 'FEMALE',
          address: '10 Park Street, Kolkata, West Bengal',
          idType: IdType.PAN,
          idNumber: 'ABCDE1234F',
        });

      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
      expect(JSON.stringify(res.body)).toContain('at least 18 years old');
    });

    it('should reject invalid PAN card format with 422 Validation Error', async () => {
      const res = await request(app)
        .post('/api/v1/kyc/submit')
        .set('Authorization', `Bearer ${verifiedToken}`)
        .send({
          fullName: 'Valid Name',
          dob: '1992-08-20',
          gender: 'MALE',
          address: '12 Banjara Hills, Hyderabad, Telangana',
          idType: IdType.PAN,
          idNumber: 'INVALID_PAN_123', // Invalid format
        });

      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
      expect(JSON.stringify(res.body)).toContain('Invalid PAN card format');
    });

    it('should reject invalid Aadhaar card format with 422 Validation Error', async () => {
      const res = await request(app)
        .post('/api/v1/kyc/submit')
        .set('Authorization', `Bearer ${verifiedToken}`)
        .send({
          fullName: 'Valid Name',
          dob: '1990-12-10',
          gender: 'FEMALE',
          address: '15 Anna Nagar, Chennai, Tamil Nadu',
          idType: IdType.AADHAAR,
          idNumber: '123456', // Too short (not 12 digits)
        });

      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
      expect(JSON.stringify(res.body)).toContain('Invalid Aadhaar format');
    });
  });

  describe('Successful KYC Submission & Lifecycle Advancement', () => {
    it('should successfully submit valid KYC with PAN and advance application stage to KYC_SUBMITTED', async () => {
      const res = await request(app)
        .post('/api/v1/kyc/submit')
        .set('Authorization', `Bearer ${verifiedToken}`)
        .send({
          fullName: 'Aarav Sharma',
          dob: '1995-04-12',
          gender: 'MALE',
          address: 'Flat 402, Green Meadows, Outer Ring Road, Bengaluru 560103',
          idType: IdType.PAN,
          idNumber: 'ABCDE1234F',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.kycDetails.fullName).toBe('Aarav Sharma');
      expect(res.body.data.kycDetails.idType).toBe(IdType.PAN);
      expect(res.body.data.kycDetails.idNumber).toBe('ABCDE1234F');
      expect(res.body.data.application.stage).toBe(ApplicationStage.KYC_SUBMITTED);

      // Verify in DB
      const dbKyc = await prisma.kycDetails.findUnique({
        where: { applicationId: res.body.data.application.id },
      });
      expect(dbKyc).toBeDefined();
      expect(dbKyc?.fullName).toBe('Aarav Sharma');
    });

    it('should support multipart file upload for ID document photo', async () => {
      // Re-set stage to KYC_PENDING to test file upload submission
      await prisma.application.updateMany({
        where: { userId: verifiedUserId },
        data: { stage: ApplicationStage.KYC_PENDING },
      });

      const fakeImageBuffer = Buffer.from('fake-png-image-content-for-test');

      const res = await request(app)
        .post('/api/v1/kyc/submit')
        .set('Authorization', `Bearer ${verifiedToken}`)
        .field('fullName', 'Aarav Sharma')
        .field('dob', '1995-04-12')
        .field('gender', 'MALE')
        .field('address', 'Flat 402, Green Meadows, Bengaluru 560103')
        .field('idType', 'AADHAAR')
        .field('idNumber', '2345 6789 0123')
        .attach('idPhoto', fakeImageBuffer, {
          filename: 'aadhaar_card.png',
          contentType: 'image/png',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.kycDetails.idPhotoUrl).toBeDefined();
      expect(res.body.data.kycDetails.idPhotoUrl).toContain('/uploads/kyc-documents/');
      expect(res.body.data.kycDetails.idNumber).toBe('234567890123'); // Stripped spaces
      expect(res.body.data.application.stage).toBe(ApplicationStage.KYC_SUBMITTED);
    });

    it('GET /api/v1/kyc/status should return active KYC submission details', async () => {
      const res = await request(app)
        .get('/api/v1/kyc/status')
        .set('Authorization', `Bearer ${verifiedToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.kycDetails).toBeDefined();
      expect(res.body.data.kycDetails.fullName).toBe('Aarav Sharma');
      expect(res.body.data.application.stage).toBe(ApplicationStage.KYC_SUBMITTED);
    });

    it('should reject upload with invalid file type (e.g. text/plain) with 400 Bad Request', async () => {
      await prisma.application.updateMany({
        where: { userId: verifiedUserId },
        data: { stage: ApplicationStage.KYC_PENDING },
      });

      const fakeTxtBuffer = Buffer.from('plain-text-file-content');

      const res = await request(app)
        .post('/api/v1/kyc/submit')
        .set('Authorization', `Bearer ${verifiedToken}`)
        .field('fullName', 'Aarav Sharma')
        .field('dob', '1995-04-12')
        .field('gender', 'MALE')
        .field('address', 'Flat 402, Green Meadows, Bengaluru 560103')
        .field('idType', 'PAN')
        .field('idNumber', 'ABCDE1234F')
        .attach('idPhoto', fakeTxtBuffer, {
          filename: 'invalid_doc.txt',
          contentType: 'text/plain',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(JSON.stringify(res.body)).toContain('Invalid file type');
    });
  });
});
