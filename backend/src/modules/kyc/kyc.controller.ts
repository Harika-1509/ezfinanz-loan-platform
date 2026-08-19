import { Request, Response, NextFunction } from 'express';
import { kycService } from './kyc.service';
import { sendSuccess } from '../../shared/utils/api-response';
import { AppError } from '../../shared/utils/app-error';

export class KycController {
  public async submitKyc(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw AppError.unauthorized('Authentication required.');
      }

      const result = await kycService.submitKyc(req.user.userId, req.body, req.file);
      sendSuccess(res, result, result.message, 201);
    } catch (error) {
      next(error);
    }
  }

  public async getKycStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw AppError.unauthorized('Authentication required.');
      }

      const result = await kycService.getKycStatus(req.user.userId);
      sendSuccess(res, result, 'KYC status retrieved successfully.', 200);
    } catch (error) {
      next(error);
    }
  }
}

export const kycController = new KycController();
