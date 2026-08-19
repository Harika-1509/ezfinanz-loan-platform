import { Request, Response, NextFunction } from 'express';
import { eligibilityService } from './eligibility.service';
import { sendSuccess } from '../../shared/utils/api-response';
import { AppError } from '../../shared/utils/app-error';

export class EligibilityController {
  public async checkEligibility(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user) {
        throw AppError.unauthorized('Authentication required.');
      }

      const result = await eligibilityService.evaluateEligibility(
        req.user.userId,
        req.body
      );
      sendSuccess(res, result, result.message, 200);
    } catch (error) {
      next(error);
    }
  }

  public async getEligibilityStatus(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user) {
        throw AppError.unauthorized('Authentication required.');
      }

      const result = await eligibilityService.getEligibilityStatus(
        req.user.userId
      );
      sendSuccess(res, result, 'Eligibility status retrieved successfully.', 200);
    } catch (error) {
      next(error);
    }
  }
}

export const eligibilityController = new EligibilityController();
