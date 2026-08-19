import { z } from 'zod';

export const sendEmailOtpSchema = {
  body: z.object({
    email: z.string().trim().toLowerCase().email('Please provide a valid email address').optional(),
  }),
};

export type SendEmailOtpInput = z.infer<typeof sendEmailOtpSchema.body>;

export const verifyEmailOtpSchema = {
  body: z.object({
    otp: z
      .string({ required_error: 'Verification OTP is required' })
      .trim()
      .length(6, 'OTP must be exactly 6 digits')
      .regex(/^\d{6}$/, 'OTP must contain numeric digits only'),
    email: z.string().trim().toLowerCase().email('Please provide a valid email address').optional(),
  }),
};

export type VerifyEmailOtpInput = z.infer<typeof verifyEmailOtpSchema.body>;

export const sendPhoneOtpSchema = {
  body: z.object({
    phone: z
      .string()
      .trim()
      .regex(
        /^[6-9]\d{9}$/,
        'Please provide a valid 10-digit Indian mobile number (e.g. 9876543210)'
      )
      .optional(),
  }),
};

export type SendPhoneOtpInput = z.infer<typeof sendPhoneOtpSchema.body>;

export const verifyPhoneOtpSchema = {
  body: z.object({
    otp: z
      .string({ required_error: 'Verification OTP is required' })
      .trim()
      .length(6, 'OTP must be exactly 6 digits')
      .regex(/^\d{6}$/, 'OTP must contain numeric digits only'),
    phone: z
      .string()
      .trim()
      .regex(
        /^[6-9]\d{9}$/,
        'Please provide a valid 10-digit Indian mobile number (e.g. 9876543210)'
      )
      .optional(),
  }),
};

export type VerifyPhoneOtpInput = z.infer<typeof verifyPhoneOtpSchema.body>;
