import { Request, Response, NextFunction } from 'express';
import { bankAccountService } from './bank-account.service';
import { sendSuccess } from '../../shared/utils/api-response';
import { AppError } from '../../shared/utils/app-error';

export class BankAccountController {
  public async submitBankAccount(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user) {
        throw AppError.unauthorized('Authentication required.');
      }

      const result = await bankAccountService.addBankAccount(
        req.user.userId,
        req.body
      );
      sendSuccess(res, result, result.message, 201);
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

      const result = await bankAccountService.getBankAccount(req.user.userId);
      sendSuccess(res, result, 'Bank account details retrieved successfully.', 200);
    } catch (error) {
      next(error);
    }
  }
}

export const bankAccountController = new BankAccountController();
