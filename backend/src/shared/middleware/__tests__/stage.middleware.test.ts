import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { ApplicationStage, Role } from '@prisma/client';
import { stageGuard, canTransitionStage } from '../stage.middleware';
import { prisma } from '../../../prisma/client';
import { AppError } from '../../utils/app-error';

// Mock prisma client
vi.mock('../../../prisma/client', () => ({
  prisma: {
    application: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
  },
}));

describe('stageGuard Middleware & Progression Helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('canTransitionStage Helper', () => {
    it('should permit sequential step progression', () => {
      expect(canTransitionStage(ApplicationStage.KYC_PENDING, ApplicationStage.KYC_SUBMITTED)).toBe(
        true
      );
      expect(
        canTransitionStage(ApplicationStage.KYC_SUBMITTED, ApplicationStage.ELIGIBILITY_CHECKED)
      ).toBe(true);
      expect(
        canTransitionStage(ApplicationStage.ELIGIBILITY_CHECKED, ApplicationStage.EMI_SELECTED)
      ).toBe(true);
    });

    it('should permit transition to REJECTED from active application stages', () => {
      expect(canTransitionStage(ApplicationStage.KYC_SUBMITTED, ApplicationStage.REJECTED)).toBe(
        true
      );
      expect(
        canTransitionStage(ApplicationStage.WAITING_ADMIN_REVIEW, ApplicationStage.REJECTED)
      ).toBe(true);
    });

    it('should disallow skipping steps out-of-order', () => {
      expect(
        canTransitionStage(ApplicationStage.SIGNUP_COMPLETED, ApplicationStage.DISBURSED)
      ).toBe(false);
      expect(canTransitionStage(ApplicationStage.KYC_PENDING, ApplicationStage.BANK_ADDED)).toBe(
        false
      );
    });
  });

  describe('stageGuard Middleware', () => {
    it('should allow request when application stage matches allowed stages and customer is verified', async () => {
      const mockApp = {
        id: 'app_123',
        userId: 'usr_cust_1',
        stage: ApplicationStage.KYC_PENDING,
      };

      vi.mocked(prisma.application.findUnique).mockResolvedValue(mockApp as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        emailVerified: true,
        phoneVerified: true,
      } as any);

      const req = {
        user: { userId: 'usr_cust_1', role: Role.CUSTOMER },
        params: { applicationId: 'app_123' },
      } as unknown as Request;

      const res = {} as Response;
      const next = vi.fn() as unknown as NextFunction;

      const guard = stageGuard(ApplicationStage.KYC_PENDING);
      await guard(req, res, next);

      expect(next).toHaveBeenCalledWith();
      expect(req.application).toEqual(mockApp);
    });

    it('should reject with 403 Forbidden when customer is not dual verified for KYC stages', async () => {
      const mockApp = {
        id: 'app_123',
        userId: 'usr_cust_1',
        stage: ApplicationStage.KYC_PENDING,
      };

      vi.mocked(prisma.application.findUnique).mockResolvedValue(mockApp as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        emailVerified: true,
        phoneVerified: false,
      } as any);

      const req = {
        user: { userId: 'usr_cust_1', role: Role.CUSTOMER },
        params: { applicationId: 'app_123' },
      } as unknown as Request;

      const res = {} as Response;
      const next = vi.fn() as unknown as NextFunction;

      const guard = stageGuard(ApplicationStage.KYC_PENDING);
      await guard(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      const error = vi.mocked(next).mock.calls[0][0] as unknown as AppError;
      expect(error.statusCode).toBe(403);
      expect(error.message).toContain('Account verification required');
    });

    it('should reject with 400 Bad Request when application is at the wrong stage', async () => {
      const mockApp = {
        id: 'app_123',
        userId: 'usr_cust_1',
        stage: ApplicationStage.SIGNUP_COMPLETED,
      };

      vi.mocked(prisma.application.findUnique).mockResolvedValue(mockApp as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        emailVerified: true,
        phoneVerified: true,
      } as any);

      const req = {
        user: { userId: 'usr_cust_1', role: Role.CUSTOMER },
        params: { applicationId: 'app_123' },
      } as unknown as Request;

      const res = {} as Response;
      const next = vi.fn() as unknown as NextFunction;

      const guard = stageGuard(ApplicationStage.BANK_ADDED);
      await guard(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      const error = vi.mocked(next).mock.calls[0][0] as unknown as AppError;
      expect(error.statusCode).toBe(400);
      expect(error.message).toContain('Invalid application state');
    });

    it('should reject with 403 Forbidden when customer accesses another user application', async () => {
      const mockApp = {
        id: 'app_123',
        userId: 'another_user_456',
        stage: ApplicationStage.KYC_PENDING,
      };

      vi.mocked(prisma.application.findUnique).mockResolvedValue(mockApp as any);

      const req = {
        user: { userId: 'intruder_user_789', role: Role.CUSTOMER },
        params: { applicationId: 'app_123' },
      } as unknown as Request;

      const res = {} as Response;
      const next = vi.fn() as unknown as NextFunction;

      const guard = stageGuard(ApplicationStage.KYC_PENDING);
      await guard(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      const error = vi.mocked(next).mock.calls[0][0] as unknown as AppError;
      expect(error.statusCode).toBe(403);
    });
  });
});
