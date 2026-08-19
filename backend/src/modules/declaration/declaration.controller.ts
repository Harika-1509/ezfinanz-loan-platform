import { Request, Response, NextFunction } from 'express';
import { declarationService } from './declaration.service';
import { sendSuccess } from '../../shared/utils/api-response';
import { AppError } from '../../shared/utils/app-error';

export class DeclarationController {
  public async getDeclarationText(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user) {
        throw AppError.unauthorized('Authentication required.');
      }

      const result = await declarationService.getDeclarationText(
        req.user.userId
      );
      sendSuccess(res, result, 'Declaration text retrieved successfully.', 200);
    } catch (error) {
      next(error);
    }
  }

  public async acceptDeclaration(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user) {
        throw AppError.unauthorized('Authentication required.');
      }

      const ipAddress =
        (req.headers['x-forwarded-for'] as string) ||
        req.socket.remoteAddress ||
        '127.0.0.1';

      const result = await declarationService.acceptDeclaration(
        req.user.userId,
        req.body,
        ipAddress
      );
      sendSuccess(res, result, result.message, 200);
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

      const result = await declarationService.getDeclarationStatus(
        req.user.userId
      );
      sendSuccess(res, result, 'Declaration status retrieved successfully.', 200);
    } catch (error) {
      next(error);
    }
  }
}

export const declarationController = new DeclarationController();
