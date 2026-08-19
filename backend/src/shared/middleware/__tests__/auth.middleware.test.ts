import { describe, it, expect, vi } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { Role } from '@prisma/client';
import { authGuard } from '../auth.middleware';
import { generateAccessToken } from '../../utils/jwt';
import { AppError } from '../../utils/app-error';

describe('authGuard Middleware', () => {
  it('should attach user payload to request when valid Bearer token is provided', () => {
    const payload = {
      userId: 'usr_12345',
      email: 'customer@ezfinanz.com',
      role: Role.CUSTOMER,
    };
    const token = generateAccessToken(payload);

    const req = {
      headers: {
        authorization: `Bearer ${token}`,
      },
    } as unknown as Request;

    const res = {} as Response;
    const next = vi.fn() as unknown as NextFunction;

    authGuard(req, res, next);

    expect(next).toHaveBeenCalledWith();
    expect(req.user).toBeDefined();
    expect(req.user?.userId).toBe(payload.userId);
    expect(req.user?.email).toBe(payload.email);
    expect(req.user?.role).toBe(Role.CUSTOMER);
  });

  it('should throw unauthorized error when authorization header is missing', () => {
    const req = { headers: {} } as Request;
    const res = {} as Response;
    const next = vi.fn() as unknown as NextFunction;

    authGuard(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(AppError));
    const error = vi.mocked(next).mock.calls[0][0] as unknown as AppError;
    expect(error.statusCode).toBe(401);
  });

  it('should throw unauthorized error when token is malformed or invalid', () => {
    const req = {
      headers: {
        authorization: 'Bearer invalid.jwt.token',
      },
    } as Request;
    const res = {} as Response;
    const next = vi.fn() as unknown as NextFunction;

    authGuard(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(AppError));
    const error = vi.mocked(next).mock.calls[0][0] as unknown as AppError;
    expect(error.statusCode).toBe(401);
  });
});
