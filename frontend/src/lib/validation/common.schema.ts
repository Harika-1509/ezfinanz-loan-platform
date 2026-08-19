import { z } from 'zod';

/**
 * Common validation schemas for loan application workflows
 */
export const emailSchema = z
  .string()
  .min(1, 'Email is required')
  .email('Please enter a valid email address');

export const phoneSchema = z
  .string()
  .min(1, 'Phone number is required')
  .regex(/^[6-9]\d{9}$/, 'Please enter a valid 10-digit Indian mobile number');

export const otpSchema = z
  .string()
  .length(6, 'OTP must be exactly 6 digits')
  .regex(/^\d{6}$/, 'OTP must contain only numbers');

export const panSchema = z
  .string()
  .min(1, 'PAN is required')
  .regex(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, 'Please enter a valid 10-character PAN (e.g. ABCDE1234F)')
  .transform((val) => val.toUpperCase());

export const aadhaarSchema = z
  .string()
  .min(1, 'Aadhaar is required')
  .regex(/^\d{12}$/, 'Please enter a valid 12-digit Aadhaar number');

export const loanAmountSchema = z
  .number()
  .min(10000, 'Minimum loan amount is ₹10,000')
  .max(10000000, 'Maximum loan amount is ₹1,00,00,000');

export const tenureMonthsSchema = z
  .number()
  .int('Tenure must be an integer')
  .min(6, 'Minimum tenure is 6 months')
  .max(60, 'Maximum tenure is 60 months');

export const ifscSchema = z
  .string()
  .min(1, 'IFSC Code is required')
  .regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, 'Please enter a valid 11-character IFSC code (e.g. HDFC0001234)')
  .transform((val) => val.toUpperCase());

export const accountNumberSchema = z
  .string()
  .min(8, 'Account number must be at least 8 digits')
  .max(20, 'Account number cannot exceed 20 digits')
  .regex(/^\d+$/, 'Account number must contain only numbers');
