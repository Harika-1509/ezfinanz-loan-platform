import { z } from 'zod';

/**
 * Password validation regex rules:
 * - Minimum 8 characters
 * - At least 1 uppercase letter
 * - At least 1 lowercase letter
 * - At least 1 number
 * - At least 1 special character
 */
const passwordRegex =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?~`]).{8,}$/;

export const signupSchema = {
  body: z.object({
    email: z
      .string({ required_error: 'Email address is required' })
      .trim()
      .toLowerCase()
      .email('Please provide a valid email address'),
    password: z
      .string({ required_error: 'Password is required' })
      .min(8, 'Password must be at least 8 characters long')
      .regex(
        passwordRegex,
        'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
      ),
    phone: z
      .string()
      .trim()
      .regex(/^[6-9]\d{9}$/, 'Please provide a valid 10-digit Indian mobile number')
      .optional(),
  }),
};

export type SignupInput = z.infer<typeof signupSchema.body>;

export const loginSchema = {
  body: z.object({
    email: z
      .string({ required_error: 'Email address is required' })
      .trim()
      .toLowerCase()
      .email('Please provide a valid email address'),
    password: z
      .string({ required_error: 'Password is required' })
      .min(1, 'Password cannot be empty'),
  }),
};

export type LoginInput = z.infer<typeof loginSchema.body>;

export const refreshTokenSchema = {
  body: z.object({
    refreshToken: z.string().optional(),
  }),
};

export const mockOAuthSchema = {
  body: z.object({
    googleId: z.string({ required_error: 'Google ID is required' }).min(1),
    email: z
      .string({ required_error: 'Email is required' })
      .trim()
      .toLowerCase()
      .email('Please provide a valid email address'),
    name: z.string().optional(),
  }),
};

export type MockOAuthInput = z.infer<typeof mockOAuthSchema.body>;
