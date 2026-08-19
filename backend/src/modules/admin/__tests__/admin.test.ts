import { describe, it, expect, afterAll } from 'vitest';
import request from 'supertest';
import {
  ApplicationStage,
  AdminReviewStatus,
  EligibilityResult,
  IdType,
  Role,
} from '@prisma/client';
import createApp from '../../../app';
import { prisma } from '../../../prisma/client';
import { generateAccessToken } from '../../../shared/utils/jwt';

const app = createApp();

describe('Admin Dashboard Module Integration Tests', () => {
  const timestamp = Date.now();

  let adminToken: string;
  let adminUserId: string;
  let customerToken: string;
  let customerUserId: string;
  let customerAppId: string;

  afterAll(async () => {
    const userIds = [adminUserId, customerUserId].filter(Boolean);
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

  it('Setup: Create Admin user and fully onboarded Customer application', async () => {
    // 1. Create Admin User & obtain Admin JWT
    const adminEmail = `admin_${timestamp}@ezfinanz.com`;
    const adminUser = await prisma.user.create({
      data: {
        email: adminEmail,
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

    // 2. Create Regular Customer User & Customer JWT
    const customerEmail = `borrower_admin_test_${timestamp}@ezfinanz.com`;
    const customerPhone = `98${String(timestamp).slice(-8)}`;
    const customerUser = await prisma.user.create({
      data: {
        email: customerEmail,
        phone: customerPhone,
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

    // 3. Create full application journey record for this customer
    const application = await prisma.application.create({
      data: {
        userId: customerUserId,
        stage: ApplicationStage.WAITING_ADMIN_REVIEW,
      },
    });
    customerAppId = application.id;

    // Attach KYC Details
    await prisma.kycDetails.create({
      data: {
        applicationId: customerAppId,
        fullName: 'Vikramaditya Singhania',
        dob: new Date('1990-05-15'),
        gender: 'MALE',
        address: '42 MG Road, Bengaluru 560001',
        idType: IdType.PAN,
        idNumber: 'ABCDE1234F',
        idPhotoUrl: '/uploads/kyc/pan_card.jpg',
      },
    });

    // Attach Eligibility Check
    await prisma.eligibilityCheck.create({
      data: {
        applicationId: customerAppId,
        income: 120000,
        requestedAmount: 350000,
        creditScore: 780,
        existingDebts: 12000,
        employerName: 'Tata Consultancy Services',
        designation: 'Tech Lead',
        dtiRatio: 10,
        result: EligibilityResult.ELIGIBLE,
        maxApprovedAmount: 600000,
      },
    });

    // Attach Loan Terms
    await prisma.loanTerms.create({
      data: {
        applicationId: customerAppId,
        amount: 350000,
        tenureMonths: 18,
        interestRate: 12.5,
        processingFee: 7000,
        gst: 1260,
        otherCharges: 500,
        emi: 21425.5,
        totalInterest: 35659,
        totalRepayment: 385659,
        totalCharges: 8760,
        netDisbursement: 341240,
        irr: 14.2,
      },
    });

    // Attach Bank Account
    await prisma.bankAccount.create({
      data: {
        applicationId: customerAppId,
        holderName: 'Vikramaditya Singhania',
        accountNumber: '987654321012',
        ifsc: 'HDFC0001234',
        bankName: 'HDFC Bank Ltd',
      },
    });

    // Attach Declaration
    await prisma.declaration.create({
      data: {
        applicationId: customerAppId,
        acceptedAt: new Date(),
        termsVersion: 'v1.0',
        ipAddress: '127.0.0.1',
      },
    });

    // Attach Selfie
    await prisma.selfie.create({
      data: {
        applicationId: customerAppId,
        photoUrl: '/uploads/selfies/sample_selfie.png',
        adminStatus: AdminReviewStatus.PENDING,
      },
    });

    expect(adminToken).toBeDefined();
    expect(customerToken).toBeDefined();
    expect(customerAppId).toBeDefined();
  });

  describe('RBAC & Security Guard Enforcement', () => {
    it('should reject unauthenticated request to /api/v1/admin/applications with 401 Unauthorized', async () => {
      const res = await request(app).get('/api/v1/admin/applications');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should reject CUSTOMER role accessing /api/v1/admin/applications with 403 Forbidden', async () => {
      const res = await request(app)
        .get('/api/v1/admin/applications')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Access forbidden');
    });

    it('should reject CUSTOMER role accessing /api/v1/admin/applications/:id with 403 Forbidden', async () => {
      const res = await request(app)
        .get(`/api/v1/admin/applications/${customerAppId}`)
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Access forbidden');
    });

    it('should reject CUSTOMER role accessing /api/v1/admin/stats with 403 Forbidden', async () => {
      const res = await request(app)
        .get('/api/v1/admin/stats')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Access forbidden');
    });
  });

  describe('Admin Application Listing on GET /api/v1/admin/applications', () => {
    it('should list loan applications with pagination metadata for authenticated admin', async () => {
      const res = await request(app)
        .get('/api/v1/admin/applications')
        .query({ page: 1, limit: 10 })
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.applications)).toBe(true);
      expect(res.body.data.applications.length).toBeGreaterThanOrEqual(1);

      const item = res.body.data.applications.find(
        (a: any) => a.id === customerAppId
      );
      expect(item).toBeDefined();
      expect(item.applicantName).toBe('Vikramaditya Singhania');
      expect(item.requestedAmount).toBe(350000);
      expect(item.tenureMonths).toBe(18);
      expect(item.stage).toBe(ApplicationStage.WAITING_ADMIN_REVIEW);
      expect(item.selfieStatus).toBe(AdminReviewStatus.PENDING);
      expect(item.submittedAt).toBeDefined();

      expect(res.body.data.pagination).toHaveProperty('total');
      expect(res.body.data.pagination.page).toBe(1);
      expect(res.body.data.pagination.limit).toBe(10);
      expect(res.body.data.pagination.totalPages).toBeGreaterThanOrEqual(1);
    });

    it('should filter applications by stage', async () => {
      const res = await request(app)
        .get('/api/v1/admin/applications')
        .query({ stage: ApplicationStage.WAITING_ADMIN_REVIEW })
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(
        res.body.data.applications.every(
          (item: any) => item.stage === ApplicationStage.WAITING_ADMIN_REVIEW
        )
      ).toBe(true);
    });

    it('should filter applications by search query (applicant name)', async () => {
      const res = await request(app)
        .get('/api/v1/admin/applications')
        .query({ search: 'Vikramaditya' })
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.applications.length).toBeGreaterThanOrEqual(1);
      expect(res.body.data.applications[0].applicantName).toContain('Vikramaditya');
    });
  });

  describe('Full Application Journey Detail on GET /api/v1/admin/applications/:id', () => {
    it('should return 404 Not Found for non-existent application ID', async () => {
      const res = await request(app)
        .get('/api/v1/admin/applications/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('should return comprehensive 7-module payload for the fully onboarded application', async () => {
      const res = await request(app)
        .get(`/api/v1/admin/applications/${customerAppId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const data = res.body.data;

      // 1. Application Root
      expect(data.application.id).toBe(customerAppId);
      expect(data.application.stage).toBe(ApplicationStage.WAITING_ADMIN_REVIEW);

      // 2. User & Verification Status
      expect(data.user.id).toBe(customerUserId);
      expect(data.user.emailVerified).toBe(true);
      expect(data.user.phoneVerified).toBe(true);

      // 3. KYC Details
      expect(data.kycDetails).toBeDefined();
      expect(data.kycDetails.fullName).toBe('Vikramaditya Singhania');
      expect(data.kycDetails.idType).toBe(IdType.PAN);
      expect(data.kycDetails.idNumber).toBe('ABCDE1234F');
      expect(data.kycDetails.idPhotoUrl).toBe('/uploads/kyc/pan_card.jpg');

      // 4. Eligibility Check
      expect(data.eligibilityCheck).toBeDefined();
      expect(data.eligibilityCheck.creditScore).toBe(780);
      expect(data.eligibilityCheck.employerName).toBe('Tata Consultancy Services');
      expect(data.eligibilityCheck.result).toBe(EligibilityResult.ELIGIBLE);
      expect(data.eligibilityCheck.income).toBe(120000);
      expect(data.eligibilityCheck.requestedAmount).toBe(350000);

      // 5. Loan Terms
      expect(data.loanTerms).toBeDefined();
      expect(data.loanTerms.amount).toBe(350000);
      expect(data.loanTerms.tenureMonths).toBe(18);
      expect(data.loanTerms.emi).toBe(21425.5);
      expect(data.loanTerms.irr).toBe(14.2);
      expect(data.loanTerms.netDisbursement).toBe(341240);

      // 6. Bank Account
      expect(data.bankAccount).toBeDefined();
      expect(data.bankAccount.holderName).toBe('Vikramaditya Singhania');
      expect(data.bankAccount.accountNumber).toBe('987654321012');
      expect(data.bankAccount.ifsc).toBe('HDFC0001234');
      expect(data.bankAccount.bankName).toBe('HDFC Bank Ltd');

      // 7. Declaration
      expect(data.declaration).toBeDefined();
      expect(data.declaration.accepted).toBe(true);
      expect(data.declaration.termsVersion).toBe('v1.0');
      expect(data.declaration.ipAddress).toBe('127.0.0.1');

      // 8. Selfie Verification
      expect(data.selfie).toBeDefined();
      expect(data.selfie.adminStatus).toBe(AdminReviewStatus.PENDING);
      expect(data.selfie.photoUrl).toBe('/uploads/selfies/sample_selfie.png');
    });
  });

  describe('Dashboard Aggregate Statistics on GET /api/v1/admin/stats', () => {
    it('should return aggregate counts and stage breakdown for admin dashboard', async () => {
      const res = await request(app)
        .get('/api/v1/admin/stats')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.totalApplications).toBeGreaterThanOrEqual(1);
      expect(res.body.data.pendingReviewCount).toBeGreaterThanOrEqual(1);
      expect(typeof res.body.data.stageBreakdown).toBe('object');
    });
  });
});
