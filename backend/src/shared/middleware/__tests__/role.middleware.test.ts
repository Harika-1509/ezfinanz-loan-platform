import { describe, it, expect, vi } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { Role } from '@prisma/client';
import { roleGuard } from '../role.middleware';
import { AppError } from '../../utils/app-error';

describe('roleGuard Middleware', () => {
  it('should allow access if user has one of the allowed roles', () => {
    const req = {
      user: {
        userId: 'usr_admin',
        role: Role.ADMIN,
      },
    } as Request;
    const res = {} as Response;
    const next = vi.fn() as unknown as NextFunction;

    const guard = roleGuard(Role.ADMIN);
    guard(req, res, next);

    expect(next).toHaveBeenCalledWith();
  });

  it('should reject access with 403 Forbidden if user lacks the required role', () => {
    const req = {
      user: {
        userId: 'usr_customer',
        role: Role.CUSTOMER,
      },
    } as Request;
    const res = {} as Response;
    const next = vi.fn() as unknown as NextFunction;

    const guard = roleGuard(Role.ADMIN);
    guard(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(AppError));
    const error = vi.mocked(next).mock.calls[0][0] as unknown as AppError;
    expect(error.statusCode).toBe(403);
    expect(error.message).toContain('Access forbidden');
  });

  it('should reject access with 401 Unauthorized if user is not attached to request', () => {
    const req = {} as Request;
    const res = {} as Response;
    const next = vi.fn() as unknown as NextFunction;

    const guard = roleGuard(Role.CUSTOMER);
    guard(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(AppError));
    const error = vi.mocked(next).mock.calls[0][0] as unknown as AppError;
    expect(error.statusCode).toBe(401);
  });
});
