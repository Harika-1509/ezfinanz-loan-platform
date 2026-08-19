import { Request, Response, NextFunction } from 'express';
import { Role } from '@prisma/client';
import { AppError } from '../utils/app-error';

/**
 * Role-Based Access Control (RBAC) Guard Middleware
 * Restricts route access to users possessing one of the specified roles.
 */
export const roleGuard = (...allowedRoles: Role[]) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      if (!req.user) {
        throw AppError.unauthorized('Authentication required before checking role permissions.');
      }

      if (!allowedRoles.includes(req.user.role)) {
        throw AppError.forbidden(
          `Access forbidden. This resource requires one of the following roles: [${allowedRoles.join(', ')}]. Your current role is: ${req.user.role}.`
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};
