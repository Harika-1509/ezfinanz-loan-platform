import { Request, Response, NextFunction } from 'express';
import { loanTermsService } from './loan-terms.service';
import { sendSuccess } from '../../shared/utils/api-response';
import { AppError } from '../../shared/utils/app-error';

export class LoanTermsController {
  public async calculateTerms(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user) {
        throw AppError.unauthorized('Authentication required.');
      }

      const result = await loanTermsService.calculateTerms(
        req.user.userId,
        req.body
      );
      sendSuccess(res, result, result.message, 200);
    } catch (error) {
      next(error);
    }
  }

  public async confirmTerms(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user) {
        throw AppError.unauthorized('Authentication required.');
      }

      const result = await loanTermsService.confirmTerms(
        req.user.userId,
        req.body
      );
      sendSuccess(res, result, result.message, 200);
    } catch (error) {
      next(error);
    }
  }

  public async getOptions(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user) {
        throw AppError.unauthorized('Authentication required.');
      }

      const result = await loanTermsService.getAvailableOptions(
        req.user.userId
      );
      sendSuccess(res, result, 'Loan options retrieved successfully.', 200);
    } catch (error) {
      next(error);
    }
  }

  public async getStatus(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user) {
        throw AppError.unauthorized('Authentication required.');
      }

      const result = await loanTermsService.getTermsStatus(req.user.userId);
      sendSuccess(res, result, 'Loan terms retrieved successfully.', 200);
    } catch (error) {
      next(error);
    }
  }
}

export const loanTermsController = new LoanTermsController();
