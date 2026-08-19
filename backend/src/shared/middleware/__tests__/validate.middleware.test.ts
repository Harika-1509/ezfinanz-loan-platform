import { describe, it, expect, vi } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { validate } from '../validate.middleware';
import { ValidationError } from '../../utils/app-error';

describe('validate Middleware', () => {
  const schema = {
    body: z.object({
      email: z.string().email('Invalid email address format'),
      amount: z.number().min(1000, 'Minimum amount is 1000'),
    }),
  };

  it('should pass validation when request body satisfies schema', async () => {
    const req = {
      body: {
        email: 'user@example.com',
        amount: 50000,
      },
    } as Request;

    const res = {} as Response;
    const next = vi.fn() as unknown as NextFunction;

    const validator = validate(schema);
    await validator(req, res, next);

    expect(next).toHaveBeenCalledWith();
  });

  it('should call next with ValidationError when request body violates schema', async () => {
    const req = {
      body: {
        email: 'not-an-email',
        amount: 50,
      },
    } as Request;

    const res = {} as Response;
    const next = vi.fn() as unknown as NextFunction;

    const validator = validate(schema);
    await validator(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(ValidationError));
    const error = vi.mocked(next).mock.calls[0][0] as unknown as ValidationError;
    expect(error.statusCode).toBe(422);
    expect(error.details).toBeDefined();
    expect(error.details?.length).toBe(2);
  });
});
