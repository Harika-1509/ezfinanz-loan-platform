import { Request, Response, NextFunction } from 'express';
import { healthService } from './health.service';
import { sendSuccess } from '../../shared/utils/api-response';

export class HealthController {
  public checkHealth = (_req: Request, res: Response, next: NextFunction) => {
    try {
      const status = healthService.getHealthStatus();
      return sendSuccess(res, status, 'EZFinanz Backend Service is operational', 200);
    } catch (error) {
      next(error);
    }
  };
}

export const healthController = new HealthController();
