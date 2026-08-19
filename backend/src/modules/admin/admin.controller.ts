import { Request, Response, NextFunction } from 'express';
import { adminService } from './admin.service';
import { sendSuccess } from '../../shared/utils/api-response';
import { AppError } from '../../shared/utils/app-error';

export class AdminController {
  public async listApplications(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const result = await adminService.listApplications(req.query as any);
      sendSuccess(
        res,
        result,
        'Loan applications retrieved successfully.',
        200
      );
    } catch (error) {
      next(error);
    }
  }

  public async getApplicationDetail(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;
      if (!id) {
        throw AppError.badRequest('Application ID is required.');
      }

      const result = await adminService.getApplicationDetail(id);
      sendSuccess(
        res,
        result,
        'Loan application details retrieved successfully.',
        200
      );
    } catch (error) {
      next(error);
    }
  }

  public async getDashboardStats(
    _req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const result = await adminService.getDashboardStats();
      sendSuccess(
        res,
        result,
        'Dashboard statistics retrieved successfully.',
        200
      );
    } catch (error) {
      next(error);
    }
  }
}

export const adminController = new AdminController();
