import { Request, Response, NextFunction } from 'express';
import { verificationService } from './verification.service';
import { sendSuccess } from '../../shared/utils/api-response';
import { AppError } from '../../shared/utils/app-error';

export class VerificationController {
  public async sendEmailOtp(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw AppError.unauthorized('Authentication required.');
      }
      const result = await verificationService.sendEmailOtp(req.user.userId, req.body?.email, req.ip);
      sendSuccess(res, result, result.message, 200);
    } catch (error) {
      next(error);
    }
  }

  public async verifyEmailOtp(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw AppError.unauthorized('Authentication required.');
      }
      const { otp, email } = req.body;
      const result = await verificationService.verifyEmailOtp(req.user.userId, otp, email);
      sendSuccess(res, result, result.message, 200);
    } catch (error) {
      next(error);
    }
  }

  public async sendPhoneOtp(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw AppError.unauthorized('Authentication required.');
      }
      const result = await verificationService.sendPhoneOtp(req.user.userId, req.body?.phone, req.ip);
      sendSuccess(res, result, result.message, 200);
    } catch (error) {
      next(error);
    }
  }

  public async verifyPhoneOtp(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw AppError.unauthorized('Authentication required.');
      }
      const { otp, phone } = req.body;
      const result = await verificationService.verifyPhoneOtp(req.user.userId, otp, phone);
      sendSuccess(res, result, result.message, 200);
    } catch (error) {
      next(error);
    }
  }

  public async getStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw AppError.unauthorized('Authentication required.');
      }
      const status = await verificationService.getVerificationStatus(req.user.userId);
      sendSuccess(res, status, 'Verification status retrieved successfully.', 200);
    } catch (error) {
      next(error);
    }
  }
}

export const verificationController = new VerificationController();
