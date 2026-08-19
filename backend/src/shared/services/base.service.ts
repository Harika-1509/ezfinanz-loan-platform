/**
 * Base service abstract class for shared module services
 */
export abstract class BaseService {
  protected log(message: string, context?: Record<string, any>) {
    console.log(`[${this.constructor.name}] ${message}`, context ? JSON.stringify(context) : '');
  }

  protected logError(message: string, error?: any) {
    console.error(`[${this.constructor.name} ERROR] ${message}`, error);
  }
}
