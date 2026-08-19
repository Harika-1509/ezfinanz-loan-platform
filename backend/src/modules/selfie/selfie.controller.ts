import { Request, Response, NextFunction } from 'express';
import { selfieService } from './selfie.service';
import { sendSuccess } from '../../shared/utils/api-response';
import { AppError } from '../../shared/utils/app-error';

export class SelfieController {
  public async submitSelfie(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user) {
        throw AppError.unauthorized('Authentication required.');
      }

      const base64Data =
        req.body?.base64Data ||
        req.body?.base64Image ||
        req.body?.imageBase64 ||
        req.body?.selfieBase64 ||
        req.body?.selfie ||
        req.body?.photo ||
        req.body?.image;

      const result = await selfieService.submitSelfie(req.user.userId, {
        file: req.file,
        base64Data,
      });

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

      const result = await selfieService.getSelfieStatus(req.user.userId);
      sendSuccess(res, result, 'Selfie details retrieved successfully.', 200);
    } catch (error) {
      next(error);
    }
  }
}

export const selfieController = new SelfieController();
