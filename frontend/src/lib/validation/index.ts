import { z } from 'zod';
import { ApiError } from '../api-client';

// ==========================================
// REGEX PATTERNS & CONSTANTS
// ==========================================
export const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
export const AADHAAR_REGEX = /^[2-9]{1}[0-9]{11}$/;
export const IFSC_REGEX = /^[A-Z]{4}0[A-Z0-9]{6}$/;
export const ACCOUNT_REGEX = /^\d{9,18}$/;
export const PHONE_REGEX = /^[6-9]\d{9}$/;
export const OTP_REGEX = /^\d{6}$/;
export const PASSWORD_REGEX =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?~`]).{8,}$/;
export const ALLOWED_TENURES = [6, 12, 18, 24, 36] as const;

/**
 * Calculates accurate age from a birth date string
 */
export function calculateAge(dobString: string): number {
  const birthDate = new Date(dobString);
  if (isNaN(birthDate.getTime())) return -1;
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

// ==========================================
// ZOD VALIDATION SCHEMAS
// ==========================================

// 1. Authentication Schemas
export const signupSchema = z
  .object({
    email: z
      .string({ required_error: 'Email address is required' })
      .trim()
      .toLowerCase()
      .min(1, 'Email address is required')
      .email('Please enter a valid email address'),
    phone: z
      .string()
      .trim()
      .regex(PHONE_REGEX, 'Please enter a valid 10-digit Indian mobile number (starts with 6-9)')
      .optional()
      .or(z.literal('')),
    password: z
      .string({ required_error: 'Password is required' })
      .min(8, 'Password must be at least 8 characters long')
      .regex(PASSWORD_REGEX, 'Password must contain uppercase, lowercase, number, and special symbol'),
    confirmPassword: z.string({ required_error: 'Please confirm your password' }).min(1, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export const loginSchema = z.object({
  email: z
    .string({ required_error: 'Email address is required' })
    .trim()
    .toLowerCase()
    .min(1, 'Email address is required')
    .email('Please enter a valid email address'),
  password: z.string({ required_error: 'Password is required' }).min(1, 'Password cannot be empty'),
});

export const phoneOtpLoginSchema = z.object({
  phone: z
    .string({ required_error: 'Phone number is required' })
    .trim()
    .regex(PHONE_REGEX, 'Please enter a valid 10-digit Indian mobile number'),
});

export const verifyOtpSchema = z.object({
  otp: z
    .string({ required_error: 'OTP is required' })
    .trim()
    .length(6, 'OTP must be exactly 6 digits')
    .regex(OTP_REGEX, 'OTP must contain numeric digits only'),
});

// 2. KYC Schema
export const kycSchema = z
  .object({
    fullName: z
      .string({ required_error: 'Full name is required' })
      .trim()
      .min(2, 'Full name must be at least 2 characters')
      .max(100, 'Full name cannot exceed 100 characters'),
    dob: z
      .string({ required_error: 'Date of birth is required' })
      .min(1, 'Date of birth is required')
      .refine((val) => !isNaN(Date.parse(val)), {
        message: 'Please enter a valid date of birth (YYYY-MM-DD)',
      })
      .refine((val) => calculateAge(val) >= 18, {
        message: 'Applicant must be at least 18 years old per RBI regulations',
      }),
    gender: z.enum(['MALE', 'FEMALE', 'OTHER'], {
      required_error: 'Gender is required (MALE, FEMALE, or OTHER)',
    }),
    address: z
      .string({ required_error: 'Residential address is required' })
      .trim()
      .min(5, 'Address must be at least 5 characters')
      .max(300, 'Address cannot exceed 300 characters'),
    idType: z.enum(['PAN', 'AADHAAR'], {
      required_error: 'ID type is required (PAN or AADHAAR)',
    }),
    idNumber: z
      .string({ required_error: 'ID number is required' })
      .trim()
      .toUpperCase(),
  })
  .superRefine((data, ctx) => {
    if (data.idType === 'PAN') {
      if (!PAN_REGEX.test(data.idNumber)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['idNumber'],
          message: 'Invalid PAN card format. Expected 5 letters, 4 digits, 1 letter (e.g. ABCDE1234F)',
        });
      }
    } else if (data.idType === 'AADHAAR') {
      const cleanedAadhaar = data.idNumber.replace(/[\s-]/g, '');
      if (!AADHAAR_REGEX.test(cleanedAadhaar)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['idNumber'],
          message: 'Invalid Aadhaar format. Must be a 12-digit number starting with 2-9',
        });
      }
    }
  });

// 3. Eligibility Schema
export const eligibilitySchema = z.object({
  income: z
    .number({ invalid_type_error: 'Monthly income is required and must be a number' })
    .min(1000, 'Monthly income must be at least ₹1,000')
    .max(10000000, 'Monthly income cannot exceed ₹1,00,00,000'),
  requestedAmount: z
    .number({ invalid_type_error: 'Requested loan amount is required and must be a number' })
    .min(10000, 'Minimum loan amount is ₹10,000')
    .max(500000, 'Maximum loan amount is ₹5,00,000 (₹5 Lakhs)'),
  existingDebts: z
    .number({ invalid_type_error: 'Existing monthly debts must be a number' })
    .min(0, 'Existing debts cannot be negative')
    .max(10000000, 'Existing debts cannot exceed ₹1,00,00,000'),
  employerName: z
    .string({ required_error: 'Employer or business name is required' })
    .trim()
    .min(2, 'Employer name must be at least 2 characters')
    .max(100, 'Employer name cannot exceed 100 characters'),
  designation: z
    .string({ required_error: 'Designation or profession is required' })
    .trim()
    .min(2, 'Designation must be at least 2 characters')
    .max(100, 'Designation cannot exceed 100 characters'),
});

// 4. Loan Terms Schema
export const loanTermsSchema = z.object({
  amount: z
    .number({ required_error: 'Loan amount is required' })
    .min(10000, 'Minimum loan amount is ₹10,000')
    .max(500000, 'Maximum loan amount is ₹5,00,000 (₹5 Lakhs)'),
  tenureMonths: z
    .number({ required_error: 'Tenure in months is required' })
    .refine(
      (val) => ALLOWED_TENURES.includes(val as any),
      'Supported tenure options are 6, 12, 18, 24, or 36 months'
    ),
});

// 5. Bank Account Schema
export const bankAccountSchema = z.object({
  holderName: z
    .string({ required_error: 'Account holder name is required' })
    .trim()
    .min(2, 'Account holder name must be at least 2 characters')
    .max(100, 'Account holder name cannot exceed 100 characters'),
  accountNumber: z
    .string({ required_error: 'Bank account number is required' })
    .trim()
    .regex(ACCOUNT_REGEX, 'Bank account number must be between 9 and 18 digits'),
  confirmAccountNumber: z
    .string({ required_error: 'Please re-enter account number for verification' })
    .trim(),
  ifsc: z
    .string({ required_error: 'Bank IFSC code is required' })
    .trim()
    .toUpperCase()
    .refine(
      (val) => IFSC_REGEX.test(val),
      'Invalid IFSC code format. Expected 11 characters (e.g. HDFC0001234, SBIN0004567)'
    ),
  bankName: z
    .string({ required_error: 'Bank name is required' })
    .trim()
    .min(2, 'Bank name must be at least 2 characters')
    .max(100, 'Bank name cannot exceed 100 characters'),
}).refine((data) => data.accountNumber === data.confirmAccountNumber, {
  message: 'Account numbers do not match',
  path: ['confirmAccountNumber'],
});

// 6. Declaration Schema
export const declarationSchema = z.object({
  accepted: z.literal(true, {
    errorMap: () => ({
      message: 'You must explicitly accept the loan terms declaration to proceed',
    }),
  }),
  termsVersion: z.string().trim().min(1).default('v1.0'),
});

// 7. Admin Review Schemas
export const adminRejectSelfieSchema = z.object({
  reason: z
    .string({ required_error: 'Rejection reason is required' })
    .trim()
    .min(3, 'Rejection reason must be at least 3 characters long')
    .max(500, 'Rejection reason cannot exceed 500 characters'),
});

export const adminDisburseSchema = z.object({
  referenceId: z.string().trim().optional(),
  notes: z.string().trim().max(500).optional(),
});

// ==========================================
// ERROR EXTRACTION UTILITY
// ==========================================

export interface ExtractedErrors {
  fieldErrors: Record<string, string>;
  generalMessage: string;
}

/**
 * Unified Helper to Extract Field-Level and General Errors from Backend API / Network errors
 */
export function extractFieldErrors(
  err: unknown,
  fallbackMessage: string = 'An unexpected error occurred. Please check your information and try again.'
): ExtractedErrors {
  const fieldErrors: Record<string, string> = {};
  let generalMessage = fallbackMessage;

  if (err instanceof ApiError) {
    generalMessage = err.message || fallbackMessage;

    if (Array.isArray(err.details)) {
      err.details.forEach((item: any) => {
        if (item && item.path && item.message) {
          fieldErrors[item.path] = item.message;
        }
      });
    } else if (err.details && typeof err.details === 'object') {
      Object.entries(err.details).forEach(([key, val]) => {
        if (typeof val === 'string') {
          fieldErrors[key] = val;
        } else if (Array.isArray(val) && val[0]) {
          fieldErrors[key] = String(val[0]);
        }
      });
    }
  } else if (err instanceof Error) {
    generalMessage = err.message;
  }

  return { fieldErrors, generalMessage };
}
