import { BaseService } from '../../shared/services/base.service';
import { config } from '../../config';

export interface HealthStatus {
  status: 'ok' | 'degraded' | 'error';
  service: string;
  uptime: number;
  timestamp: string;
  environment: string;
  version: string;
  memory: {
    rssMb: number;
    heapUsedMb: number;
    heapTotalMb: number;
  };
}

export class HealthService extends BaseService {
  public getHealthStatus(): HealthStatus {
    const memoryUsage = process.memoryUsage();

    return {
      status: 'ok',
      service: 'ezfinanz-backend-api',
      uptime: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
      environment: config.NODE_ENV,
      version: '1.0.0',
      memory: {
        rssMb: Math.round((memoryUsage.rss / 1024 / 1024) * 100) / 100,
        heapUsedMb: Math.round((memoryUsage.heapUsed / 1024 / 1024) * 100) / 100,
        heapTotalMb: Math.round((memoryUsage.heapTotal / 1024 / 1024) * 100) / 100,
      },
    };
  }
}

export const healthService = new HealthService();
